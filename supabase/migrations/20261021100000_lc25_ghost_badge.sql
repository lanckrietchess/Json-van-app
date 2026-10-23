-- Lanckrietchess hub 9.3.0 (v25): the week-one "Ghost Slayer" badge.
-- Additive and idempotent: safe to run twice. Nothing existing is changed or dropped.
--
-- Pillar 8 needs NO SQL: lc_plan_days (monthly 30 / yearly 365), lc_skool_purchase_guard and
-- lc_skool_purchase_perks (3 Golden Tickets on a Tier 3 yearly purchase) already exist and were verified read-only.

insert into public.lc7_badge_defs (code, label, description, kind, sort)
values ('ghost_slayer', 'Ghost Slayer',
        'Out-trained the Lanckriet-student ghost in the first week. Only available in a member''s first week, never again.',
        'special', 80)
on conflict (code) do nothing;

-- The hub calls this through V71.member('lc25_ghost_claim', {p_xp}), which adds p_id and p_token.
create or replace function public.lc25_ghost_claim(p_id uuid, p_token text, p_xp integer default 0)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_created timestamptz;
  v_n integer;
begin
  if public.lc7_auth(p_id, p_token) is null then
    return jsonb_build_object('ok', false, 'error', 'auth');
  end if;

  select created_at into v_created from public.lc7_members where id = p_id;
  -- Unrepeatable and week-one only: 7 days plus one day of grace for clocks and time zones.
  if v_created is null or v_created < now() - interval '8 days' then
    return jsonb_build_object('ok', false, 'error', 'too_late');
  end if;
  -- A cheap sanity floor: a real claim comes with a real XP gain (the goal in the hub is 600).
  if coalesce(p_xp, 0) < 300 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  insert into public.lc7_member_badges (member_id, badge_code)
  values (p_id, 'ghost_slayer')
  on conflict do nothing;
  get diagnostics v_n = row_count;

  return jsonb_build_object('ok', true, 'new', v_n > 0);
end
$$;

revoke all on function public.lc25_ghost_claim(uuid, text, integer) from public;
grant execute on function public.lc25_ghost_claim(uuid, text, integer) to anon, authenticated;
