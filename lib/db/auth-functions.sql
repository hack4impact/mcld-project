-- Database functions and triggers that Supabase Auth relies on.
--
-- Drizzle doesn't manage functions or triggers, so `pnpm db:push` never touches
-- this file. Run it in the Supabase SQL editor after the first `pnpm db:push` on
-- a new database, and again whenever it changes. It's safe to re-run.
--
-- The access token hook also has to be enabled in the dashboard:
-- Authentication > Hooks > Customize Access Token (JWT) Claims >
-- Postgres function `public.custom_access_token_hook`.


-- Copies profiles.role into the `user_role` JWT claim on every login and token
-- refresh. The app reads that claim to decide what each role can see.
--
-- Supabase Auth calls it as supabase_auth_admin, which doesn't bypass RLS.
-- `security definer` runs it as its owner (postgres) instead, so it can read
-- profiles without a policy.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  claims jsonb;
  user_role public.role;
begin
  select role into user_role
  from public.profiles
  where id = (event->>'user_id')::uuid;

  claims := event->'claims';

  if user_role is not null then
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role::text));
  else
    claims := jsonb_set(claims, '{user_role}', '"user"');
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

-- Only Supabase Auth may call the hook. Since it runs as postgres, it must not be
-- callable through the Data API.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;


-- Creates a profiles row for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, first_name, last_name, role)
  values (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    'user'
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
