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
CREATE POLICY "Allow public read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'payment-receipts');

CREATE POLICY "Allow authenticated insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'payment-receipts' AND auth.role() = 'authenticated');

CREATE POLICY "Allow gestor delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'payment-receipts');
