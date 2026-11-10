-- Optimizador de Vida (TAOS): ajustes del panel y dispositivos con notificaciones.
-- Pega todo en Supabase › SQL Editor y toca Run. Se puede correr más de una vez.

create table if not exists public.panel_config (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  datos jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- (Versión anterior: la conexión con Google vivía aquí; desde 1.3 se mueve a panel_google, más abajo)
alter table public.panel_config add column if not exists google_refresh_token text;

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

-- Notificaciones: cada dueño solo ve los suyos
alter table public.push_subscriptions enable row level security;
drop policy if exists "Solo el dueño" on public.push_subscriptions;
create policy "Solo el dueño" on public.push_subscriptions for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.push_subscriptions to authenticated, service_role;

-- ===================== Seguridad 1.3 (S03 · S17 · S14) =====================
-- Todo lo que sigue lo usa SOLO el servidor de tu Optimizador (con tu llave secreta). Las tablas tienen RLS
-- encendido y sin permisos para nadie más: aunque otra app vuelva a dar permisos, nadie de fuera las puede leer.

-- Ajustes del panel: solo el servidor (antes también se podían leer desde el navegador con tu sesión)
alter table public.panel_config enable row level security;
drop policy if exists "Solo el dueño" on public.panel_config;
alter table public.panel_config add column if not exists version bigint not null default 0;
grant select, insert, update, delete on public.panel_config to service_role;

-- S03 · La conexión con Google, en su propia tabla (ya no junto con tus ajustes)
create table if not exists public.panel_google (
  user_id uuid primary key references auth.users (id) on delete cascade,
  refresh_token text not null,
  updated_at timestamptz not null default now()
);
insert into public.panel_google (user_id, refresh_token)
  select user_id, google_refresh_token from public.panel_config where google_refresh_token is not null
  on conflict (user_id) do nothing;
update public.panel_config c set google_refresh_token = null
  where c.google_refresh_token is not null and exists (select 1 from public.panel_google g where g.user_id = c.user_id);

-- S17 · Intentos de contraseña: un solo contador para todos los servidores (clave = huella de instalación + dirección,
-- nunca la dirección en claro)
create table if not exists public.panel_intentos (
  clave text primary key,
  fallos integer not null default 0,
  ventana_desde timestamptz not null default now(),
  bloqueado_hasta timestamptz,
  actualizado timestamptz not null default now()
);

-- S14 · Guardados que no se pisan: cada guardado queda anotado (si se repite, no se aplica dos veces)
create table if not exists public.panel_operaciones (
  user_id uuid not null references auth.users (id) on delete cascade,
  op_id text not null,
  huella text,
  version bigint,
  creado timestamptz not null default now(),
  primary key (user_id, op_id)
);

-- S14 · Despertador de medicinas: una sola revisión por turno de 15 minutos (ranura = turno mod 192, 2 días)
create table if not exists public.panel_tick_ejecuciones (
  user_id uuid not null references auth.users (id) on delete cascade,
  ranura integer not null,
  slot bigint not null,
  estado text not null,
  lease_token uuid not null,
  lease_hasta timestamptz not null,
  intentos integer not null default 1,
  jti text,
  detalle text,
  actualizado timestamptz not null default now(),
  primary key (user_id, ranura)
);

-- S14 · Cada aviso de medicina por celular: se aparta antes de mandarlo, así dos revisiones no lo mandan juntas
create table if not exists public.panel_medicina_avisos (
  user_id uuid not null references auth.users (id) on delete cascade,
  medicina_id text not null,
  revision text not null,
  fecha date not null,
  hora text not null,
  dispositivo text not null,
  estado text not null default 'pendiente',
  lease_token uuid,
  lease_hasta timestamptz,
  intentos integer not null default 0,
  proximo timestamptz not null default now(),
  actualizado timestamptz not null default now(),
  primary key (user_id, medicina_id, revision, fecha, hora, dispositivo)
);

do $$
declare t text;
begin
  foreach t in array array['panel_google', 'panel_intentos', 'panel_operaciones', 'panel_tick_ejecuciones', 'panel_medicina_avisos'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
  end loop;
  revoke all on public.panel_config from public, anon, authenticated;
end $$;

-- S17 · Apartar un intento ANTES de revisar la contraseña (atómico). Política: hasta 5 intentos por ventana de
-- 15 minutos; al 5º se bloquea 15 minutos contados desde ese 5º. Devuelve si se permite y cuántos segundos esperar.
create or replace function public.panel_reservar_intento(p_clave text, p_max integer default 5, p_ventana_seg integer default 900, p_bloqueo_seg integer default 900)
returns table (permitido boolean, espera_seg integer)
language plpgsql security invoker set search_path = '' as $$
declare r public.panel_intentos;
begin
  insert into public.panel_intentos (clave) values (p_clave) on conflict (clave) do nothing;
  select * into r from public.panel_intentos i where i.clave = p_clave for update;
  if r.bloqueado_hasta is not null and r.bloqueado_hasta > now() then
    return query select false, greatest(1, ceil(extract(epoch from r.bloqueado_hasta - now()))::integer);
    return;
  end if;
  if r.bloqueado_hasta is not null or r.ventana_desde < now() - make_interval(secs => p_ventana_seg) then
    r.fallos := 0; r.ventana_desde := now(); r.bloqueado_hasta := null;
  end if;
  r.fallos := r.fallos + 1;
  if r.fallos >= p_max then r.bloqueado_hasta := now() + make_interval(secs => p_bloqueo_seg); end if;
  update public.panel_intentos i set fallos = r.fallos, ventana_desde = r.ventana_desde, bloqueado_hasta = r.bloqueado_hasta, actualizado = now()
    where i.clave = p_clave;
  return query select true, 0;
end $$;

-- S17 · Contraseña correcta: se devuelve solo el intento propio (no borra los que otros apartaron al mismo tiempo)
create or replace function public.panel_liberar_intento(p_clave text, p_max integer default 5)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  update public.panel_intentos i set fallos = greatest(i.fallos - 1, 0),
    bloqueado_hasta = case when greatest(i.fallos - 1, 0) < p_max then null else i.bloqueado_hasta end, actualizado = now()
    where i.clave = p_clave;
end $$;

-- S14 · Guardar sin pisar: bloquea tu fila, revisa que nadie la cambió desde que la leíste (versión) y mezcla solo
-- las partes que cambiaste. Si la operación ya se aplicó (mismo op_id), no la repite.
create or replace function public.panel_guardar(p_usuario uuid, p_version bigint, p_cambios jsonb, p_op_id text default null, p_huella text default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_version bigint; v_op public.panel_operaciones;
begin
  if jsonb_typeof(p_cambios) is distinct from 'object' then raise exception 'cambios inválidos'; end if;
  insert into public.panel_config (user_id) values (p_usuario) on conflict (user_id) do nothing;
  select c.version into v_version from public.panel_config c where c.user_id = p_usuario for update;
  if p_op_id is not null then
    select * into v_op from public.panel_operaciones o where o.user_id = p_usuario and o.op_id = p_op_id;
    if found then
      if v_op.huella is distinct from p_huella then return jsonb_build_object('estado', 'conflicto_op'); end if;
      return jsonb_build_object('estado', 'repetida', 'version', v_op.version);
    end if;
  end if;
  if v_version <> p_version then return jsonb_build_object('estado', 'version', 'version', v_version); end if;
  update public.panel_config c set datos = c.datos || p_cambios, version = c.version + 1, updated_at = now() where c.user_id = p_usuario;
  if p_op_id is not null then
    insert into public.panel_operaciones (user_id, op_id, huella, version) values (p_usuario, p_op_id, p_huella, v_version + 1);
  end if;
  return jsonb_build_object('estado', 'ok', 'version', v_version + 1);
end $$;

-- S14 · Tomar el turno de 15 minutos. 'reclamado' = te toca a ti (con tu ficha); 'completado' / 'en_curso' = no repitas.
create or replace function public.panel_tick_reclamar(p_usuario uuid, p_slot bigint, p_jti text, p_lease_seg integer default 120, p_max_intentos integer default 4)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare r public.panel_tick_ejecuciones; v_token uuid := gen_random_uuid(); v_ranura integer := (p_slot % 192)::integer;
begin
  insert into public.panel_tick_ejecuciones (user_id, ranura, slot, estado, lease_token, lease_hasta, intentos, jti)
    values (p_usuario, v_ranura, p_slot, 'en_curso', v_token, now() + make_interval(secs => p_lease_seg), 1, p_jti)
    on conflict (user_id, ranura) do nothing;
  if found then return jsonb_build_object('estado', 'reclamado', 'token', v_token); end if;
  select * into r from public.panel_tick_ejecuciones e where e.user_id = p_usuario and e.ranura = v_ranura for update;
  if r.slot <> p_slot then
    if r.slot > p_slot then return jsonb_build_object('estado', 'viejo'); end if;
    update public.panel_tick_ejecuciones e set slot = p_slot, estado = 'en_curso', lease_token = v_token,
      lease_hasta = now() + make_interval(secs => p_lease_seg), intentos = 1, jti = p_jti, detalle = null, actualizado = now()
      where e.user_id = p_usuario and e.ranura = v_ranura;
    return jsonb_build_object('estado', 'reclamado', 'token', v_token);
  end if;
  if r.estado = 'completado' then return jsonb_build_object('estado', 'completado'); end if;
  if r.estado = 'en_curso' and r.lease_hasta > now() then return jsonb_build_object('estado', 'en_curso'); end if;
  if r.intentos >= p_max_intentos then return jsonb_build_object('estado', 'agotado'); end if;
  update public.panel_tick_ejecuciones e set estado = 'en_curso', lease_token = v_token, lease_hasta = now() + make_interval(secs => p_lease_seg),
    intentos = e.intentos + 1, jti = p_jti, actualizado = now()
    where e.user_id = p_usuario and e.ranura = v_ranura;
  return jsonb_build_object('estado', 'reclamado', 'token', v_token);
end $$;

-- S14 · Terminar el turno (solo quien tiene la ficha vigente puede cerrarlo)
create or replace function public.panel_tick_terminar(p_usuario uuid, p_slot bigint, p_token uuid, p_estado text, p_detalle text default null)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  update public.panel_tick_ejecuciones e set estado = p_estado, detalle = left(p_detalle, 300), actualizado = now()
    where e.user_id = p_usuario and e.ranura = (p_slot % 192)::integer and e.slot = p_slot and e.lease_token = p_token;
  return found;
end $$;

-- S14 · Apartar avisos (toma × celular) antes de mandarlos. Solo se apartan los pendientes cuyo reintento ya toca,
-- o los apartados por una revisión que se cayó (ficha vencida). Nunca dos revisiones el mismo aviso a la vez.
create or replace function public.panel_avisos_reclamar(p_usuario uuid, p_items jsonb, p_token uuid, p_lease_seg integer default 120, p_max_intentos integer default 8)
returns setof public.panel_medicina_avisos language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.panel_medicina_avisos (user_id, medicina_id, revision, fecha, hora, dispositivo)
    select p_usuario, x->>'medicina_id', x->>'revision', (x->>'fecha')::date, x->>'hora', x->>'dispositivo'
    from jsonb_array_elements(p_items) x
    on conflict do nothing;
  return query
  with candidatos as (
    select a.medicina_id, a.revision, a.fecha, a.hora, a.dispositivo
    from public.panel_medicina_avisos a
    join jsonb_array_elements(p_items) x
      on a.medicina_id = x->>'medicina_id' and a.revision = x->>'revision' and a.fecha = (x->>'fecha')::date
      and a.hora = x->>'hora' and a.dispositivo = x->>'dispositivo'
    where a.user_id = p_usuario and a.intentos < p_max_intentos
      and ((a.estado = 'pendiente' and a.proximo <= now()) or (a.estado = 'reservado' and a.lease_hasta < now()))
    for update of a skip locked
  )
  update public.panel_medicina_avisos a set estado = 'reservado', lease_token = p_token,
    lease_hasta = now() + make_interval(secs => p_lease_seg), intentos = a.intentos + 1, actualizado = now()
  from candidatos c
  where a.user_id = p_usuario and a.medicina_id = c.medicina_id and a.revision = c.revision and a.fecha = c.fecha
    and a.hora = c.hora and a.dispositivo = c.dispositivo
  returning a.*;
end $$;

-- S14 · Resultado de cada aviso: 'aceptado' (lo recibió el servicio de notificaciones), 'invalido' (ese celular ya no
-- acepta avisos), 'pendiente' (falló: se reintenta en 15 minutos) o 'cancelado'. Solo con la ficha vigente.
create or replace function public.panel_avisos_acusar(p_usuario uuid, p_token uuid, p_resultados jsonb)
returns integer language plpgsql security invoker set search_path = '' as $$
declare n integer;
begin
  update public.panel_medicina_avisos a set estado = x->>'estado',
    proximo = case when x->>'estado' = 'pendiente' then now() + interval '15 minutes' else a.proximo end,
    lease_token = null, lease_hasta = null, actualizado = now()
  from jsonb_array_elements(p_resultados) x
  where a.user_id = p_usuario and a.lease_token = p_token and a.medicina_id = x->>'medicina_id' and a.revision = x->>'revision'
    and a.fecha = (x->>'fecha')::date and a.hora = x->>'hora' and a.dispositivo = x->>'dispositivo'
    and x->>'estado' in ('aceptado', 'invalido', 'pendiente', 'cancelado');
  get diagnostics n = row_count;
  return n;
end $$;

-- Las funciones solo las puede usar el servidor
do $$
declare f text;
begin
  foreach f in array array[
    'panel_reservar_intento(text, integer, integer, integer)', 'panel_liberar_intento(text, integer)',
    'panel_guardar(uuid, bigint, jsonb, text, text)', 'panel_tick_reclamar(uuid, bigint, text, integer, integer)',
    'panel_tick_terminar(uuid, bigint, uuid, text, text)', 'panel_avisos_reclamar(uuid, jsonb, uuid, integer, integer)',
    'panel_avisos_acusar(uuid, uuid, jsonb)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;
