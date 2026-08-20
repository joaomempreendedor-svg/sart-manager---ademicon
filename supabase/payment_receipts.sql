-- Execute no Supabase SQL Editor

-- 1. Criar tabela (se não existir)
CREATE TABLE IF NOT EXISTS payment_receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gestor_id TEXT NOT NULL,
  consultant_name TEXT NOT NULL,
  competence_month TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Adicionar coluna file_url se a tabela já existia com file_data/file_path
DO $$ BEGIN
  ALTER TABLE payment_receipts ADD COLUMN file_url TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 3. Remover colunas antigas
DO $$ BEGIN
  ALTER TABLE payment_receipts DROP COLUMN IF EXISTS file_path;
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE payment_receipts DROP COLUMN IF EXISTS file_data;
EXCEPTION WHEN others THEN NULL;
END $$;

-- 4. RLS
ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all receipts') THEN
    CREATE POLICY "Allow all receipts" ON payment_receipts
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
