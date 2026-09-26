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

## Local WordPress and Elementor setup

The **MCLD Services** plugin in [`wp-blocks/mcld-services`](wp-blocks/mcld-services) adds a native Elementor widget. Run WordPress alongside Next.js to test it locally. WordPress requests `/api/public/services` from Next.js; Next.js reads active services from Supabase/Postgres and gets their titles, descriptions, and prices from Stripe. The local widget uses this real API, with no sample catalog built into the plugin.

Complete the Next.js setup above using your team's development environment or your own configured Supabase/Stripe projects. For either WordPress workflow below, Next.js needs these values:

| File         | Variables                                                                                       |
| ------------ | ----------------------------------------------------------------------------------------------- |
| `.env`       | `DATABASE_URL`                                                                                  |
| `.env.local` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`, `STRIPE_SECRET_KEY` |

Use the remaining settings from `.env.example` for the dashboard and checkout as needed. The service records must reference products in the same Stripe account and test/live mode as the Stripe key. Keep these credentials in Next.js; none go into WordPress or the widget settings. The `WORDPRESS_*` variables in `.env.example` are not used by this widget.

### Quick preview (recommended)

Use **Node.js 24.18 or newer**; Playground's dependencies declare **npm 11.16 or newer** for installation. From the repository root, run Next.js in one terminal:

```bash
pnpm dev
```

Then, in another terminal at the repository root:

```bash
pnpm wordpress:preview
```

Open **[http://127.0.0.1:9463](http://127.0.0.1:9463)** after the command prints the preview URL. There is no WordPress install wizard, ZIP upload, or Elementor page editing required. The command:

- Checks that the real Next.js services endpoint is reachable.
- Installs the preview/build dependencies when their lockfiles change, and builds the widget assets.
- Uses [WordPress Playground](https://developer.wordpress.org/playground/developers/local-development/wp-playground-cli/)'s PHP runtime and SQLite support to start WordPress without installing PHP, MySQL, Docker, or Local.
- Installs Elementor, activates MCLD Services, configures the local environment, and creates a page with the widget already connected to Next.js.

The first run downloads WordPress 6.8.3, Elementor 4.3.2, and SQLite integration 3.0.2. Downloads and npm cache stay in the ignored `wp-blocks/mcld-services/preview/.cache/` directory. The WordPress site/database is disposable and recreated on each run; your Supabase/Stripe data remains in the configured Next.js environment. The preview listens only on this computer.

If either app needs a different port, point the preview at the correct Next.js base URL and choose a free WordPress port:

```bash
pnpm wordpress:preview --api-url http://localhost:3001 --port 9464
```

**Development loop:** edit PHP under `includes/` or `templates/`, then refresh the browser. For JS/SCSS changes, run `npm run build` from `wp-blocks/mcld-services`, then refresh. These runtime directories are mounted directly from your checkout, so you do not need to reinstall the plugin or interact with Elementor. Restart the preview after changing `mcld-services.php` or the preview setup scripts.

The automatic preview clears the widget's API cache on each page request, so refresh shows current services from Next.js. The distributable plugin still caches for five minutes. Press **Ctrl+C** in the preview terminal to stop WordPress; Next.js keeps running in its own terminal. Run `pnpm wordpress:preview --help` for the available options.

### Optional: persistent WordPress site with Local

Use the manual setup below when you want to keep WordPress pages/settings between sessions or test the Elementor editing workflow itself. For routine widget development, use the quick preview above.

#### 1. Start Next.js with your development data

From the repository root, start the app and leave it running:

```bash
pnpm dev
```

Open [http://localhost:3000/api/public/services](http://localhost:3000/api/public/services). It should return a JSON array of services. `[]` means the configured database has no active services. If it returns an error, resolve the Next.js database/Stripe configuration before continuing. Use the port printed by Next.js if port 3000 is already occupied.

#### 2. Create a local WordPress site

Install [Local](https://localwp.com/help-docs/getting-started/installing-local/), which manages WordPress's PHP server and database for you.

1. In Local, choose **Create a new site** and name it `mcld-wordpress`.
2. Use a PHP environment compatible with the plugin (PHP 7.4 or newer; PHP 8.3 is a tested option) and WordPress 6.8 or newer.
3. Create a local WordPress administrator account. This is separate from your Supabase dashboard account.
4. Start the site and click **WP Admin** to sign in. Use **Open site** to find its frontend URL; it will be a different address from Next.js on port 3000.

Local creates its own WordPress database. Do not point WordPress's database settings at Supabase.

#### 3. Enable local API URLs in WordPress

Open the site's folder from Local, then edit `app/public/wp-config.php`. Set the existing `WP_ENVIRONMENT_TYPE` entry to `local`, or add it if absent, before the line that loads `wp-settings.php`:

```php
define( 'WP_ENVIRONMENT_TYPE', 'local' );
```

Define it only once. This uses [WordPress's environment setting](https://developer.wordpress.org/reference/functions/wp_get_environment_type/) to allow the widget to connect to HTTP/HTTPS loopback hosts (`localhost`, `127.0.0.1`, or `[::1]`) on a `local` or `development` site. Production and staging require a public HTTPS dashboard URL.

#### 4. Install Elementor and the MCLD plugin

In **WP Admin > Plugins > Add New**, search for **Elementor Website Builder**, install it, and activate it. The free plugin is sufficient; use Elementor 3.24 or newer.

In a second terminal, starting from the repository root, build the MCLD plugin with Node.js 22 or newer:

```bash
cd wp-blocks/mcld-services
npm ci
npm run plugin-zip
```

This creates `wp-blocks/mcld-services/mcld-services.zip`. In **WP Admin > Plugins > Add New > Upload Plugin**, select that ZIP, install it, and activate **MCLD Services**. The ZIP includes the compiled assets; a fresh checkout alone does not include them.

#### 5. Add the widget and connect it to Next.js

1. Create a page under **Pages > Add New**, give it a title, and choose **Edit with Elementor**.
2. Search the widget panel for **MCLD Services** and drag it into a container.
3. In **Content > Services > Dashboard API URL**, enter `http://localhost:3000` (adjust the port if needed). Enter the Next.js base URL, not the WordPress site URL or the full `/api/public/services` endpoint.
4. Save/publish the local page and view it in your browser. The service cards should match the API response from step 1.
5. Open a service, try **Back** and the tabs, and check that **Register** links to `http://localhost:3000/checkout/{serviceId}`. Checkout uses the dashboard's separate sign-in; WordPress login is not shared. Membership and Donations are currently placeholder tabs.

Keep both Local's WordPress site and `pnpm dev` running. With this manual setup, WordPress pages and plugin installations belong to your Local site; pulling the repository does not update that installed copy automatically.

#### Updating and troubleshooting the persistent Local site

After changing plugin code, run `npm run plugin-zip` again from the plugin directory and upload the new ZIP to your local site, choosing to replace the installed version. Rebuilding the repository's files does not update a ZIP-installed copy automatically. Reload the Elementor editor and frontend after updating.

| Symptom                                            | What to check                                                                                                                                                                                                                  |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **MCLD Services** is missing from the widget panel | Both plugins must be active, Elementor must be 3.24+, and the built ZIP must be installed. Check the WordPress admin notices and reload the editor.                                                                            |
| The dashboard URL is rejected                      | Set `WP_ENVIRONMENT_TYPE` to `local` in the correct site's `wp-config.php`. Use the base URL with no credentials, query string, or `/api/public/services` suffix.                                                              |
| “Services could not be loaded”                     | Check the API URL in a browser and the Next.js terminal. Confirm the server is running on the configured port and the database/Stripe credentials work. If `localhost` fails, try `http://127.0.0.1:3000`.                     |
| Browser can reach Next.js, but WordPress cannot    | The request comes from PHP. In a container/VM, localhost can refer to a different machine. This guide assumes both servers share the host network; otherwise use a public HTTPS development deployment reachable by WordPress. |
| “No active services available”                     | The API returned an empty list. Confirm the configured development database contains active services.                                                                                                                          |
| Catalog changes are not visible yet                | Successful API responses, including empty lists, are cached for five minutes. Wait for expiry and refresh; clear any additional WordPress page cache if enabled.                                                               |

For API details, testing, deployment, and migration from the old Gutenberg block, see the [plugin readme](wp-blocks/mcld-services/readme.txt).

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
