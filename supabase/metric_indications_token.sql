-- Código de acesso (token) por consultor p/ a aba "Indicações" do link público
-- Execute no Supabase SQL Editor. O gestor vê o token na tela de Métricas Diárias e envia o link pessoal a cada consultor.

-- 1) Coluna de token (se ainda não existir)
ALTER TABLE public_metric_consultants
  ADD COLUMN IF NOT EXISTS indication_token text;

-- 2) Backfill: gera um token para os consultores que ainda não têm
UPDATE public_metric_consultants
SET indication_token = upper(substr(md5(random()::text), 1, 8))
WHERE indication_token IS NULL OR indication_token = '';