-- Execute no Supabase SQL Editor

-- 1. Criar tabela
CREATE TABLE IF NOT EXISTS payment_receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gestor_id TEXT NOT NULL,
  consultant_name TEXT NOT NULL,
  competence_month TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Colunas extras se tabela já existia
DO $$ BEGIN ALTER TABLE payment_receipts ADD COLUMN file_url TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE payment_receipts DROP COLUMN IF EXISTS file_path; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE payment_receipts DROP COLUMN IF EXISTS file_data; EXCEPTION WHEN others THEN NULL; END $$;

-- 3. RLS da tabela
ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all receipts') THEN
    CREATE POLICY "Allow all receipts" ON payment_receipts FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 4. Bucket de storage (cria se não existe)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('payment-receipts', 'payment-receipts', true, 5242880, ARRAY['image/*','application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- 5. Policies do bucket
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read receipts' AND tablename = 'objects') THEN
    CREATE POLICY "Public read receipts" ON storage.objects
      FOR SELECT USING (bucket_id = 'payment-receipts');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Upload receipts' AND tablename = 'objects') THEN
    CREATE POLICY "Upload receipts" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'payment-receipts');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Delete receipts' AND tablename = 'objects') THEN
    CREATE POLICY "Delete receipts" ON storage.objects
      FOR DELETE USING (bucket_id = 'payment-receipts');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Update receipts' AND tablename = 'objects') THEN
    CREATE POLICY "Update receipts" ON storage.objects
      FOR UPDATE USING (bucket_id = 'payment-receipts');
  END IF;
END $$;
