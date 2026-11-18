-- LC94 (9.58.0): the funnel. One row per device per step; the primary key is also the rate limit (a step counts once per device).
-- The app and the landing page call lc94_step (anon); the Stripe function adds the last step ('paid') on the same device id.
-- The owner reads it with lc94_report (admin only, through public.is_admin()).
-- Run once in the Supabase SQL editor. Safe to run again.

create table if not exists public.lc94_funnel (
  aid  text not null,
  step text not null,
  src  text,
  t    timestamptz not null default now(),
  primary key (aid, step),
  constraint lc94_funnel_step check (step in ('landing','iab_open','first_open','name_entered','first_review_done','signed_in',
                                              'install','day2_return','paywall_seen','checkout_started','paid')),
  constraint lc94_funnel_aid check (aid ~ '^[A-Za-z0-9_-]{8,64}$'),
  constraint lc94_funnel_src check (src is null or src ~ '^[a-z0-9_.-]{1,40}$')
);
alter table public.lc94_funnel enable row level security;   -- no policies: only through the functions below
create index if not exists lc94_funnel_t on public.lc94_funnel (t);
revoke all on table public.lc94_funnel from anon, authenticated;

create or replace function public.lc94_step(p_aid text, p_step text, p_src text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_src text := nullif(left(regexp_replace(lower(coalesce(p_src, '')), '[^a-z0-9_.-]', '', 'g'), 40), '');
begin
  if p_aid is null or p_aid !~ '^[A-Za-z0-9_-]{8,64}$' then return; end if;
  if p_step is null or p_step = 'paid' then return; end if;   -- 'paid' only comes from the Stripe function (service role)
  insert into public.lc94_funnel (aid, step, src) values (p_aid, p_step, v_src) on conflict do nothing;
exception when check_violation then return;   -- an unknown step name: ignored
end $$;
revoke all on function public.lc94_step(text, text, text) from public;
grant execute on function public.lc94_step(text, text, text) to anon, authenticated;

-- the owner's view: players per step and per source, over the last p_days days (1 to 90)
create or replace function public.lc94_report(p_days int default 14)
returns table (step text, src text, players bigint)
language sql security definer set search_path = public, pg_temp as $$
  select f.step, coalesce(f.src, '(none)'), count(*)
  from public.lc94_funnel f
  where public.is_admin() and f.t > now() - make_interval(days => least(greatest(coalesce(p_days, 14), 1), 90))
  group by 1, 2
  order by array_position(array['landing','iab_open','first_open','name_entered','first_review_done','signed_in',
                                'install','day2_return','paywall_seen','checkout_started','paid'], f.step), 3 desc
$$;
revoke all on function public.lc94_report(int) from public;
grant execute on function public.lc94_report(int) to authenticated;

-- check after running: select * from public.lc94_report(14);   (signed in as the owner in the app, or as postgres here: is_admin() is false for postgres, so use)
--   select step, coalesce(src,'(none)') src, count(*) from public.lc94_funnel where t > now() - interval '14 days' group by 1, 2 order by 1, 3 desc;
