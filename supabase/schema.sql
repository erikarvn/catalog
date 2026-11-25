-- Río Rosa · esquema do catálogo
-- Cole este arquivo inteiro em Supabase → SQL Editor → Run.
-- Pode executar de novo: recria as regras sem apagar os sabonetes.
--
-- Não copie a chave service_role para o site. O catálogo usa só a chave anon ou publishable.
-- As regras abaixo é que protegem os dados.

create extension if not exists pgcrypto;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  price numeric(12, 2),
  image_path text,
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_name_length check (char_length(trim(name)) between 1 and 80),
  constraint products_description_length check (char_length(description) <= 280),
  constraint products_price_positive check (price is null or price >= 0)
);

create table if not exists public.settings (
  id integer primary key default 1,
  show_prices boolean not null default true,
  currency text not null default 'R$',
  hero_title text not null default 'O banho merece um ritual.',
  hero_text text not null default 'Sabonetes feitos à mão, em pequenos lotes, com botânicos generosos e uma espuma que abraça. Escolha o aroma, deseje o toque e fale com a Río Rosa.',
  footer_note text not null default 'Um catálogo para olhar devagar e escolher com vontade. Encomendas direto com a Río Rosa.',
  instagram text not null default '',
  whatsapp text not null default '5548998063538',
  cover_path text,
  updated_at timestamptz not null default now(),
  constraint settings_single_row check (id = 1),
  constraint settings_currency_length check (char_length(trim(currency)) between 1 and 4),
  constraint settings_hero_title_length check (char_length(trim(hero_title)) between 1 and 90),
  constraint settings_hero_text_length check (char_length(hero_text) <= 320),
  constraint settings_footer_length check (char_length(footer_note) <= 240),
  constraint settings_instagram_length check (char_length(instagram) <= 40),
  constraint settings_whatsapp_length check (char_length(whatsapp) <= 20)
);

insert into public.settings (id)
values (1)
on conflict (id) do nothing;

create index if not exists products_sort_idx
  on public.products (sort_order, created_at);

drop trigger if exists products_touch on public.products;
create trigger products_touch
  before update on public.products
  for each row execute function public.touch_updated_at();

drop trigger if exists settings_touch on public.settings;
create trigger settings_touch
  before update on public.settings
  for each row execute function public.touch_updated_at();

alter table public.admins enable row level security;
alter table public.products enable row level security;
alter table public.settings enable row level security;

drop policy if exists "admins_select_self" on public.admins;
create policy "admins_select_self"
  on public.admins
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "products_public_read" on public.products;
create policy "products_public_read"
  on public.products
  for select
  to anon, authenticated
  using (published = true or public.is_admin());

drop policy if exists "products_admin_insert" on public.products;
create policy "products_admin_insert"
  on public.products
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "products_admin_update" on public.products;
create policy "products_admin_update"
  on public.products
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "products_admin_delete" on public.products;
create policy "products_admin_delete"
  on public.products
  for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "settings_public_read" on public.settings;
create policy "settings_public_read"
  on public.settings
  for select
  to anon, authenticated
  using (true);

drop policy if exists "settings_admin_update" on public.settings;
create policy "settings_admin_update"
  on public.settings
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke all on table public.admins from public, anon, authenticated;
grant select on table public.admins to authenticated;

revoke all on table public.products from public, anon, authenticated;
grant select on table public.products to anon, authenticated;
grant insert, update, delete on table public.products to authenticated;

revoke all on table public.settings from public, anon, authenticated;
grant select on table public.settings to anon, authenticated;
grant update on table public.settings to authenticated;

grant usage on schema public to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'product-images');

drop policy if exists "product_images_admin_insert" on storage.objects;
create policy "product_images_admin_insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product_images_admin_update" on storage.objects;
create policy "product_images_admin_update"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product_images_admin_delete" on storage.objects;
create policy "product_images_admin_delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

-- Depois de criar o usuário em Authentication → Users, execute isto
-- com o seu e-mail:
--
-- insert into public.admins (user_id)
-- select id from auth.users where email = 'seu-email@exemplo.com';
