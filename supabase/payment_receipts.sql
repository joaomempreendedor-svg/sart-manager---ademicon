-- Execute no Supabase SQL Editor antes de usar a funcionalidade

-- 1. Criar tabela de comprovantes
CREATE TABLE IF NOT EXISTS payment_receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gestor_id TEXT NOT NULL,
  consultant_name TEXT NOT NULL,
  competence_month TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criar bucket de storage para comprovantes
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-receipts', 'payment-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Policies de acesso (storage)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read access' AND tablename = 'objects') THEN
    CREATE POLICY "Allow public read access" ON storage.objects
      FOR SELECT USING (bucket_id = 'payment-receipts');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access' AND tablename = 'objects') THEN
    CREATE POLICY "Allow all access" ON storage.objects
      FOR ALL USING (bucket_id = 'payment-receipts');
  END IF;
END $$;

-- 4. Enable RLS
ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all on payment_receipts') THEN
    CREATE POLICY "Allow all on payment_receipts" ON payment_receipts
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
