-- Cold Call: adiciona colunas estruturadas de endereço/empresa e migra o que já foi importado
-- Execute no Supabase SQL Editor

-- 1) Adiciona colunas (idempotente)
ALTER TABLE cold_call_leads
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS opening_date text;

-- 2) Backfill a partir do campo 'notes' (formato: "Cidade: X | Endereço: Y | Empresa: Z | Data: W")
UPDATE cold_call_leads
SET
  city         = TRIM(COALESCE(NULLIF(substring(notes from 'Cidade:\s*([^|]*)'), ''), NULL)),
  address      = TRIM(COALESCE(NULLIF(substring(notes from 'Endereço:\s*([^|]*)'), ''), NULL)),
  company_name = TRIM(COALESCE(NULLIF(substring(notes from 'Empresa:\s*([^|]*)'), ''), NULL)),
  opening_date = TRIM(COALESCE(NULLIF(substring(notes from 'Data:\s*([^|]*)'), ''), NULL))
WHERE notes IS NOT NULL
  AND notes LIKE '%Cidade:%';

-- 3) Confere o resultado (pode rodar de novo para validar depois)
SELECT id, name, phone, city, address, company_name, opening_date
FROM cold_call_leads
LIMIT 20;