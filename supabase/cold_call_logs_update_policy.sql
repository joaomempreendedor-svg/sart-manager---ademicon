-- Cold Call: permite editar o resultado de uma ligação realizada (página pública, sem login)
-- Execute no Supabase SQL Editor

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Cold call public update cold_call_logs' AND tablename = 'cold_call_logs') THEN
    CREATE POLICY "Cold call public update cold_call_logs" ON cold_call_logs
      FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;