-- Cold Call: acesso público sem login (página de operação dos consultores)
-- Execute no Supabase SQL Editor
-- Consultores acessam /cold-call/:ownerId, escolhem o nome e marcam resultados — sem login.

-- 1) Permitir leitura anônima de team_members (lista de consultores para o dropdown)
--    Assim o consultor não precisa de conta; ele escolhe o próprio nome como na página de Resultados Diários.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Cold call public read team_members' AND tablename = 'team_members') THEN
    CREATE POLICY "Cold call public read team_members" ON team_members
      FOR SELECT USING (true);
  END IF;
END $$;

-- 2) Acesso anônimo aos leads de cold call (ler para montar a fila "Próximo lead" e atualizar etapa)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Cold call public read cold_call_leads' AND tablename = 'cold_call_leads') THEN
    CREATE POLICY "Cold call public read cold_call_leads" ON cold_call_leads
      FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Cold call public update cold_call_leads' AND tablename = 'cold_call_leads') THEN
    CREATE POLICY "Cold call public update cold_call_leads" ON cold_call_leads
      FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 3) Acesso anônimo aos registros de ligação (o consultor lança o resultado sem login)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Cold call public read cold_call_logs' AND tablename = 'cold_call_logs') THEN
    CREATE POLICY "Cold call public read cold_call_logs" ON cold_call_logs
      FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Cold call public insert cold_call_logs' AND tablename = 'cold_call_logs') THEN
    CREATE POLICY "Cold call public insert cold_call_logs" ON cold_call_logs
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- 4) Leitura anônima SOMENTE das metas de cold call (necessário para o painel de TV do gestor).
--    Usa uma função SECURITY DEFINER que expõe apenas o campo coldCallGoals do app_config,
--    sem abrir a tabela inteira para o público. Execute após rodar os itens 1–3.
CREATE OR REPLACE FUNCTION get_cold_call_goals(p_user uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT data->'coldCallGoals' FROM app_config WHERE user_id = p_user LIMIT 1),
    '{"calls":80,"contacts":30,"interested":5,"meetings":3}'::jsonb
  );
$$;

REVOKE ALL ON FUNCTION get_cold_call_goals(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_cold_call_goals(uuid) TO anon, authenticated;