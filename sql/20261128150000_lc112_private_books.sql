-- LC112 (build 9.84.0): e-books in a PRIVATE Storage bucket. Idempotent.
-- Before: lc78-books was a public bucket. The address was only given to people with access (lc70_open), but anyone who got the
-- address (a forwarded link, a group chat) could download the PDF for ever.
-- Now: the stored address stays the same (…/object/public/lc78-books/<path>, used as the file's name), the app asks Storage for a
-- signed link of one hour before it opens (LC70.signBook), and Storage only signs it when the caller may read that item: the owner,
-- or anybody for whom public._lc70_why() gives a reason (free item, bought, Pro / VIP included). Upload / replace / delete stay owner-only
-- (lc78 policies).
-- Part 1 (the function and the read policy) is harmless on a public bucket and can run first. Part 2 makes the bucket private: run it
-- after the app with LC70.signBook (9.84.0) is live, otherwise the old app opens the plain address and gets "not found".

-- Part 1 -----------------------------------------------------------------------------------------------------------------------
create or replace function public._lc112_book_ok(p_name text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare v_email text := coalesce(public._lc26_email(),''); v_admin boolean := public._lc70_admin(); v_tier int;
begin
  if v_admin then return true; end if;
  if coalesce(p_name,'') = '' then return false; end if;
  v_tier := public._lc70_tier(v_email);
  return exists (
    select 1 from public.lc70_items i
     where i.status = 'live'
       and substring(i.ebook_url from '/lc78-books/([^?#]+)') = p_name
       and public._lc70_why(i, v_email, v_tier, false) is not null);
exception when others then return false;
end $$;
revoke all on function public._lc112_book_ok(text) from public;
grant execute on function public._lc112_book_ok(text) to anon, authenticated;

do $$
begin
  if to_regclass('storage.objects') is not null then
    execute 'drop policy if exists lc112_books_read on storage.objects';
    execute 'create policy lc112_books_read on storage.objects for select to anon, authenticated using (bucket_id = ''lc78-books'' and public._lc112_book_ok(name))';
  end if;
end $$;

-- Part 2 (after 9.84.0 is live) ------------------------------------------------------------------------------------------------
update storage.buckets set public = false where id = 'lc78-books';
