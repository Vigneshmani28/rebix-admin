# Rebix Admin

Next.js admin panel for managing the mobile app's Home banners. No backend of its own: the browser talks to
Supabase with the public (publishable) key and the admin's login session. Postgres RLS decides what is
allowed (`public.is_admin()`), so there is no service-role key anywhere.

## One-time setup

1. Run `supabase/migrations/20250101000019_banners.sql` (`supabase db push`, or paste it in the SQL editor).
2. Supabase Dashboard → Authentication → Users → **Add user** (email + password, tick *Auto confirm*).
3. Make that user an admin (SQL editor):
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'you@example.com';
   ```
4. `cp .env.example .env.local` and fill in the Supabase URL + publishable key.

## Run

```bash
npm install
npm run dev     # http://localhost:3000
```

## Deploy (Vercel)

Import the repo, set **Root Directory** to `admin`, add the two `NEXT_PUBLIC_SUPABASE_*` env vars, deploy.
# rebix-admin
