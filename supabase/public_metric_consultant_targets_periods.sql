-- Metas por consultor por período (diária/semanal/mensal) das métricas diárias (/metricas/:ownerId)
-- Execute no Supabase SQL Editor.
-- target_value continua sendo a meta MENSAL (compatibilidade).
-- As novas colunas guardam a meta DIÁRIA e SEMANAL de cada consultor por métrica.

ALTER TABLE public_metric_consultant_targets
  ADD COLUMN IF NOT EXISTS daily_target_value numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weekly_target_value numeric NOT NULL DEFAULT 0;