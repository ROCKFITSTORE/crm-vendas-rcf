-- Execute este script inteiro no SQL Editor do seu projeto Supabase.
-- Ele cria a tabela usada para guardar os dados compartilhados do CRM
-- (leads, scripts de vendas e cadastro de colaboradores).

create table if not exists kv_store (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

-- Row Level Security ligado, mas com uma política aberta: qualquer pessoa
-- com a URL e a chave "anon" do projeto pode ler/escrever nessa tabela.
-- Isso é adequado para uma ferramenta interna de equipe pequena, protegida
-- pelo login por PIN dentro do próprio CRM — NÃO é indicado para guardar
-- dados sensíveis de terceiros (cartão de crédito, documentos, etc).
alter table kv_store enable row level security;

drop policy if exists "Allow all access to kv_store" on kv_store;
create policy "Allow all access to kv_store"
on kv_store
for all
using (true)
with check (true);
