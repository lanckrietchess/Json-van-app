-- LC78 (build 9.38.3): e-books as PDF files, uploaded from the app by the owner. Idempotent.
-- A public Storage bucket "lc78-books" (only the owner can upload, replace or delete). File names are random; the link is only given to
-- people with access to the item (lc70_open), but anyone who gets the link can open the file.
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public) values ('lc78-books','lc78-books',true) on conflict (id) do update set public = true;
    begin execute 'update storage.buckets set file_size_limit = 52428800, allowed_mime_types = array[''application/pdf''] where id = ''lc78-books'''; exception when others then null; end;
  end if;
  if to_regclass('storage.objects') is not null then
    execute 'drop policy if exists lc78_books_insert on storage.objects';
    execute 'drop policy if exists lc78_books_update on storage.objects';
    execute 'drop policy if exists lc78_books_delete on storage.objects';
    execute 'create policy lc78_books_insert on storage.objects for insert to authenticated with check (bucket_id = ''lc78-books'' and public._lc72_admin())';
    execute 'create policy lc78_books_update on storage.objects for update to authenticated using (bucket_id = ''lc78-books'' and public._lc72_admin())';
    execute 'create policy lc78_books_delete on storage.objects for delete to authenticated using (bucket_id = ''lc78-books'' and public._lc72_admin())';
  end if;
exception when others then raise notice 'lc78: bucket/policies not created (%). Create a public bucket lc78-books in Storage by hand.', sqlerrm;
end $$;
