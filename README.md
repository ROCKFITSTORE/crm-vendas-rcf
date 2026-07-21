# CRM VENDAS — ROCKFIT EQUIPAMENTOS

CRM de atendimento via WhatsApp com funil de vendas (Lead Frio → Negociação → Fechamento), alarmes de recontato automáticos, scripts de vendas editáveis, login por colaborador e relatórios de produtividade.

Este projeto foi adaptado do protótipo feito no Claude para rodar como um site independente, com banco de dados real (Supabase).

---

## 1. Criar o banco de dados (Supabase — gratuito)

1. Crie uma conta em **https://supabase.com** e clique em "New project".
2. Escolha um nome (ex: `crm-rockfit`) e uma senha de banco (guarde em local seguro).
3. Depois que o projeto for criado, vá em **SQL Editor** (menu lateral).
4. Abra o arquivo `supabase/schema.sql` deste projeto, copie todo o conteúdo, cole no editor e clique em **Run**.
5. Vá em **Project Settings > API**. Copie dois valores:
   - **Project URL**
   - **anon public key**

## 2. Configurar o projeto localmente

1. Copie o arquivo `.env.example` para um novo arquivo chamado `.env`:
   ```
   cp .env.example .env
   ```
2. Abra o `.env` e cole os dois valores do Supabase:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=xxxxxxxxxxxxxxxx
   ```
3. Instale as dependências (precisa ter o [Node.js](https://nodejs.org) instalado):
   ```
   npm install
   ```
4. Rode localmente para testar:
   ```
   npm run dev
   ```
   Abra o endereço mostrado no terminal (geralmente `http://localhost:5173`). Na primeira vez, o sistema vai pedir para criar o login de administrador — é o mesmo fluxo de quando testamos no Claude.

## 3. Subir para o GitHub

1. Crie um repositório novo em **https://github.com/new** (pode deixar privado).
2. Dentro da pasta do projeto, rode:
   ```
   git init
   git add .
   git commit -m "CRM Vendas Rockfit - versão inicial"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
   git push -u origin main
   ```
   O arquivo `.gitignore` já garante que o `.env` (com suas chaves) **não** é enviado ao GitHub.

## 4. Publicar o site

Você tem duas opções prontas — escolha uma:

### Opção A — Vercel (mais simples, recomendado)

1. Crie uma conta em **https://vercel.com** (dá para entrar direto com o GitHub).
2. Clique em "Add New… > Project" e selecione o repositório que você acabou de subir.
3. A Vercel detecta automaticamente que é um projeto Vite. Antes de finalizar, adicione as variáveis de ambiente (mesmas do `.env`):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Clique em **Deploy**. Em cerca de 1 minuto, você recebe uma URL pública (ex: `crm-vendas-rockfit.vercel.app`).
5. Quer usar seu próprio domínio (ex: `crm.rockfitequipamentos.com.br`)? Em Project Settings > Domains na Vercel, é só adicionar e seguir as instruções de DNS.

### Opção B — GitHub Pages

Por padrão, o GitHub Pages não sabe montar um projeto React/Vite — por isso o deploy falhou da primeira vez. O arquivo `.github/workflows/deploy.yml`, incluído neste projeto, resolve isso: ele instrui o GitHub a instalar as dependências, rodar `npm run build` e publicar o resultado automaticamente a cada `git push`.

Passo a passo:

1. No repositório do GitHub, vá em **Settings > Secrets and variables > Actions**. Clique em **New repository secret** e cadastre dois segredos (com os mesmos valores do seu `.env`):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2. Ainda em **Settings**, vá em **Pages** (menu lateral). Em "Build and deployment > Source", selecione **GitHub Actions** (não "Deploy from a branch" — essa era a causa do erro anterior).
3. Suba os arquivos deste projeto (incluindo a pasta `.github/workflows`) para o repositório, com `git push`.
4. Vá na aba **Actions** do repositório e acompanhe o processo — deve aparecer "Deploy to GitHub Pages" rodando. Quando ficar verde (✔), o site está no ar.
5. A URL fica em **Settings > Pages**, algo como `https://seu-usuario.github.io/nome-do-repositorio/`.

A partir daí, todo `git push` refaz o build e republica sozinho.

---

## Sobre segurança

- O login de cada consultor usa nome + PIN, guardado na tabela do Supabase. Isso é adequado para controle interno de uma equipe pequena, mas **não é uma autenticação de nível bancário** — quem tiver acesso técnico ao banco consegue ver os PINs. Não cadastre PINs que você usa em outros sistemas importantes.
- Os dados de leads, scripts e colaboradores ficam acessíveis por qualquer pessoa que tenha a URL do Supabase e a chave "anon" (é assim que o app funciona sem precisar de um servidor próprio). Não é recomendado usar essa estrutura para dados sigilosos de clientes além do que já é tratado no CRM (nome, telefone, observações comerciais).
- Se no futuro quiser uma segurança mais robusta (senhas com hash, autenticação de dois fatores, permissões por linha de dado), o Supabase também oferece um sistema de autenticação completo (Supabase Auth) que pode substituir o login por PIN — é um passo de evolução natural a partir daqui.

## Estrutura do projeto

```
crm-vendas-rockfit/
├── .github/
│   └── workflows/
│       └── deploy.yml          # publica automaticamente no GitHub Pages a cada push
├── public/
│   └── logo.png              # logomarca ROCKFIT
├── src/
│   ├── App.jsx                # todo o CRM (dashboard, tarefas, scripts, relatórios, login)
│   ├── main.jsx                # ponto de entrada do React
│   └── lib/
│       ├── supabaseClient.js   # conexão com o Supabase
│       └── storage.js          # camada de dados (leads/scripts = Supabase, sessão = localStorage)
├── supabase/
│   └── schema.sql              # script para criar a tabela no Supabase
├── .env.example
├── package.json
└── vite.config.js
```
