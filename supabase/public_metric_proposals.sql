-- Propostas do link público de métricas diárias (/metricas/:ownerId)
-- Execute no Supabase SQL Editor
-- O consultor registra propostas (nome + o que foi conversado + dia do retorno + status)
-- e visualiza na aba "Propostas" — sem login, com PIN (3 primeiros dígitos do CPF).

-- 1) Tabela de propostas
CREATE TABLE IF NOT EXISTS public_metric_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,               -- gestor dono do painel (ownerId da URL)
  consultant_id uuid NOT NULL,         -- consultor que registrou a proposta
  name text NOT NULL,                  -- nome da proposta/cliente
  description text,                    -- o que foi conversado
  return_date date,                    -- dia do retorno
  status text NOT NULL DEFAULT 'Ficou pra mais frente' CHECK (status IN ('Deu negócio', 'Ficou pra mais frente', 'Perdido')),
  entry_date date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS public_metric_proposals_user_date_idx
  ON public_metric_proposals (user_id, entry_date DESC);

-- 2) RLS habilitado
ALTER TABLE public_metric_proposals ENABLE ROW LEVEL SECURITY;

-- 3) Acesso anônimo (mesmo padrão das indicações e métricas)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public metric proposals read' AND tablename = 'public_metric_proposals') THEN
    CREATE POLICY "Public metric proposals read" ON public_metric_proposals
      FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public metric proposals insert' AND tablename = 'public_metric_proposals') THEN
    CREATE POLICY "Public metric proposals insert" ON public_metric_proposals
      FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public metric proposals delete' AND tablename = 'public_metric_proposals') THEN
    CREATE POLICY "Public metric proposals delete" ON public_metric_proposals
      FOR DELETE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public metric proposals update' AND tablename = 'public_metric_proposals') THEN
    CREATE POLICY "Public metric proposals update" ON public_metric_proposals
      FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;