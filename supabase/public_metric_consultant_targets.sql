-- Metas por consultor das métricas diárias (/metricas/:ownerId)
-- Execute no Supabase SQL Editor
-- Mesmo padrão das demais tabelas públicas: leitura/escrita anônima,
-- filtrando por user_id (ownerId da URL) no app.

CREATE TABLE IF NOT EXISTS public_metric_consultant_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,               -- gestor dono do painel
  consultant_id uuid NOT NULL,         -- consultor da meta
  metric_config_id uuid NOT NULL,      -- métrica (daily_metrics_config.id)
  target_value numeric NOT NULL DEFAULT 0,
  updated_at timestamz NOT NULL DEFAULT now(),
  UNIQUE (consultant_id, metric_config_id)
);

CREATE INDEX IF NOT EXISTS public_metric_consultant_targets_user_idx
  ON public_metric_consultant_targets (user_id);

ALTER TABLE public_metric_consultant_targets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public metric consultant targets read' AND tablename = 'public_metric_consultant_targets') THEN
    CREATE POLICY "Public metric consultant targets read" ON public_metric_consultant_targets
      FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public metric consultant targets insert' AND tablename = 'public_metric_consultant_targets') THEN
    CREATE POLICY "Public metric consultant targets insert" ON public_metric_consultant_targets
      FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public metric consultant targets update' AND tablename = 'public_metric_consultant_targets') THEN
    CREATE POLICY "Public metric consultant targets update" ON public_metric_consultant_targets
      FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public metric consultant targets delete' AND tablename = 'public_metric_consultant_targets') THEN
    CREATE POLICY "Public metric consultant targets delete" ON public_metric_consultant_targets
      FOR DELETE USING (true);
  END IF;
END $$;