import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/crm-vendas-rcf/", // caminho do repositório no GitHub Pages
});

