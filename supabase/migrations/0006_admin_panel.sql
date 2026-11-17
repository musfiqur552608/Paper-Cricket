-- ═══════════════════════════════════════════════════════════════════════════════
--  PAPER CRICKET · কাগজের ক্রিকেট
--  Migration 0006 — admin panel: notices, SEO settings, dashboard stats.
--
--  Design notes
--  ────────────
--  • The app currently signs users in anonymously. Admin access is gated by a
--    rotating secret stored in `admin_secrets` and validated inside each
--    security-definer RPC. The secret is set in `VITE_ADMIN_SECRET` on the
--    client and compared server-side.
--  • All admin RPCs are SECURITY DEFINER so they can read every room/player/
--    ball row regardless of the per-member RLS policies.
--  • `admin_notices` is readable by any authenticated user so the client can
--    show an active site notice. Writes go through admin RPCs only.
-- ═══════════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto with schema extensions;

-- ── Tables ──────────────────────────────────────────────────────────────────

create table if not exists public.admin_notices (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 600),
  type text not null default 'info' check (type in ('info', 'success', 'warning', 'error')),
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_seo_settings (
  page_path text primary key check (char_length(page_path) between 1 and 200),
  title text check (char_length(title) between 1 and 160),
  description text check (char_length(description) between 1 and 300),
  og_image text,
  updated_at timestamptz not null default now()
);

-- Rotating admin access secret. Only security-definer functions read this.
create table if not exists public.admin_secrets (
  secret text primary key,
  created_at timestamptz not null default now()
);

insert into public.admin_secrets (secret)
values ('paper-cricket-admin-change-me')
on conflict (secret) do nothing;

-- ── Privileges & row-level security ─────────────────────────────────────────

alter table public.admin_notices enable row level security;
alter table public.admin_seo_settings enable row level security;
alter table public.admin_secrets enable row level security;

revoke all on table public.admin_notices from anon, authenticated;
revoke all on table public.admin_seo_settings from anon, authenticated;
revoke all on table public.admin_secrets from anon, authenticated;

-- Any authenticated user may read active notices (shown as a site banner).
create policy "public read active notices" on public.admin_notices
  for select to authenticated
  using (is_active = true and (expires_at is null or expires_at > now()));

-- SEO settings are readable by any authenticated user (the client merges them
-- into <head>). Writes go through admin RPCs only.
create policy "public read seo settings" on public.admin_seo_settings
  for select to authenticated
  using (true);

-- No direct table access for admin_secrets: validated inside RPCs only.

-- ── Admin RPCs (security definer → bypasses per-member RLS) ─────────────────

create or replace function public.admin_dashboard_stats(p_secret text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_ok boolean;
  v_total_hours numeric;
begin
  select exists (select 1 from public.admin_secrets where secret = p_secret) into v_ok;
  if not v_ok then raise exception 'ADMIN_ACCESS_DENIED'; end if;

  select coalesce(sum(extract(epoch from (coalesce(finished_at, now()) - created_at)) / 3600.0), 0)
  into v_total_hours
  from public.rooms
  where created_at >= now() - interval '1 year';

  return jsonb_build_object(
    'totalRooms', (select count(*) from public.rooms),
    'roomsLive', (select count(*) from public.rooms where status = 'live'),
    'roomsLobby', (select count(*) from public.rooms where status = 'lobby'),
    'roomsFinished', (select count(*) from public.rooms where status = 'finished'),
    'roomsAbandoned', (select count(*) from public.rooms where status = 'abandoned'),
    'totalPlayers', (select count(*) from public.room_players where left_at is null),
    'playersToday', (select count(*) from public.room_players where joined_at >= now() - interval '1 day' and left_at is null),
    'playersWeek', (select count(*) from public.room_players where joined_at >= now() - interval '7 days' and left_at is null),
    'playersMonth', (select count(*) from public.room_players where joined_at >= now() - interval '30 days' and left_at is null),
    'playersYear', (select count(*) from public.room_players where joined_at >= now() - interval '365 days' and left_at is null),
    'totalMatches', (select count(*) from public.rooms where status in ('finished', 'abandoned')),
    'matchesToday', (select count(*) from public.rooms where status in ('finished', 'abandoned') and finished_at >= now() - interval '1 day'),
    'matchesWeek', (select count(*) from public.rooms where status in ('finished', 'abandoned') and finished_at >= now() - interval '7 days'),
    'matchesMonth', (select count(*) from public.rooms where status in ('finished', 'abandoned') and finished_at >= now() - interval '30 days'),
    'matchesYear', (select count(*) from public.rooms where status in ('finished', 'abandoned') and finished_at >= now() - interval '365 days'),
    'totalBalls', (select count(*) from public.balls),
    'totalRuns', (select coalesce(sum(runs), 0) from public.innings),
    'totalWickets', (select coalesce(sum(wickets), 0) from public.innings),
    'totalSixes', (select count(*) from public.balls where outcome = '6'),
    'totalFours', (select count(*) from public.balls where outcome = '4'),
    'totalNoBalls', (select count(*) from public.balls where outcome = 'N'),
    'totalWides', (select count(*) from public.balls where outcome = 'W'),
    'totalHours', round(v_total_hours::numeric, 2),
    'hoursToday', round(coalesce((
      select sum(extract(epoch from (coalesce(finished_at, now()) - created_at)) / 3600.0)
      from public.rooms where created_at >= now() - interval '1 day'
    ), 0)::numeric, 2),
    'hoursWeek', round(coalesce((
      select sum(extract(epoch from (coalesce(finished_at, now()) - created_at)) / 3600.0)
      from public.rooms where created_at >= now() - interval '7 days'
    ), 0)::numeric, 2),
    'hoursMonth', round(coalesce((
      select sum(extract(epoch from (coalesce(finished_at, now()) - created_at)) / 3600.0)
      from public.rooms where created_at >= now() - interval '30 days'
    ), 0)::numeric, 2),
    'generatedAt', now()
  );
end;
$$;

create or replace function public.admin_rooms_all(p_secret text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_ok boolean;
begin
  select exists (select 1 from public.admin_secrets where secret = p_secret) into v_ok;
  if not v_ok then raise exception 'ADMIN_ACCESS_DENIED'; end if;

  return (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'code', r.code,
        'status', r.status,
        'phase', r.phase,
        'overs', r.overs,
        'wickets', r.wickets,
        'playerCount', pc.cnt,
        'lastActiveAt', r.last_active_at,
        'createdAt', r.created_at,
        'startedAt', r.started_at,
        'finishedAt', r.finished_at,
        'winnerUserId', r.winner_user_id
      ) order by r.last_active_at desc nulls last, r.created_at desc
    ), '[]'::jsonb)
    from public.rooms r
    left join lateral (
      select count(*) as cnt
      from public.room_players p
      where p.room_id = r.id and p.left_at is null
    ) pc on true
  );
end;
$$;

create or replace function public.admin_notices_list(p_secret text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_ok boolean;
begin
  select exists (select 1 from public.admin_secrets where secret = p_secret) into v_ok;
  if not v_ok then raise exception 'ADMIN_ACCESS_DENIED'; end if;

  return (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', id,
        'title', title,
        'body', body,
        'type', type,
        'isActive', is_active,
        'expiresAt', expires_at,
        'createdAt', created_at,
        'updatedAt', updated_at
      ) order by created_at desc
    ), '[]'::jsonb)
    from public.admin_notices
  );
end;
$$;

create or replace function public.admin_notice_save(
  p_secret text,
  p_id uuid default null,
  p_title text,
  p_body text,
  p_type text,
  p_is_active boolean,
  p_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_ok boolean;
  v_id uuid;
begin
  select exists (select 1 from public.admin_secrets where secret = p_secret) into v_ok;
  if not v_ok then raise exception 'ADMIN_ACCESS_DENIED'; end if;

  if p_id is not null then
    update public.admin_notices
    set title = p_title,
        body = p_body,
        type = coalesce(p_type, 'info'),
        is_active = coalesce(p_is_active, true),
        expires_at = p_expires_at,
        updated_at = now()
    where id = p_id
    returning id into v_id;
  else
    insert into public.admin_notices (title, body, type, is_active, expires_at)
    values (p_title, p_body, coalesce(p_type, 'info'), coalesce(p_is_active, true), p_expires_at)
    returning id into v_id;
  end if;

  return jsonb_build_object('id', v_id);
end;
$$;

create or replace function public.admin_notice_delete(p_secret text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_ok boolean;
begin
  select exists (select 1 from public.admin_secrets where secret = p_secret) into v_ok;
  if not v_ok then raise exception 'ADMIN_ACCESS_DENIED'; end if;

  delete from public.admin_notices where id = p_id;
end;
$$;

create or replace function public.admin_seo_list(p_secret text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_ok boolean;
begin
  select exists (select 1 from public.admin_secrets where secret = p_secret) into v_ok;
  if not v_ok then raise exception 'ADMIN_ACCESS_DENIED'; end if;

  return (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'pagePath', page_path,
        'title', title,
        'description', description,
        'ogImage', og_image,
        'updatedAt', updated_at
      ) order by page_path
    ), '[]'::jsonb)
    from public.admin_seo_settings
  );
end;
$$;

create or replace function public.admin_seo_save(
  p_secret text,
  p_page_path text,
  p_title text default null,
  p_description text default null,
  p_og_image text default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_ok boolean;
begin
  select exists (select 1 from public.admin_secrets where secret = p_secret) into v_ok;
  if not v_ok then raise exception 'ADMIN_ACCESS_DENIED'; end if;

  insert into public.admin_seo_settings (page_path, title, description, og_image, updated_at)
  values (p_page_path, p_title, p_description, p_og_image, now())
  on conflict (page_path) do update
  set title = coalesce(excluded.title, public.admin_seo_settings.title),
      description = coalesce(excluded.description, public.admin_seo_settings.description),
      og_image = coalesce(excluded.og_image, public.admin_seo_settings.og_image),
      updated_at = now();
end;
$$;

-- ── Grants ──────────────────────────────────────────────────────────────────

grant execute on function public.admin_dashboard_stats(text) to authenticated;
grant execute on function public.admin_rooms_all(text) to authenticated;
grant execute on function public.admin_notices_list(text) to authenticated;
grant execute on function public.admin_notice_save(text, uuid, text, text, text, boolean, timestamptz) to authenticated;
grant execute on function public.admin_notice_delete(text, uuid) to authenticated;
grant execute on function public.admin_seo_list(text) to authenticated;
grant execute on function public.admin_seo_save(text, text, text, text, text) to authenticated;