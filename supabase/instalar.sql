-- Panel de Vida (TAOS): ajustes del panel y dispositivos con notificaciones.
-- Pega todo en Supabase › SQL Editor y toca Run. Se puede correr más de una vez.

create table if not exists public.panel_config (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  datos jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- Notificaciones push: tabla compartida por las apps TAOS
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  app text not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  dispositivo text,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_app on public.push_subscriptions (user_id, app);

do $$
declare t text;
begin
  foreach t in array array['panel_config', 'push_subscriptions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Solo el dueño" on public.%I', t);
    execute format('create policy "Solo el dueño" on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated, service_role', t);
  end loop;
end $$;
