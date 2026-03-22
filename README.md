# mcld-project

## Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Auth**: Supabase Auth (email/password, SSR via `@supabase/ssr`)
- **Database**: PostgreSQL via Supabase + Drizzle ORM
- **UI**: shadcn/ui (Radix) + Tailwind
- **Hosting**: Vercel

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
sudo nano .env
```

Fill in your Supabase credentials from [supabase.com/dashboard](https://supabase.com/dashboard) > Project Settings > API (or Dashboard > Framework > Next.js > Environment Variables):

only on `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL` — Project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` — Publishable (anon) key

only on `.env`:

- `DATABASE_URL` — Connection string (Dashboard > Direct (connextion string) > Copy connection string (for the password go to Database > Settings > Database password > Reset password))

### 3. Configure Supabase Auth (if you dont use port 3000)

In your Supabase dashboard under **Authentication > URL Configuration**:

- **Site URL**: `http://localhost:PORT`
- **Redirect URLs**: add `http://localhost:PORT/auth/callback`

Make sure **Email** provider is enabled under **Authentication > Sign In/Providers**.

### 4. Set up the database

```bash
pnpm db:push       # push schema to Supabase
pnpm db:generate   # generate migration files
pnpm db:migrate    # run migrations
```

### 5. Run

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to `/login` if not authenticated.

## Adding shadcn/ui components

```bash
npx shadcn@latest add <component>
```

Examples:

```bash
npx shadcn@latest add button
npx shadcn@latest add card input label
npx shadcn@latest add dialog dropdown-menu
```

Components are installed to `components/ui/`. Browse available components at [ui.shadcn.com](https://ui.shadcn.com).

## Project structure

```
app/
  layout.tsx          # Root layout (Helvetica font)
  page.tsx            # Home (protected, shows user + sign out)
  login/
    page.tsx          # Login / signup form
    actions.ts        # Server actions (login, signup, signout)
  auth/
    callback/
      route.ts        # Email confirmation callback
components/ui/        # shadcn/ui components
utils/supabase/
  client.ts           # Browser Supabase client
  server.ts           # Server Supabase client
  middleware.ts       # Session refresh + auth redirect logic
proxy.ts              # Next.js 16 proxy (replaces middleware.ts)
drizzle/              # Drizzle schema + migrations
drizzle.config.ts     # Drizzle config
```
