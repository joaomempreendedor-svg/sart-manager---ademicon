-- Execute no Supabase SQL Editor

-- Adiciona coluna de horário agendado nas tarefas (atividades da secretaria)
DO $$ BEGIN
  ALTER TABLE gestor_tasks ADD COLUMN scheduled_time TIME;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;