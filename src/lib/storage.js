import { supabase } from "./supabaseClient";

/**
 * Mimics the same get/set/delete API used inside Claude artifacts
 * (window.storage), but backed by real infrastructure:
 *  - shared = true  -> Supabase table `kv_store` (visible to the whole team)
 *  - shared = false -> browser localStorage (visible only on this device)
 *
 * This lets the rest of the CRM code stay almost identical to the
 * original artifact version.
 */
export const storage = {
  async get(key, shared = false) {
    if (!shared) {
      const value = localStorage.getItem(key);
      return value !== null ? { key, value, shared: false } : null;
    }
    const { data, error } = await supabase
      .from("kv_store")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error) throw error;
    return data ? { key, value: data.value, shared: true } : null;
  },

  async set(key, value, shared = false) {
    if (!shared) {
      localStorage.setItem(key, value);
      return { key, value, shared: false };
    }
    const { error } = await supabase
      .from("kv_store")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) throw error;
    return { key, value, shared: true };
  },

  async delete(key, shared = false) {
    if (!shared) {
      localStorage.removeItem(key);
      return { key, deleted: true, shared: false };
    }
    const { error } = await supabase.from("kv_store").delete().eq("key", key);
    if (error) throw error;
    return { key, deleted: true, shared: true };
  },

  async list(prefix = "", shared = false) {
    if (!shared) {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith(prefix));
      return { keys, prefix, shared: false };
    }
    const { data, error } = await supabase.from("kv_store").select("key").ilike("key", `${prefix}%`);
    if (error) throw error;
    return { keys: (data || []).map((r) => r.key), prefix, shared: true };
  },
};
