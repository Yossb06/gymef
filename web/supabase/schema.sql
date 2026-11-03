-- GymE&F web: ejecutar una vez en Supabase → SQL Editor → New query → Run.
-- Cada registro de la app (perfil, rutina, serie…) es una fila JSON propiedad de la cuenta que inició sesión.

create table if not exists public.gym_records (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  kind       text        not null,
  id         text        not null,
  data       jsonb       not null,
  deleted    boolean     not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, id)
);
create index if not exists gym_records_sync on public.gym_records (user_id, updated_at);

-- Último cambio gana: se ignora una escritura más antigua (por data._u, hora del dispositivo)
-- que la ya guardada, y updated_at siempre lo pone el servidor para la sincronización.
create or replace function public.gym_records_merge() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' and coalesce((old.data ->> '_u')::bigint, 0) > coalesce((new.data ->> '_u')::bigint, 0) then
    return old;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists gym_records_merge on public.gym_records;
create trigger gym_records_merge before insert or update on public.gym_records
  for each row execute function public.gym_records_merge();

alter table public.gym_records enable row level security;
drop policy if exists "own records" on public.gym_records;
create policy "own records" on public.gym_records for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Fotos de progreso: bucket privado, cada cuenta solo ve su carpeta <user_id>/.
insert into storage.buckets (id, name, public) values ('gym-photos', 'gym-photos', false)
  on conflict (id) do nothing;
drop policy if exists "own photos" on storage.objects;
create policy "own photos" on storage.objects for all to authenticated
  using (bucket_id = 'gym-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'gym-photos' and (storage.foldername(name))[1] = auth.uid()::text);
