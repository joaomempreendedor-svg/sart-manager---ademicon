-- Cold Call: permite INSERT em cold_call_leads para o gestor autenticado
-- (o import divide os leads entre consultores, com user_id diferente do auth.uid())
-- Execute no Supabase SQL Editor

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Cold call authenticated insert cold_call_leads' AND tablename = 'cold_call_leads') THEN
    CREATE POLICY "Cold call authenticated insert cold_call_leads" ON cold_call_leads
      FOR INSERT TO authenticated
      WITH CHECK (true);
  END IF;
END $$;