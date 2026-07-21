import { useState, useEffect, useMemo } from "react";
import {
  LayoutDashboard, ListChecks, FileText, BarChart3, Archive, Dumbbell,
  Phone, MessageCircle, Plus, X, Clock, AlertTriangle, RotateCcw,
  Trash2, Search, Save, ChevronLeft, ChevronRight, CheckCircle2,
  LogOut, Users, ShieldCheck, KeyRound
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell
} from "recharts";
import { storage } from "./lib/storage";

/* ---------------------------------------------------------------------- */
/* CONSTANTS                                                                */
/* ---------------------------------------------------------------------- */

const DAY = 24 * 60 * 60 * 1000;

const KANBAN_COLUMNS = [
  { key: "lead_frio", label: "Lead Frio", plates: 1 },
  { key: "negociacao", label: "Negociação", plates: 2 },
  { key: "fechamento", label: "Fechamento", plates: 3 },
];

const FOLLOW_LABELS = {
  segundo: "2º Contato",
  terceiro: "3º Contato",
  reaquecimento: "Reaquecimento",
  final: "Contato Final",
  concluido: "Finalizado",
};

const FOLLOW_SEQUENCE = { segundo: "terceiro", terceiro: "reaquecimento", reaquecimento: "final" };
const FOLLOW_DELAY = { segundo: 3, terceiro: 30, reaquecimento: 30 };

const DEFAULT_SCRIPTS = {
  inicial: "Olá {nome}! Tudo bem? Aqui é da ROCKFIT Equipamentos 💪 Vi seu interesse em equipar a academia/studio com máquinas robustas, compactas e com o melhor custo-benefício do mercado. Posso te mostrar algumas opções que encaixam no seu espaço e orçamento?",
  segundo: "Oi {nome}, tudo certo? Passando pra saber se você já viu as opções que te enviei. Temos equipamentos em pronta entrega e condições facilitadas de pagamento — fico à disposição pra tirar qualquer dúvida! 🏋️",
  terceiro: "Olá {nome}! Só reforçando: os equipamentos ROCKFIT têm 14 anos de mercado, são super robustos e ocupam menos espaço — ótimo pra otimizar o retorno por m² da sua academia. Quer que eu separe uma proposta personalizada?",
  reaquecimento: "Oi {nome}! Faz um tempo que conversamos por aqui. Temos novidades e condições especiais na ROCKFIT — vale a pena dar uma olhada de novo. Posso te enviar as novidades atualizadas?",
  final: "Olá {nome}, essa é só uma última mensagem pra saber se ainda faz sentido equipar ou renovar a academia com a ROCKFIT. Se não for o momento, sem problemas — fico à disposição quando precisar! 💪",
};

/* ---------------------------------------------------------------------- */
/* HELPERS                                                                  */
/* ---------------------------------------------------------------------- */

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function addDays(iso, n) { const d = new Date(iso); d.setDate(d.getDate() + n); return d.toISOString(); }
function daysUntil(iso) {
  if (!iso) return null;
  return Math.round((startOfDay(iso) - startOfDay(new Date())) / DAY);
}
function fmtDate(iso) { return iso ? new Date(iso).toLocaleDateString("pt-BR") : "—"; }
function fmtDateTime(iso) { return iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"; }
function firstName(name) { return (name || "").trim().split(" ")[0]; }
function uid(prefix) { return (prefix || "id") + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8); }

function buildWaLink(lead, template) {
  let phone = (lead.phone || "").replace(/\D/g, "");
  if (phone.length > 0 && phone.length <= 11) phone = "55" + phone;
  const text = (template || "").replace(/\{nome\}/g, firstName(lead.name));
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

function scriptKeyFor(lead) {
  if (lead.status === "ativo" && FOLLOW_LABELS[lead.followStage] && lead.followStage !== "concluido") {
    return lead.followStage;
  }
  return "inicial";
}

function alertLevel(lead) {
  if (lead.status !== "ativo" || !lead.nextActionAt) return "none";
  const d = daysUntil(lead.nextActionAt);
  if (d < 0) return "overdue";
  if (d === 0 || d === 1) return "soon";
  return "ok";
}

/* ---------------------------------------------------------------------- */
/* ROOT COMPONENT                                                           */
/* ---------------------------------------------------------------------- */

export default function CRMVendasRockfit() {
  const [leads, setLeads] = useState([]);
  const [scripts, setScripts] = useState(DEFAULT_SCRIPTS);
  const [collaborators, setCollaborators] = useState([]);
  const [session, setSession] = useState(null);
  const [bootLoading, setBootLoading] = useState(true);

  const [view, setView] = useState("dashboard");
  const [showNewLead, setShowNewLead] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("todos");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await storage.get("rockfit-crm-leads", true);
        setLeads(r ? JSON.parse(r.value) : []);
      } catch (e) { setLeads([]); }
      try {
        const r = await storage.get("rockfit-crm-scripts", true);
        setScripts(r ? JSON.parse(r.value) : DEFAULT_SCRIPTS);
      } catch (e) { setScripts(DEFAULT_SCRIPTS); }
      try {
        const r = await storage.get("rockfit-crm-collaborators", true);
        setCollaborators(r ? JSON.parse(r.value) : []);
      } catch (e) { setCollaborators([]); }
      try {
        const r = await storage.get("rockfit-crm-session", false);
        setSession(r ? JSON.parse(r.value) : null);
      } catch (e) { setSession(null); }
      setBootLoading(false);
    })();
  }, []);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2200); }

  async function persistLeads(updated) {
    setLeads(updated);
    try { await storage.set("rockfit-crm-leads", JSON.stringify(updated), true); }
    catch (e) { showToast("Erro ao salvar dados"); }
  }
  async function persistScripts(updated) {
    setScripts(updated);
    try { await storage.set("rockfit-crm-scripts", JSON.stringify(updated), true); }
    catch (e) { showToast("Erro ao salvar scripts"); }
  }
  async function persistCollaborators(updated) {
    setCollaborators(updated);
    try { await storage.set("rockfit-crm-collaborators", JSON.stringify(updated), true); }
    catch (e) { showToast("Erro ao salvar colaboradores"); }
  }
  async function persistSession(s) {
    setSession(s);
    try {
      if (s) await storage.set("rockfit-crm-session", JSON.stringify(s), false);
      else await storage.delete("rockfit-crm-session", false);
    } catch (e) {}
  }

  /* ---- auth actions ---- */
  function createFirstAdmin(name, username, pin) {
    const admin = { id: uid("collab"), name, username: username.toLowerCase(), pin, role: "admin", createdAt: new Date().toISOString() };
    persistCollaborators([admin]);
    persistSession({ collaboratorId: admin.id, name: admin.name, role: admin.role });
  }
  function handleLogin(collaboratorId, pin) {
    const c = collaborators.find((x) => x.id === collaboratorId);
    if (!c) return "Colaborador não encontrado.";
    if (c.pin !== pin) return "PIN incorreto.";
    persistSession({ collaboratorId: c.id, name: c.name, role: c.role });
    return null;
  }
  function handleLogout() { persistSession(null); }

  function addCollaborator(name, username, pin, role) {
    const c = { id: uid("collab"), name, username: username.toLowerCase(), pin, role, createdAt: new Date().toISOString() };
    persistCollaborators([...collaborators, c]);
    showToast("Colaborador cadastrado!");
  }
  function resetPin(id, newPin) {
    persistCollaborators(collaborators.map((c) => (c.id === id ? { ...c, pin: newPin } : c)));
    showToast("PIN redefinido");
  }
  function removeCollaborator(id) {
    const target = collaborators.find((c) => c.id === id);
    const admins = collaborators.filter((c) => c.role === "admin");
    if (target?.role === "admin" && admins.length <= 1) { showToast("É preciso manter ao menos 1 administrador"); return; }
    if (id === session?.collaboratorId) { showToast("Você não pode remover seu próprio login"); return; }
    persistCollaborators(collaborators.filter((c) => c.id !== id));
    showToast("Colaborador removido");
  }

  /* ---- lead actions ---- */
  function addLead(name, phone, notes) {
    const now = new Date().toISOString();
    const newLead = {
      id: uid("lead"), name, phone, notes: notes || "",
      kanbanStage: "lead_frio", followStage: "segundo", status: "ativo",
      ownerId: session.collaboratorId, ownerName: session.name,
      createdAt: now, lastContactAt: now, nextActionAt: addDays(now, 2),
      closedAt: null, finalizedAt: null,
      history: [{ stage: "inicial", date: now, by: session.name }],
    };
    persistLeads([newLead, ...leads]);
    showToast("Lead adicionado ao funil 💪");
  }

  function registerContact(id) {
    const now = new Date().toISOString();
    const updated = leads.map((l) => {
      if (l.id !== id) return l;
      const completed = l.followStage;
      const entry = { stage: completed, date: now, by: session.name };
      if (completed === "final") {
        return { ...l, status: "finalizado", followStage: "concluido", nextActionAt: null, lastContactAt: now, finalizedAt: now, history: [...l.history, entry] };
      }
      const next = FOLLOW_SEQUENCE[completed];
      const delay = FOLLOW_DELAY[completed];
      return { ...l, followStage: next, lastContactAt: now, nextActionAt: addDays(now, delay), history: [...l.history, entry] };
    });
    persistLeads(updated);
    showToast("Contato registrado!");
  }

  function moveLeadStage(id, newStage) {
    const now = new Date().toISOString();
    const updated = leads.map((l) => {
      if (l.id !== id) return l;
      if (newStage === "fechamento") {
        return { ...l, kanbanStage: newStage, status: "ganho", nextActionAt: null, closedAt: now };
      }
      if (l.status === "ganho") {
        return { ...l, kanbanStage: newStage, status: "ativo", closedAt: null, followStage: l.followStage === "concluido" ? "segundo" : l.followStage, nextActionAt: l.nextActionAt || addDays(now, 2) };
      }
      return { ...l, kanbanStage: newStage };
    });
    persistLeads(updated);
  }

  function reactivateLead(id) {
    const now = new Date().toISOString();
    const updated = leads.map((l) => {
      if (l.id !== id) return l;
      return {
        ...l, kanbanStage: "lead_frio", status: "ativo", followStage: "segundo",
        createdAt: now, lastContactAt: now, nextActionAt: addDays(now, 2),
        closedAt: null, finalizedAt: null,
        history: [...l.history, { stage: "reativado", date: now, by: session.name }],
      };
    });
    persistLeads(updated);
    setSelectedLead(null);
    showToast("Lead reativado — de volta ao Lead Frio");
  }

  function deleteLead(id) {
    persistLeads(leads.filter((l) => l.id !== id));
    setSelectedLead(null);
    showToast("Lead removido");
  }

  function updateLeadInfo(id, patch) {
    const updated = leads.map((l) => (l.id === id ? { ...l, ...patch } : l));
    persistLeads(updated);
  }

  /* ---- derived ---- */
  const isAdmin = session?.role === "admin";
  // Consultores só enxergam o próprio painel; apenas o admin pode alternar entre "todos" ou um consultor específico.
  const effectiveOwnerFilter = isAdmin ? ownerFilter : (session?.collaboratorId || "todos");

  const ownerFilteredLeads = useMemo(() => {
    if (effectiveOwnerFilter === "todos") return leads;
    return leads.filter((l) => l.ownerId === effectiveOwnerFilter);
  }, [leads, effectiveOwnerFilter]);

  const filteredLeads = useMemo(() => {
    if (!search.trim()) return ownerFilteredLeads;
    const q = search.toLowerCase();
    return ownerFilteredLeads.filter((l) => l.name.toLowerCase().includes(q) || (l.phone || "").includes(q));
  }, [ownerFilteredLeads, search]);

  const activeLeads = filteredLeads.filter((l) => l.status === "ativo" || l.status === "ganho");
  const finalizados = filteredLeads.filter((l) => l.status === "finalizado");

  const overdueCount = ownerFilteredLeads.filter((l) => alertLevel(l) === "overdue").length;
  const soonCount = ownerFilteredLeads.filter((l) => alertLevel(l) === "soon").length;
  const ativosCount = ownerFilteredLeads.filter((l) => l.status === "ativo").length;
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const fechadosMesCount = ownerFilteredLeads.filter((l) => l.status === "ganho" && l.closedAt && new Date(l.closedAt).getMonth() === thisMonth && new Date(l.closedAt).getFullYear() === thisYear).length;

  /* ---- render gates ---- */
  if (bootLoading) {
    return (
      <div className="rk-root rk-loading">
        <style>{CSS}</style>
        <Dumbbell size={32} className="rk-spin" />
        <span>Carregando CRM...</span>
      </div>
    );
  }

  if (collaborators.length === 0) {
    return (
      <div className="rk-root">
        <style>{CSS}</style>
        <SetupAdminScreen onCreate={createFirstAdmin} />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="rk-root">
        <style>{CSS}</style>
        <LoginScreen collaborators={collaborators} onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="rk-root">
      <style>{CSS}</style>

      <TopBar session={session} overdue={overdueCount} soon={soonCount} onLogout={handleLogout} />

      <div className="rk-body">
        <Sidebar view={view} setView={setView} isAdmin={isAdmin} />

        <main className="rk-main">
          {view === "dashboard" && (
            <DashboardView
              columns={KANBAN_COLUMNS}
              leads={activeLeads}
              search={search}
              setSearch={setSearch}
              onMove={moveLeadStage}
              onOpen={setSelectedLead}
              onNew={() => setShowNewLead(true)}
              overdueCount={overdueCount}
              soonCount={soonCount}
              ativosCount={ativosCount}
              fechadosMesCount={fechadosMesCount}
              isAdmin={isAdmin}
              collaborators={collaborators}
              ownerFilter={ownerFilter}
              setOwnerFilter={setOwnerFilter}
            />
          )}

          {view === "tarefas" && (
            <TarefasView leads={filteredLeads} scripts={scripts} onRegister={registerContact} onOpen={setSelectedLead}
              isAdmin={isAdmin} collaborators={collaborators} ownerFilter={ownerFilter} setOwnerFilter={setOwnerFilter} />
          )}

          {view === "scripts" && (
            <ScriptsView scripts={scripts} onSave={persistScripts} />
          )}

          {view === "relatorios" && (
            <RelatoriosView leads={isAdmin ? leads : leads.filter((l) => l.ownerId === session.collaboratorId)} isAdmin={isAdmin} collaborators={collaborators} />
          )}

          {view === "finalizados" && (
            <FinalizadosView leads={finalizados} onOpen={setSelectedLead} onReactivate={reactivateLead} />
          )}

          {view === "colaboradores" && isAdmin && (
            <ColaboradoresView collaborators={collaborators} session={session} onAdd={addCollaborator} onResetPin={resetPin} onRemove={removeCollaborator} />
          )}
        </main>
      </div>

      {showNewLead && (
        <NewLeadModal onClose={() => setShowNewLead(false)} onSave={(n, p, notes) => { addLead(n, p, notes); setShowNewLead(false); }} />
      )}

      {selectedLead && (
        <LeadDetailModal
          lead={leads.find((l) => l.id === selectedLead.id) || selectedLead}
          scripts={scripts}
          onClose={() => setSelectedLead(null)}
          onRegister={registerContact}
          onReactivate={reactivateLead}
          onDelete={deleteLead}
          onUpdate={updateLeadInfo}
        />
      )}

      {toast && <div className="rk-toast">{toast}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* AUTH SCREENS                                                             */
/* ---------------------------------------------------------------------- */

function SetupAdminScreen({ onCreate }) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  function submit() {
    if (!name.trim() || !username.trim() || pin.length < 4) { setError("Preencha nome, usuário e um PIN de ao menos 4 dígitos."); return; }
    onCreate(name.trim(), username.trim(), pin);
  }

  return (
    <div className="rk-auth-screen">
      <div className="rk-logo-badge"><img src={`${import.meta.env.BASE_URL}logo.png`} alt="ROCKFIT Equipamentos" /></div>
      <h1 className="rk-auth-title">CRM VENDAS</h1>
      <p className="rk-auth-sub">Primeiro acesso: crie o login de administrador (gerente).</p>
      <div className="rk-auth-card">
        <label className="rk-field-label">Seu nome</label>
        <input className="rk-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Washington" />
        <label className="rk-field-label">Usuário</label>
        <input className="rk-input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Ex: washington" />
        <label className="rk-field-label">PIN de acesso (4 a 6 dígitos)</label>
        <input className="rk-input" type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="••••" />
        {error && <div className="rk-error-msg">{error}</div>}
        <button className="rk-btn rk-btn-primary rk-auth-btn" onClick={submit}><ShieldCheck size={15} /> Criar login de administrador</button>
      </div>
    </div>
  );
}

function LoginScreen({ collaborators, onLogin }) {
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  function submit() {
    const err = onLogin(selected.id, pin);
    if (err) { setError(err); setPin(""); }
  }

  return (
    <div className="rk-auth-screen">
      <div className="rk-logo-badge"><img src={`${import.meta.env.BASE_URL}logo.png`} alt="ROCKFIT Equipamentos" /></div>
      <h1 className="rk-auth-title">CRM VENDAS</h1>
      <p className="rk-auth-sub">Selecione seu nome para entrar.</p>

      {!selected && (
        <div className="rk-collab-grid">
          {collaborators.map((c) => (
            <button key={c.id} className="rk-collab-btn" onClick={() => { setSelected(c); setError(""); }}>
              <span className="rk-collab-name">{c.name}</span>
              <span className="rk-role-badge">{c.role === "admin" ? "Administrador" : "Consultor de Vendas"}</span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="rk-auth-card">
          <div className="rk-field-label">Entrando como <b>{selected.name}</b></div>
          <input
            className="rk-input" type="password" inputMode="numeric" autoFocus
            value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="Digite seu PIN" onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          {error && <div className="rk-error-msg">{error}</div>}
          <div className="rk-detail-actions">
            <button className="rk-btn rk-btn-ghost" onClick={() => { setSelected(null); setPin(""); setError(""); }}>Voltar</button>
            <button className="rk-btn rk-btn-primary" onClick={submit}><KeyRound size={14} /> Entrar</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* TOP BAR + SIDEBAR                                                        */
/* ---------------------------------------------------------------------- */

function TopBar({ session, overdue, soon, onLogout }) {
  return (
    <header className="rk-topbar">
      <div className="rk-brand">
        <div className="rk-logo-badge rk-logo-badge-sm"><img src={`${import.meta.env.BASE_URL}logo.png`} alt="ROCKFIT Equipamentos" /></div>
        <div>
          <div className="rk-brand-title">CRM VENDAS</div>
          <div className="rk-brand-sub">ROCKFIT EQUIPAMENTOS</div>
        </div>
      </div>
      <div className="rk-topbar-right">
        {(overdue > 0 || soon > 0) && (
          <div className="rk-alert-pill">
            {overdue > 0 && <span className="rk-pill rk-pill-red"><AlertTriangle size={13} /> {overdue} atrasado{overdue > 1 ? "s" : ""}</span>}
            {soon > 0 && <span className="rk-pill rk-pill-amber"><Clock size={13} /> {soon} hoje</span>}
          </div>
        )}
        <div className="rk-user-chip">
          <span>{session.name}</span>
          <span className="rk-role-badge">{session.role === "admin" ? "Admin" : "Consultor"}</span>
        </div>
        <button className="rk-icon-btn" title="Sair" onClick={onLogout}><LogOut size={17} /></button>
      </div>
    </header>
  );
}

function Sidebar({ view, setView, isAdmin }) {
  const items = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "tarefas", label: "Tarefas do Dia", icon: ListChecks },
    { key: "scripts", label: "Scripts de Vendas", icon: FileText },
    { key: "relatorios", label: "Relatórios", icon: BarChart3 },
    { key: "finalizados", label: "Processo Finalizado", icon: Archive },
  ];
  if (isAdmin) items.push({ key: "colaboradores", label: "Colaboradores", icon: Users });
  return (
    <nav className="rk-sidebar">
      {items.map((it) => (
        <button key={it.key} className={"rk-nav-item" + (view === it.key ? " active" : "")} onClick={() => setView(it.key)}>
          <it.icon size={17} />
          <span>{it.label}</span>
        </button>
      ))}
    </nav>
  );
}

/* ---------------------------------------------------------------------- */
/* PLATE STACK — signature element                                         */
/* ---------------------------------------------------------------------- */

function PlateStack({ count }) {
  const widths = [14, 22, 30];
  return (
    <div className="rk-plates">
      {widths.map((w, i) => (
        <div key={i} className={"rk-plate" + (i < count ? " filled" : "")} style={{ width: w }} />
      ))}
    </div>
  );
}

function OwnerFilterSelect({ collaborators, ownerFilter, setOwnerFilter }) {
  return (
    <select className="rk-input rk-filter-select" value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
      <option value="todos">Ver leads de: Todos</option>
      {collaborators.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
  );
}

/* ---------------------------------------------------------------------- */
/* DASHBOARD / KANBAN                                                       */
/* ---------------------------------------------------------------------- */

function DashboardView({ columns, leads, search, setSearch, onMove, onOpen, onNew, overdueCount, soonCount, ativosCount, fechadosMesCount, isAdmin, collaborators, ownerFilter, setOwnerFilter }) {
  return (
    <div>
      <div className="rk-stats-row">
        <StatCard label="Leads ativos" value={ativosCount} tone="steel" />
        <StatCard label="Atrasados" value={overdueCount} tone="red" />
        <StatCard label="Para hoje" value={soonCount} tone="amber" />
        <StatCard label="Fechados no mês" value={fechadosMesCount} tone="green" />
      </div>

      <div className="rk-toolbar">
        <div className="rk-search">
          <Search size={15} />
          <input placeholder="Buscar por nome ou telefone..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {isAdmin && <OwnerFilterSelect collaborators={collaborators} ownerFilter={ownerFilter} setOwnerFilter={setOwnerFilter} />}
        <button className="rk-btn rk-btn-primary" onClick={onNew}><Plus size={15} /> Novo Lead</button>
      </div>

      <div className="rk-kanban">
        {columns.map((col) => {
          const items = leads.filter((l) => l.kanbanStage === col.key);
          return (
            <div
              key={col.key}
              className="rk-column"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { const id = e.dataTransfer.getData("text/plain"); if (id) onMove(id, col.key); }}
            >
              <div className={"rk-column-header rk-col-" + col.key}>
                <span>{col.label}</span>
                <span className="rk-column-count">{items.length}</span>
              </div>
              <div className="rk-column-body">
                {items.length === 0 && <div className="rk-empty">Nenhum lead aqui.</div>}
                {items.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} col={col.key} onOpen={onOpen} onMove={onMove} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }) {
  return (
    <div className={"rk-stat rk-stat-" + tone}>
      <div className="rk-stat-value">{value}</div>
      <div className="rk-stat-label">{label}</div>
    </div>
  );
}

function LeadCard({ lead, col, onOpen, onMove }) {
  const level = alertLevel(lead);
  const idx = KANBAN_COLUMNS.findIndex((c) => c.key === col);
  return (
    <div
      className={"rk-card rk-card-" + level}
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", lead.id)}
      onClick={() => onOpen(lead)}
    >
      <div className="rk-card-top">
        <span className="rk-card-name">{lead.name}</span>
        <PlateStack count={KANBAN_COLUMNS.find((c) => c.key === col)?.plates || 1} />
      </div>
      <div className="rk-card-phone"><Phone size={12} /> {lead.phone}</div>
      {lead.ownerName && <div className="rk-owner-tag">{lead.ownerName}</div>}
      {lead.status === "ativo" && (
        <div className={"rk-card-due tone-" + level}>
          <Clock size={12} />
          {FOLLOW_LABELS[lead.followStage]} — {fmtDate(lead.nextActionAt)}
        </div>
      )}
      {lead.status === "ganho" && <div className="rk-card-due tone-ok"><CheckCircle2 size={12} /> Venda fechada</div>}
      <div className="rk-card-controls" onClick={(e) => e.stopPropagation()}>
        <button disabled={idx === 0} onClick={() => onMove(lead.id, KANBAN_COLUMNS[idx - 1]?.key)} title="Mover para trás"><ChevronLeft size={13} /></button>
        <button disabled={idx === KANBAN_COLUMNS.length - 1} onClick={() => onMove(lead.id, KANBAN_COLUMNS[idx + 1]?.key)} title="Mover para frente"><ChevronRight size={13} /></button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* TAREFAS DO DIA                                                           */
/* ---------------------------------------------------------------------- */

function TarefasView({ leads, scripts, onRegister, onOpen, isAdmin, collaborators, ownerFilter, setOwnerFilter }) {
  const overdue = leads.filter((l) => alertLevel(l) === "overdue").sort((a, b) => new Date(a.nextActionAt) - new Date(b.nextActionAt));
  const today = leads.filter((l) => alertLevel(l) === "soon").sort((a, b) => new Date(a.nextActionAt) - new Date(b.nextActionAt));

  return (
    <div>
      <div className="rk-toolbar" style={{ marginBottom: 6 }}>
        <div>
          <h2 className="rk-view-title" style={{ marginBottom: 0 }}>Tarefas do Dia</h2>
          <p className="rk-view-sub" style={{ marginBottom: 0 }}>Lista de leads que precisam de um novo contato agora.</p>
        </div>
        {isAdmin && <OwnerFilterSelect collaborators={collaborators} ownerFilter={ownerFilter} setOwnerFilter={setOwnerFilter} />}
      </div>
      <div style={{ height: 14 }} />

      <TaskGroup title="Atrasados" tone="red" icon={AlertTriangle} leads={overdue} scripts={scripts} onRegister={onRegister} onOpen={onOpen} />
      <TaskGroup title="Para hoje / amanhã" tone="amber" icon={Clock} leads={today} scripts={scripts} onRegister={onRegister} onOpen={onOpen} />

      {overdue.length === 0 && today.length === 0 && (
        <div className="rk-empty-big"><CheckCircle2 size={28} /><p>Nenhuma tarefa pendente. Tudo em dia! 💪</p></div>
      )}
    </div>
  );
}

function TaskGroup({ title, tone, icon: Icon, leads, scripts, onRegister, onOpen }) {
  if (leads.length === 0) return null;
  return (
    <div className="rk-task-group">
      <div className={"rk-task-group-title tone-" + tone}><Icon size={16} /> {title} ({leads.length})</div>
      <div className="rk-task-list">
        {leads.map((lead) => {
          const d = daysUntil(lead.nextActionAt);
          const key = scriptKeyFor(lead);
          return (
            <div key={lead.id} className={"rk-task-row tone-" + tone}>
              <div className="rk-task-info" onClick={() => onOpen(lead)}>
                <div className="rk-task-name">{lead.name} {lead.ownerName && <span className="rk-owner-tag rk-owner-tag-inline">{lead.ownerName}</span>}</div>
                <div className="rk-task-meta">{lead.phone} · {FOLLOW_LABELS[lead.followStage]} · {d < 0 ? `${Math.abs(d)}d atrasado` : d === 0 ? "hoje" : "amanhã"}</div>
              </div>
              <div className="rk-task-actions">
                <a className="rk-btn rk-btn-ghost" href={buildWaLink(lead, scripts[key])} target="_blank" rel="noopener noreferrer">
                  <MessageCircle size={14} /> WhatsApp
                </a>
                <button className="rk-btn rk-btn-primary" onClick={() => onRegister(lead.id)}>
                  <CheckCircle2 size={14} /> Registrar contato
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* SCRIPTS                                                                  */
/* ---------------------------------------------------------------------- */

function ScriptsView({ scripts, onSave }) {
  const [draft, setDraft] = useState(scripts);
  const [savedFlash, setSavedFlash] = useState(null);
  useEffect(() => setDraft(scripts), [scripts]);

  const order = ["inicial", "segundo", "terceiro", "reaquecimento", "final"];
  const labels = { inicial: "Contato Inicial (Lead Frio)", segundo: "2º Contato", terceiro: "3º Contato", reaquecimento: "Reaquecimento", final: "Contato Final" };

  return (
    <div>
      <h2 className="rk-view-title">Scripts de Vendas</h2>
      <p className="rk-view-sub">Use <code>{"{nome}"}</code> para inserir o primeiro nome do lead automaticamente. Estes textos são usados no botão de WhatsApp.</p>

      {order.map((key) => (
        <div key={key} className="rk-script-block">
          <div className="rk-script-label">{labels[key]}</div>
          <textarea
            className="rk-textarea"
            rows={3}
            value={draft[key]}
            onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
          />
          <button
            className="rk-btn rk-btn-primary rk-script-save"
            onClick={() => { onSave(draft); setSavedFlash(key); setTimeout(() => setSavedFlash(null), 1500); }}
          >
            <Save size={14} /> {savedFlash === key ? "Salvo!" : "Salvar"}
          </button>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* RELATÓRIOS                                                               */
/* ---------------------------------------------------------------------- */

function RelatoriosView({ leads, isAdmin, collaborators }) {
  const totalGeral = leads.length;
  const totalGanho = leads.filter((l) => l.status === "ganho").length;
  const totalFinalizado = leads.filter((l) => l.status === "finalizado").length;
  const totalAtivo = leads.filter((l) => l.status === "ativo").length;
  const taxaConversao = totalGeral ? Math.round((totalGanho / totalGeral) * 100) : 0;

  const stageData = KANBAN_COLUMNS.map((c) => ({
    name: c.label,
    total: leads.filter((l) => l.kanbanStage === c.key && l.status !== "finalizado").length,
  }));

  const byAttendant = {};
  leads.forEach((l) => l.history.forEach((h) => {
    const name = h.by || "—";
    byAttendant[name] = (byAttendant[name] || 0) + 1;
  }));
  const attendantData = Object.entries(byAttendant).map(([name, total]) => ({ name, total }));

  const COLORS = ["#5C7A8A", "#D9A62B", "#3FAE6B"];

  const teamRows = isAdmin ? collaborators.map((c) => {
    const mine = leads.filter((l) => l.ownerId === c.id);
    const ativos = mine.filter((l) => l.status === "ativo").length;
    const fechados = mine.filter((l) => l.status === "ganho").length;
    const finalizadosC = mine.filter((l) => l.status === "finalizado").length;
    const atrasados = mine.filter((l) => alertLevel(l) === "overdue").length;
    const contatos = mine.reduce((sum, l) => sum + l.history.length, 0);
    const taxa = mine.length ? Math.round((fechados / mine.length) * 100) : 0;
    return { ...c, ativos, fechados, finalizadosC, atrasados, contatos, taxa, totalLeads: mine.length };
  }) : [];

  return (
    <div>
      <h2 className="rk-view-title">Relatórios</h2>

      <div className="rk-stats-row">
        <StatCard label="Total de leads" value={totalGeral} tone="steel" />
        <StatCard label="Em negociação" value={totalAtivo} tone="amber" />
        <StatCard label="Fechados (ganho)" value={totalGanho} tone="green" />
        <StatCard label="Finalizados sem venda" value={totalFinalizado} tone="red" />
      </div>
      <div className="rk-stats-row">
        <StatCard label="Taxa de conversão" value={taxaConversao + "%"} tone="steel" wide />
      </div>

      {isAdmin && teamRows.length > 0 && (
        <div className="rk-chart-block">
          <div className="rk-script-label">Painel da equipe — produtividade por consultor</div>
          <div className="rk-table-wrap">
            <table className="rk-collab-table">
              <thead>
                <tr>
                  <th>Consultor</th><th>Leads</th><th>Ativos</th><th>Fechados</th><th>Finalizados</th><th>Atrasados agora</th><th>Contatos feitos</th><th>Conversão</th>
                </tr>
              </thead>
              <tbody>
                {teamRows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>{r.totalLeads}</td>
                    <td>{r.ativos}</td>
                    <td>{r.fechados}</td>
                    <td>{r.finalizadosC}</td>
                    <td className={r.atrasados > 0 ? "tone-red" : ""}>{r.atrasados}</td>
                    <td>{r.contatos}</td>
                    <td>{r.taxa}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="rk-chart-block">
        <div className="rk-script-label">Distribuição do funil</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={stageData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2E353D" />
            <XAxis dataKey="name" stroke="#A3ABB3" fontSize={12} />
            <YAxis stroke="#A3ABB3" fontSize={12} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "#1B1F25", border: "1px solid #2E353D", color: "#EDEFF1" }} />
            <Bar dataKey="total" radius={[4, 4, 0, 0]}>
              {stageData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {attendantData.length > 0 && (
        <div className="rk-chart-block">
          <div className="rk-script-label">Contatos realizados por atendente</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={attendantData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2E353D" />
              <XAxis dataKey="name" stroke="#A3ABB3" fontSize={12} />
              <YAxis stroke="#A3ABB3" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#1B1F25", border: "1px solid #2E353D", color: "#EDEFF1" }} />
              <Bar dataKey="total" fill="#D9622B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* PROCESSO FINALIZADO                                                      */
/* ---------------------------------------------------------------------- */

function FinalizadosView({ leads, onOpen, onReactivate }) {
  return (
    <div>
      <h2 className="rk-view-title">Processo Finalizado</h2>
      <p className="rk-view-sub">Leads que passaram por todo o funil de contatos sem fechar venda. Ficam disponíveis para reativação futura.</p>
      {leads.length === 0 && <div className="rk-empty-big"><Archive size={28} /><p>Nenhum lead finalizado ainda.</p></div>}
      <div className="rk-task-list">
        {leads.map((lead) => (
          <div key={lead.id} className="rk-task-row tone-neutral">
            <div className="rk-task-info" onClick={() => onOpen(lead)}>
              <div className="rk-task-name">{lead.name}</div>
              <div className="rk-task-meta">{lead.phone} · finalizado em {fmtDate(lead.finalizedAt)}</div>
            </div>
            <div className="rk-task-actions">
              <button className="rk-btn rk-btn-primary" onClick={() => onReactivate(lead.id)}><RotateCcw size={14} /> Reativar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* COLABORADORES (ADMIN)                                                    */
/* ---------------------------------------------------------------------- */

function ColaboradoresView({ collaborators, session, onAdd, onResetPin, onRemove }) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState("vendedor");
  const [error, setError] = useState("");
  const [resetTarget, setResetTarget] = useState(null);
  const [resetPinValue, setResetPinValue] = useState("");

  function submit() {
    if (!name.trim() || !username.trim() || pin.length < 4) { setError("Preencha nome, usuário e um PIN de ao menos 4 dígitos."); return; }
    if (collaborators.some((c) => c.username === username.toLowerCase())) { setError("Já existe um usuário com esse nome de acesso."); return; }
    onAdd(name.trim(), username.trim(), pin, role);
    setName(""); setUsername(""); setPin(""); setRole("vendedor"); setError("");
  }

  return (
    <div>
      <h2 className="rk-view-title">Colaboradores</h2>
      <p className="rk-view-sub">Cadastre os logins da equipe de vendas e do administrador. Cada colaborador entra com nome + PIN.</p>

      <div className="rk-script-block">
        <div className="rk-script-label">Novo colaborador</div>
        <label className="rk-field-label">Nome</label>
        <input className="rk-input" value={name} onChange={(e) => setName(e.target.value)} />
        <label className="rk-field-label">Usuário</label>
        <input className="rk-input" value={username} onChange={(e) => setUsername(e.target.value)} />
        <label className="rk-field-label">PIN (4 a 6 dígitos)</label>
        <input className="rk-input" type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} />
        <label className="rk-field-label">Função</label>
        <select className="rk-input" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="vendedor">Consultor de Vendas</option>
          <option value="admin">Administrador</option>
        </select>
        {error && <div className="rk-error-msg">{error}</div>}
        <button className="rk-btn rk-btn-primary rk-script-save" onClick={submit}><Plus size={14} /> Cadastrar</button>
      </div>

      <div className="rk-table-wrap">
        <table className="rk-collab-table">
          <thead><tr><th>Nome</th><th>Usuário</th><th>Função</th><th></th></tr></thead>
          <tbody>
            {collaborators.map((c) => (
              <tr key={c.id}>
                <td>{c.name}{c.id === session.collaboratorId && <span className="rk-owner-tag rk-owner-tag-inline">você</span>}</td>
                <td>{c.username}</td>
                <td>{c.role === "admin" ? "Administrador" : "Consultor de Vendas"}</td>
                <td>
                  <div className="rk-detail-actions">
                    {resetTarget === c.id ? (
                      <>
                        <input className="rk-input" style={{ width: 100 }} type="password" inputMode="numeric" placeholder="Novo PIN" value={resetPinValue} onChange={(e) => setResetPinValue(e.target.value.replace(/\D/g, "").slice(0, 6))} />
                        <button className="rk-btn rk-btn-primary" onClick={() => { if (resetPinValue.length >= 4) { onResetPin(c.id, resetPinValue); setResetTarget(null); setResetPinValue(""); } }}>Salvar</button>
                      </>
                    ) : (
                      <button className="rk-btn rk-btn-ghost" onClick={() => setResetTarget(c.id)}>Redefinir PIN</button>
                    )}
                    <button className="rk-btn rk-btn-danger" onClick={() => onRemove(c.id)}><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* MODALS                                                                   */
/* ---------------------------------------------------------------------- */

function NewLeadModal({ onClose, onSave }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <div className="rk-modal-overlay" onClick={onClose}>
      <div className="rk-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rk-modal-header">
          <span>Novo Lead</span>
          <button className="rk-icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="rk-modal-body">
          <label className="rk-field-label">Nome do contato</label>
          <input className="rk-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: João Silva - Academia Fit" />
          <label className="rk-field-label">Telefone (WhatsApp)</label>
          <input className="rk-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ex: 62999999999" />
          <label className="rk-field-label">Observações</label>
          <textarea className="rk-textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex: interessado em Flexora Articulada, academia pequena, pediu desconto..." />
        </div>
        <div className="rk-modal-footer">
          <button className="rk-btn rk-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="rk-btn rk-btn-primary" disabled={!name.trim() || !phone.trim()} onClick={() => onSave(name.trim(), phone.trim(), notes.trim())}>
            <Plus size={14} /> Adicionar ao Lead Frio
          </button>
        </div>
      </div>
    </div>
  );
}

function LeadDetailModal({ lead, scripts, onClose, onRegister, onReactivate, onDelete, onUpdate }) {
  const [name, setName] = useState(lead.name);
  const [phone, setPhone] = useState(lead.phone);
  const [notes, setNotes] = useState(lead.notes || "");
  const key = scriptKeyFor(lead);

  return (
    <div className="rk-modal-overlay" onClick={onClose}>
      <div className="rk-modal rk-modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="rk-modal-header">
          <span>Detalhes do Lead</span>
          <button className="rk-icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="rk-modal-body">
          <label className="rk-field-label">Nome</label>
          <input className="rk-input" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => onUpdate(lead.id, { name })} />
          <label className="rk-field-label">Telefone</label>
          <input className="rk-input" value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={() => onUpdate(lead.id, { phone })} />
          <label className="rk-field-label">Observações</label>
          <textarea className="rk-textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => onUpdate(lead.id, { notes })} />

          <div className="rk-detail-row">
            <div><span className="rk-field-label">Etapa</span><div>{KANBAN_COLUMNS.find((c) => c.key === lead.kanbanStage)?.label}</div></div>
            <div><span className="rk-field-label">Status</span><div className={"tone-" + (lead.status === "ganho" ? "ok" : lead.status === "finalizado" ? "red" : "amber")}>
              {lead.status === "ganho" ? "Venda fechada" : lead.status === "finalizado" ? "Finalizado sem venda" : FOLLOW_LABELS[lead.followStage]}
            </div></div>
            <div><span className="rk-field-label">Próxima ação</span><div>{fmtDate(lead.nextActionAt)}</div></div>
          </div>
          {lead.ownerName && (
            <div className="rk-detail-row"><div><span className="rk-field-label">Responsável</span><div>{lead.ownerName}</div></div></div>
          )}

          {lead.status === "ativo" && (
            <div className="rk-detail-actions">
              <a className="rk-btn rk-btn-ghost" href={buildWaLink(lead, scripts[key])} target="_blank" rel="noopener noreferrer"><MessageCircle size={14} /> Enviar WhatsApp</a>
              <button className="rk-btn rk-btn-primary" onClick={() => onRegister(lead.id)}><CheckCircle2 size={14} /> Registrar contato</button>
            </div>
          )}
          {lead.status === "finalizado" && (
            <div className="rk-detail-actions">
              <button className="rk-btn rk-btn-primary" onClick={() => onReactivate(lead.id)}><RotateCcw size={14} /> Reativar lead</button>
            </div>
          )}

          <div className="rk-field-label" style={{ marginTop: 16 }}>Histórico</div>
          <div className="rk-history">
            {[...lead.history].reverse().map((h, i) => (
              <div key={i} className="rk-history-row">
                <span>{h.stage === "inicial" ? "Contato inicial" : h.stage === "reativado" ? "Reativado" : FOLLOW_LABELS[h.stage] || h.stage}</span>
                <span className="rk-history-meta">{fmtDateTime(h.date)} {h.by ? "· " + h.by : ""}</span>
              </div>
            ))}
          </div>

          <button className="rk-btn rk-btn-danger" style={{ marginTop: 16 }} onClick={() => { if (confirm("Excluir este lead permanentemente?")) onDelete(lead.id); }}>
            <Trash2 size={14} /> Excluir lead
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* STYLES                                                                   */
/* ---------------------------------------------------------------------- */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap');

.rk-root {
  --bg: #12151A;
  --panel: #1B1F25;
  --panel-2: #20252B;
  --border: #2E353D;
  --text-hi: #EDEFF1;
  --text-mid: #A3ABB3;
  --text-low: #6B7280;
  --accent: #D9622B;
  --col-frio: #5C7A8A;
  --col-neg: #D9A62B;
  --col-fech: #3FAE6B;
  --red: #E5484D;
  --amber: #F2A93B;
  --green: #3FAE6B;

  font-family: 'Inter', sans-serif;
  background: var(--bg);
  color: var(--text-hi);
  min-height: 640px;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.rk-loading { align-items: center; justify-content: center; flex-direction: column; gap: 10px; padding: 60px 0; color: var(--text-mid); }
.rk-spin { animation: rk-spin 1s linear infinite; color: var(--accent); }
@keyframes rk-spin { to { transform: rotate(360deg); } }

.rk-auth-screen { display: flex; flex-direction: column; align-items: center; padding: 60px 20px; gap: 6px; }
.rk-auth-icon { width: 52px; height: 52px; border-radius: 12px; }
.rk-logo-badge { background: #fff; border-radius: 12px; padding: 14px 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 10px rgba(0,0,0,0.25); }
.rk-logo-badge img { height: 34px; width: auto; display: block; }
.rk-logo-badge-sm { padding: 6px 10px; border-radius: 8px; box-shadow: none; }
.rk-logo-badge-sm img { height: 20px; }
.rk-auth-title { font-family: 'Oswald', sans-serif; font-weight: 700; letter-spacing: 0.05em; font-size: 20px; margin: 10px 0 0; }
.rk-auth-sub { color: var(--text-mid); font-size: 13px; margin: 0 0 18px; }
.rk-auth-card { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 18px 20px; width: 320px; max-width: 90vw; }
.rk-auth-btn { width: 100%; justify-content: center; margin-top: 14px; }
.rk-error-msg { color: var(--red); font-size: 12.5px; margin-top: 8px; }
.rk-collab-grid { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; max-width: 460px; }
.rk-collab-btn { display: flex; flex-direction: column; align-items: center; gap: 5px; background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 14px 18px; cursor: pointer; color: var(--text-hi); min-width: 110px; }
.rk-collab-btn:hover { border-color: var(--accent); }
.rk-collab-name { font-weight: 600; font-size: 13.5px; }

.rk-topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 20px; background: var(--panel); border-bottom: 1px solid var(--border);
  flex-wrap: wrap; gap: 10px;
}
.rk-brand { display: flex; align-items: center; gap: 10px; }
.rk-brand-icon { width: 34px; height: 34px; border-radius: 8px; background: var(--accent); display: flex; align-items: center; justify-content: center; color: #fff; }
.rk-brand-title { font-family: 'Oswald', sans-serif; font-weight: 700; letter-spacing: 0.06em; font-size: 15px; line-height: 1.1; }
.rk-brand-sub { font-size: 10.5px; color: var(--text-mid); letter-spacing: 0.05em; }
.rk-topbar-right { display: flex; align-items: center; gap: 12px; }
.rk-alert-pill { display: flex; gap: 6px; }
.rk-pill { display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; padding: 4px 9px; border-radius: 20px; }
.rk-pill-red { background: rgba(229,72,77,0.15); color: var(--red); }
.rk-pill-amber { background: rgba(242,169,59,0.15); color: var(--amber); }
.rk-user-chip { display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600; background: var(--panel-2); border: 1px solid var(--border); padding: 5px 10px; border-radius: 20px; }
.rk-role-badge { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; color: var(--accent); background: rgba(217,98,43,0.15); padding: 1px 6px; border-radius: 10px; }

.rk-body { display: flex; flex: 1; min-height: 0; }
.rk-sidebar { width: 190px; background: var(--panel); border-right: 1px solid var(--border); padding: 14px 10px; display: flex; flex-direction: column; gap: 3px; }
.rk-nav-item { display: flex; align-items: center; gap: 9px; padding: 9px 11px; border-radius: 7px; background: none; border: none; color: var(--text-mid); font-size: 13px; font-weight: 500; cursor: pointer; text-align: left; }
.rk-nav-item:hover { background: var(--panel-2); color: var(--text-hi); }
.rk-nav-item.active { background: var(--accent); color: #fff; }

.rk-main { flex: 1; padding: 20px 24px; overflow-y: auto; }
.rk-view-title { font-family: 'Oswald', sans-serif; font-size: 20px; font-weight: 600; margin: 0 0 4px; }
.rk-view-sub { color: var(--text-mid); font-size: 13px; margin: 0 0 18px; }

.rk-stats-row { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.rk-stat { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 12px 16px; min-width: 130px; flex: 1; border-left: 3px solid var(--text-low); }
.rk-stat-steel { border-left-color: var(--col-frio); }
.rk-stat-red { border-left-color: var(--red); }
.rk-stat-amber { border-left-color: var(--amber); }
.rk-stat-green { border-left-color: var(--green); }
.rk-stat-value { font-family: 'IBM Plex Mono', monospace; font-size: 24px; font-weight: 600; }
.rk-stat-label { font-size: 12px; color: var(--text-mid); margin-top: 2px; }

.rk-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; gap: 10px; flex-wrap: wrap; }
.rk-search { display: flex; align-items: center; gap: 7px; background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 7px 11px; flex: 1; min-width: 200px; color: var(--text-mid); }
.rk-search input { background: none; border: none; outline: none; color: var(--text-hi); font-size: 13px; width: 100%; }
.rk-filter-select { width: auto; min-width: 170px; }

.rk-kanban { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.rk-column { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; display: flex; flex-direction: column; min-height: 360px; }
.rk-column-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; font-weight: 600; font-size: 13.5px; border-bottom: 1px solid var(--border); border-radius: 10px 10px 0 0; color: #fff; }
.rk-col-lead_frio { background: var(--col-frio); }
.rk-col-negociacao { background: var(--col-neg); color: #1a1500; }
.rk-col-fechamento { background: var(--col-fech); color: #06210f; }
.rk-column-count { background: rgba(0,0,0,0.2); padding: 1px 8px; border-radius: 20px; font-size: 12px; }
.rk-column-body { padding: 10px; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; flex: 1; }
.rk-empty { color: var(--text-low); font-size: 12.5px; text-align: center; padding: 20px 0; }

.rk-card { background: var(--panel-2); border: 1px solid var(--border); border-left: 3px solid var(--text-low); border-radius: 8px; padding: 9px 11px; cursor: grab; }
.rk-card-overdue { border-left-color: var(--red); }
.rk-card-soon { border-left-color: var(--amber); }
.rk-card-ok { border-left-color: var(--green); }
.rk-card-top { display: flex; justify-content: space-between; align-items: center; gap: 6px; }
.rk-card-name { font-weight: 600; font-size: 13.5px; }
.rk-card-phone { display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--text-mid); margin-top: 4px; }
.rk-owner-tag { display: inline-block; font-size: 10.5px; color: var(--text-mid); background: rgba(255,255,255,0.05); border: 1px solid var(--border); padding: 1px 6px; border-radius: 8px; margin-top: 5px; }
.rk-owner-tag-inline { margin-top: 0; margin-left: 6px; }
.rk-card-due { display: flex; align-items: center; gap: 5px; font-size: 11.5px; margin-top: 6px; font-weight: 600; }
.tone-overdue, .rk-card-due.tone-overdue { color: var(--red); }
.tone-soon, .rk-card-due.tone-soon { color: var(--amber); }
.tone-ok, .rk-card-due.tone-ok, .tone-none { color: var(--green); }
.tone-red { color: var(--red); }
.rk-card-controls { display: flex; justify-content: flex-end; gap: 4px; margin-top: 6px; }
.rk-card-controls button { background: var(--panel); border: 1px solid var(--border); border-radius: 5px; color: var(--text-mid); padding: 2px 4px; cursor: pointer; }
.rk-card-controls button:disabled { opacity: 0.3; cursor: not-allowed; }

.rk-plates { display: flex; gap: 2px; align-items: center; }
.rk-plate { height: 8px; background: var(--border); border-radius: 2px; }
.rk-plate.filled { background: var(--accent); }

.rk-task-group { margin-bottom: 20px; }
.rk-task-group-title { display: flex; align-items: center; gap: 7px; font-weight: 600; font-size: 14px; margin-bottom: 8px; }
.rk-task-list { display: flex; flex-direction: column; gap: 8px; }
.rk-task-row { display: flex; justify-content: space-between; align-items: center; background: var(--panel); border: 1px solid var(--border); border-left: 3px solid var(--text-low); border-radius: 8px; padding: 10px 14px; gap: 10px; flex-wrap: wrap; }
.rk-task-row.tone-red { border-left-color: var(--red); }
.rk-task-row.tone-amber { border-left-color: var(--amber); }
.rk-task-row.tone-neutral { border-left-color: var(--text-low); }
.rk-task-info { cursor: pointer; }
.rk-task-name { font-weight: 600; font-size: 13.5px; }
.rk-task-meta { font-size: 12px; color: var(--text-mid); margin-top: 2px; }
.rk-task-actions { display: flex; gap: 8px; }
.rk-empty-big { display: flex; flex-direction: column; align-items: center; gap: 8px; color: var(--text-mid); padding: 50px 0; }

.rk-btn { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600; padding: 7px 13px; border-radius: 7px; border: 1px solid var(--border); background: var(--panel-2); color: var(--text-hi); cursor: pointer; text-decoration: none; }
.rk-btn-primary { background: var(--accent); border-color: var(--accent); color: #fff; }
.rk-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
.rk-btn-ghost { background: transparent; }
.rk-btn-danger { background: transparent; border-color: var(--red); color: var(--red); }

.rk-script-block { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 14px; margin-bottom: 12px; }
.rk-script-label { font-weight: 600; font-size: 13px; margin-bottom: 8px; color: var(--text-mid); }
.rk-textarea { width: 100%; background: var(--panel-2); border: 1px solid var(--border); border-radius: 7px; color: var(--text-hi); font-size: 13px; padding: 9px; font-family: 'Inter', sans-serif; resize: vertical; box-sizing: border-box; }
.rk-script-save { margin-top: 8px; }

.rk-chart-block { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 14px; margin-bottom: 14px; }
.rk-table-wrap { overflow-x: auto; }
.rk-collab-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.rk-collab-table th { text-align: left; color: var(--text-mid); font-weight: 600; padding: 8px 10px; border-bottom: 1px solid var(--border); white-space: nowrap; }
.rk-collab-table td { padding: 8px 10px; border-bottom: 1px solid var(--border); white-space: nowrap; }

.rk-input { width: 100%; background: var(--panel-2); border: 1px solid var(--border); border-radius: 7px; color: var(--text-hi); font-size: 13px; padding: 8px 10px; box-sizing: border-box; }
.rk-field-label { display: block; font-size: 11.5px; color: var(--text-mid); margin: 10px 0 4px; text-transform: uppercase; letter-spacing: 0.04em; }

.rk-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 50; }
.rk-modal { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; width: 380px; max-width: 92vw; max-height: 85vh; display: flex; flex-direction: column; }
.rk-modal-lg { width: 460px; }
.rk-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-bottom: 1px solid var(--border); font-weight: 600; }
.rk-modal-body { padding: 14px 16px; overflow-y: auto; }
.rk-modal-footer { padding: 12px 16px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 8px; }
.rk-icon-btn { background: none; border: none; color: var(--text-mid); cursor: pointer; }
.rk-detail-row { display: flex; gap: 16px; margin-top: 12px; font-size: 13px; flex-wrap: wrap; }
.rk-detail-actions { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; align-items: center; }
.rk-history { display: flex; flex-direction: column; gap: 6px; max-height: 160px; overflow-y: auto; }
.rk-history-row { display: flex; justify-content: space-between; font-size: 12px; border-bottom: 1px solid var(--border); padding-bottom: 5px; }
.rk-history-meta { color: var(--text-low); }

.rk-toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: var(--panel-2); border: 1px solid var(--border); color: var(--text-hi); padding: 10px 18px; border-radius: 8px; font-size: 13px; z-index: 60; }

@media (max-width: 760px) {
  .rk-kanban { grid-template-columns: 1fr; }
  .rk-sidebar { width: 60px; }
  .rk-nav-item span { display: none; }
  .rk-user-chip span:first-child { display: none; }
}
`;
