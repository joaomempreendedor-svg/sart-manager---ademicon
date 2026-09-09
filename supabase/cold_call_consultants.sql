-- Cold Call: consultores desacoplados de team_members
-- Execute no Supabase SQL Editor
-- O gestor cadastra os consultores manualmente na tela de Cold Call.
-- user_id é o id em auth.users (garante FK válida em cold_call_leads.user_id / cold_call_logs.user_id).

CREATE TABLE IF NOT EXISTS public.cold_call_consultants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  name text NOT NULL,
  email text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: leitura pública (páginas de operação e TV), escrita apenas para usuários autenticados (gestor).
ALTER TABLE public.cold_call_consultants ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Cold call consultants public select' AND tablename = 'cold_call_consultants') THEN
    CREATE POLICY "Cold call consultants public select" ON cold_call_consultants
      FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Cold call consultants authenticated insert' AND tablename = 'cold_call_consultants') THEN
    CREATE POLICY "Cold call consultants authenticated insert" ON cold_call_consultants
      FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Cold call consultants authenticated update' AND tablename = 'cold_call_consultants') THEN
    CREATE POLICY "Cold call consultants authenticated update" ON cold_call_consultants
      FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Cold call consultants authenticated delete' AND tablename = 'cold_call_consultants') THEN
    CREATE POLICY "Cold call consultants authenticated delete" ON cold_call_consultants
      FOR DELETE USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Seed: popula a partir dos consultores atuais que já possuem autenticação válida
-- (roles de cold call em team_members + qualquer user_id presente em cold_call_leads/logs).
INSERT INTO public.cold_call_consultants (user_id, name, email, is_active)
SELECT DISTINCT ON (uid) uid, name, email, true
FROM (
  SELECT
    (tm.data->>'authUserId')::uuid AS uid,
    tm.data->>'name' AS name,
    tm.data->>'email' AS email
  FROM public.team_members tm
  WHERE tm.user_id = '0c6d71b7-daeb-4dde-8eec-0e7a8ffef658'
    AND (tm.data->>'authUserId') IS NOT NULL
    AND ((tm.data->>'isActive') IS NULL OR (tm.data->>'isActive')::boolean IS NOT FALSE)
    AND ((tm.data->'roles') ? 'CONSULTOR' OR (tm.data->'roles') ? 'PRÉVIA' OR (tm.data->'roles') ? 'AUTORIZADO')
    AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id = (tm.data->>'authUserId')::uuid)
  UNION
  SELECT DISTINCT
    cc.user_id AS uid,
    COALESCE(p.first_name || ' ' || NULLIF(p.last_name, ''), NULLIF(p.first_name, ''), 'Consultor') AS name,
    au.email AS email
  FROM (
    SELECT user_id FROM public.cold_call_leads WHERE user_id IS NOT NULL
    UNION
    SELECT user_id FROM public.cold_call_logs WHERE user_id IS NOT NULL
  ) cc
  LEFT JOIN auth.users au ON au.id = cc.user_id
  LEFT JOIN public.profiles p ON p.id = cc.user_id
  WHERE cc.user_id IS NOT NULL
) src
WHERE uid IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;