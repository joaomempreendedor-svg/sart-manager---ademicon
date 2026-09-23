-- Indicações do link público de métricas diárias (/metricas/:ownerId)
-- Execute no Supabase SQL Editor
-- O consultor registra indicações (nome + telefone) e visualiza na aba "Indicações" — sem login.

-- 1) Tabela de indicações
CREATE TABLE IF NOT EXISTS public_metric_indications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,               -- gestor dono do painel (ownerId da URL)
  consultant_id uuid NOT NULL,         -- consultor que registrou a indicação
  name text NOT NULL,                  -- nome da pessoa indicada
  phone text,                          -- telefone (opcional)
  entry_date date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS public_metric_indications_user_date_idx
  ON public_metric_indications (user_id, entry_date DESC);

-- 2) RLS habilitado
ALTER TABLE public_metric_indications ENABLE ROW LEVEL SECURITY;

-- 3) Acesso anônimo (mesmo padrão das métricas e da página pública de cold call)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public metric indications read' AND tablename = 'public_metric_indications') THEN
    CREATE POLICY "Public metric indications read" ON public_metric_indications
      FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public metric indications insert' AND tablename = 'public_metric_indications') THEN
    CREATE POLICY "Public metric indications insert" ON public_metric_indications
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;