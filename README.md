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

## WordPress and Elementor

The **MCLD Services** Elementor widget uses the real Next.js `/api/public/services` endpoint, with services from Supabase and product details/prices from Stripe.

Complete the setup above and add `STRIPE_SECRET_KEY` to `.env.local`. Use the Stripe account and test/live mode matching your service records. All credentials stay in Next.js.

### Quick preview

Requires **Node.js 24.18+ and npm 11.16+**. From the repository root, start Next.js:

```bash
pnpm dev
```

In a second terminal:

```bash
pnpm wordpress:preview
```

Open **[http://127.0.0.1:9463](http://127.0.0.1:9463)**. The command installs WordPress and Elementor and creates the widget page automatically—no Elementor UI setup needed. WordPress data resets on restart; services still come from your configured Next.js environment.

For different ports:

```bash
pnpm wordpress:preview --api-url http://localhost:3001 --port 9464
```

While developing:

- **PHP templates/includes:** edit and refresh.
- **JS/SCSS:** run `npm run build` in `wp-blocks/mcld-services`, then refresh.
- **Main plugin file or preview scripts:** restart the preview.

Refresh fetches current services. Stop with **Ctrl+C**; use `pnpm wordpress:preview --help` for options.

### Install on a WordPress site

Requires **WordPress 6.8+, PHP 7.4+, Elementor 3.24+**, and permission to install plugins. Build the ZIP:

```bash
cd wp-blocks/mcld-services
npm ci
npm run plugin-zip
```

Upload `mcld-services.zip` through **Plugins > Add New > Upload Plugin** and activate it. In Elementor, add **MCLD Services** and set **Dashboard API URL** to your deployed Next.js public HTTPS base URL (without `/api/public/services`).

See the [plugin readme](wp-blocks/mcld-services/readme.txt) for persistent local WordPress setup, caching, and testing.

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
wp-blocks/
  mcld-services/      # Native Elementor services widget and its build scripts
```
