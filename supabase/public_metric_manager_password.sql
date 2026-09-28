create table if not exists public_metric_manager_password (
  user_id text primary key,
  password text not null,
  updated_at timestamptz not null default now()
);

alter table public_metric_manager_password enable row level security;

drop policy if exists "anon read manager password" on public_metric_manager_password;
create policy "anon read manager password" on public_metric_manager_password
  for select using (true);

drop policy if exists "owner write manager password" on public_metric_manager_password;
create policy "owner write manager password" on public_metric_manager_password
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());