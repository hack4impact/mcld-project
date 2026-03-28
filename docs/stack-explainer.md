# MCLD Project — Full Stack Explainer

A deep-dive reference for every tool, config, and convention in this project.

---

## 1. TypeScript

### What it is

TypeScript (TS) is JavaScript with a **type system bolted on top**. It compiles to plain JavaScript — browsers and Node.js never see `.ts` files directly.

```ts
// JavaScript — no safety
function greet(name) {
  return "Hello, " + name.toUppercase(); // typo: .toUpperCase()
  // JS lets this through. It crashes at runtime.
}

// TypeScript — caught at compile time
function greet(name: string): string {
  return "Hello, " + name.toUppercase();
  //                       ^^^^^^^^^^^
  // TS error: Property 'toUppercase' does not exist on type 'string'.
  // Did you mean 'toUpperCase'?
}
```

### How it runs

You never run `tsc` manually in this project. Next.js has a built-in TS compiler (via SWC/Turbopack) that:
1. Strips types on the fly as you save files
2. Shows type errors in your editor and terminal

### Core concepts you'll use daily

**Type annotations:**
```ts
const age: number = 25;
const name: string = "Alice";
const active: boolean = true;
```

**Interfaces and types (describing object shapes):**
```ts
type User = {
  id: string;
  firstName: string;
  lastName: string;
  role: "user" | "admin" | "coach"; // union type — only these 3 strings allowed
};

function getDisplayName(user: User): string {
  return `${user.firstName} ${user.lastName}`;
}
```

**Optional properties (`?`):**
```ts
type Profile = {
  id: string;
  avatarUrl?: string; // may or may not exist — type is string | undefined
};
```

**Type inference:** TS is smart enough to figure out types automatically:
```ts
const x = 42;        // TS infers: number (you don't need to write ": number")
const arr = [1,2,3]; // TS infers: number[]
```

**Generics** — reusable code that works with any type:
```ts
// Without generics — only works for strings
function first(arr: string[]): string { return arr[0]; }

// With generics — works for any type T
function first<T>(arr: T[]): T { return arr[0]; }

first([1, 2, 3]);       // returns number
first(["a", "b", "c"]); // returns string
```

### `tsconfig.json` explained

```json
{
  "compilerOptions": {
    "target": "ES2017",        // which JS version to output
    "lib": ["dom", "ES2017"],  // which browser/Node APIs exist
    "strict": true,            // enable all strict checks (recommended)
    "baseUrl": ".",            // root for path aliases
    "paths": {
      "@/*": ["./*"]           // "@/lib/db/schema" → "./lib/db/schema"
    },
    "moduleResolution": "bundler", // how imports are resolved (modern)
    "jsx": "preserve"              // Next.js handles JSX transformation itself
  }
}
```

The `@/` path alias is huge — instead of `../../../lib/db/schema` you write `@/lib/db/schema` anywhere.

---

## 2. Next.js (App Router)

### The big picture

Next.js is a **full-stack React framework**. It handles:
- **Routing** (based on the folder structure in `app/`)
- **Rendering** (server-side, client-side, static)
- **API** (server actions and route handlers, no separate backend needed)

### File-based routing

Every file named `page.tsx` inside `app/` becomes a route:

```
app/
  page.tsx            → /
  login/
    page.tsx          → /login
  dashboard/
    page.tsx          → /dashboard
    settings/
      page.tsx        → /dashboard/settings
  blog/
    [slug]/
      page.tsx        → /blog/anything  (slug = dynamic segment)
```

### Server vs Client Components

This is the most important concept in Next.js App Router.

**Server Components (default — no special annotation needed):**
- Run only on the server. Never sent as JavaScript to the browser.
- Can be `async` and `await` data directly (no `useEffect` needed)
- Cannot use browser APIs (`window`, `localStorage`) or React hooks

```tsx
// app/dashboard/page.tsx — Server Component (no "use client")
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";

export default async function DashboardPage() {
  // This runs on the SERVER — direct DB access, no API call needed
  const users = await db.select().from(profiles);

  return (
    <ul>
      {users.map(u => <li key={u.id}>{u.firstName}</li>)}
    </ul>
  );
}
```

**Client Components (`"use client"` at the top):**
- Sent as JS to the browser
- Can use React hooks (`useState`, `useEffect`, `useRef`)
- Can respond to events (clicks, input changes)
- CANNOT call the database directly

```tsx
"use client"; // marks this as a client component

import { useState } from "react";

export default function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

> **Rule of thumb**: Make everything a Server Component by default. Only add `"use client"` when you need interactivity or hooks.

### Server Actions (`"use server"`)

Server Actions are functions that run **on the server** but can be called **from the client** (e.g., from a form). No API route needed.

```ts
// app/login/actions.ts
"use server";

import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";

export async function createProfile(formData: FormData) {
  const firstName = formData.get("firstName") as string;
  await db.insert(profiles).values({ firstName, /* ... */ });
}
```

```tsx
// app/login/page.tsx (Server Component)
import { createProfile } from "./actions";

export default function LoginPage() {
  return (
    <form action={createProfile}>
      <input name="firstName" />
      <button type="submit">Save</button>
    </form>
  );
}
```

When the form submits, Next.js calls `createProfile` on the server, runs the DB insert, and returns. No `fetch()`, no API endpoint.

### Route Handlers (actual API endpoints)

When you DO need a traditional REST endpoint (e.g., for webhooks):

```ts
// app/api/users/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";

export async function GET() {
  const users = await db.select().from(profiles);
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const body = await request.json();
  const user = await db.insert(profiles).values(body).returning();
  return NextResponse.json(user[0], { status: 201 });
}
```

### Layouts

`layout.tsx` wraps all pages inside its folder. The root layout at `app/layout.tsx` wraps your entire app.

```tsx
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav>/* shown on every page */</nav>
        {children} {/* the current page renders here */}
      </body>
    </html>
  );
}
```

### How the dev server actually works

```
pnpm dev
  → starts a Node.js server (via Turbopack in Next.js 16)
  → watches app/ and lib/ for file changes
  → on each request:
       1. Resolves which page.tsx matches the URL
       2. Renders Server Components on the server (running Node.js)
       3. Sends HTML + minimal JS to the browser  
       4. Browser "hydrates" Client Components (attaches event listeners)
```

No separate frontend and backend servers — it's one process handling both.

### `proxy.ts` (Next.js 16 middleware replacement)

In Next.js ≤14, route protection lived in `middleware.ts` at the project root. In Next.js 16 with Turbopack, this is handled by `proxy.ts`. It intercepts every request before a page renders:

```
browser request → proxy.ts → is user logged in?
                                ├── yes → continue to page
                                └── no  → redirect to /login
```

### `next.config.ts`

```ts
const nextConfig = {
  images: {
    domains: ["yourstorage.supabase.co"], // allow external images
  },
  // experimental features, redirects, env variable exposure, etc.
};
```

---

## 3. Drizzle ORM

### The mental model

```
schema.ts (TypeScript)
   ↓  drizzle-kit push / migrate
Real PostgreSQL tables in Supabase
   ↓  db.select(), db.insert(), etc.
Type-safe query results in your app
```

Drizzle is unique: your schema IS your types. When you query, the return type is inferred automatically.

### Writing queries

```ts
import { db } from "@/lib/db";
import { profiles, services } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// SELECT * FROM profiles WHERE id = '...'
const user = await db.select().from(profiles).where(eq(profiles.id, userId));

// SELECT first_name, last_name FROM profiles
const names = await db
  .select({ firstName: profiles.firstName, lastName: profiles.lastName })
  .from(profiles);

// INSERT INTO profiles (...) VALUES (...)
const [newUser] = await db.insert(profiles).values({
  id: authUserId,
  firstName: "Alice",
  lastName: "Smith",
  role: "user",
}).returning(); // returning() gives you the inserted row back

// UPDATE profiles SET role = 'coach' WHERE id = '...'
await db.update(profiles)
  .set({ role: "coach" })
  .where(eq(profiles.id, userId));

// DELETE FROM profiles WHERE id = '...'
await db.delete(profiles).where(eq(profiles.id, userId));

// JOIN
const sessionsWithCoach = await db
  .select()
  .from(coachingSessions)
  .leftJoin(profiles, eq(coachingSessions.coachId, profiles.id));
```

### drizzle.config.ts

```ts
export default defineConfig({
  out: "./drizzle",          // where SQL migration files are saved
  schema: "./lib/db/schema.ts", // where your TS schema lives
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!, // your Supabase connection string
  },
});
```

### The scripts

| Script | What happens |
|---|---|
| `db:push` | Reads `schema.ts`, compares to real DB, runs CREATE/ALTER TABLE — **no migration file saved** |
| `db:generate` | Reads `schema.ts`, generates a `.sql` migration file in `./drizzle/` — doesn't touch DB |
| `db:migrate` | Runs the `.sql` files in `./drizzle/` against the DB |
| `db:studio` | Opens a web UI at `local.drizzle.studio` to browse/edit data |

**When to use which:**
- **Development / prototyping**: `db:push` — fast, no migration files to manage
- **Production / teamwork**: `db:generate` + `db:migrate` — safe, versioned, reviewable SQL

---

## 4. Supabase (PostgreSQL)

Supabase gives you:
- **PostgreSQL database** — Drizzle talks to this
- **Auth** — user signup/login (stores users in a hidden `auth.users` table)
- **Storage** — file uploads (images, PDFs)
- **Row-Level Security (RLS)** — optional DB-level access policies

### The two Supabase clients

```ts
// utils/supabase/server.ts — for Server Components and Server Actions
import { createServerClient } from "@supabase/ssr";

// utils/supabase/client.ts — for Client Components
import { createBrowserClient } from "@supabase/ssr";
```

Drizzle bypasses Supabase's client entirely and connects directly to Postgres via the `DATABASE_URL` connection string. The Supabase clients are used for Auth (login, session tokens).

---

## 5. pnpm

`pnpm` = Performant npm. Same commands, faster, less disk space.

### Why it's faster

`npm` copies packages into `node_modules/` for every project. pnpm stores each package once globally and uses **hard links** — so if 10 projects use React, the files exist once on disk, not 10 times.

### Lockfile

`pnpm-lock.yaml` (or `package-lock.json` for npm) pins every package to an exact version. This ensures `pnpm install` on any machine gives the exact same dependency tree. **Always commit lockfiles.**

### Key commands

```bash
pnpm install        # install all dependencies from package.json
pnpm add react      # install a new package + save to package.json
pnpm add -D vitest  # install as devDependency
pnpm remove lodash  # uninstall
pnpm run dev        # run the "dev" script from package.json
pnpm dev            # shorthand (pnpm knows "dev" is a script)
```

### `package.json` scripts section

```json
"scripts": {
  "dev": "next dev",          // pnpm dev → starts Next.js dev server
  "build": "next build",      // pnpm build → production build
  "start": "next start",      // pnpm start → run the production build
  "lint": "eslint",           // pnpm lint → run ESLint
  "db:push": "drizzle-kit push",      // push schema to DB
  "db:generate": "drizzle-kit generate", // generate migration SQL
  "db:migrate": "drizzle-kit migrate",   // run migrations
  "db:studio": "drizzle-kit studio",     // open Drizzle Studio
  "format": "prettier --write ."         // reformat all files
}
```

---

## 6. Prettier

Prettier enforces **consistent code style** automatically. You never debate tabs vs spaces — Prettier just rewrites the file.

### What it does

```ts
// Before Prettier
const x={a:1,b:2,c:3}
function   foo(  a,b,c  )  {return a+b+c}

// After Prettier
const x = { a: 1, b: 2, c: 3 };
function foo(a, b, c) {
  return a + b + c;
}
```

### `.prettierrc.json`

```json
{
  "semi": true,           // semicolons at end of statements
  "singleQuote": false,   // use double quotes
  "tabWidth": 2,          // 2-space indentation
  "trailingComma": "es5"  // trailing commas where valid in ES5
}
```

### Editor integration

In VS Code, install the **Prettier** extension and add to your settings:
```json
{ "editor.formatOnSave": true }
```
Now every time you save, Prettier reformats the file automatically.

---

## 7. ESLint

ESLint is a **linter** — it statically analyzes your code for bugs and bad patterns *before runtime*.

### What it catches (examples)

```ts
// Unused variable — ESLint error
const unused = 5;

// Missing dependency in useEffect — React ESLint plugin catches this
useEffect(() => {
  fetchUser(userId); // userId is used but not in deps array!
}, []); // ← ESLint: 'userId' is missing from deps

// Using 'any' type in strict mode
const data: any = fetchData(); // defeats the purpose of TypeScript
```

### Difference from Prettier

| Tool | Catches |
|---|---|
| Prettier | Formatting only (spacing, quotes, line length) — never a "bug" |
| ESLint | Code quality, potential bugs, bad patterns |

They complement each other. Run both.

### `eslint.config.mjs`

The new "flat config" format. It specifies which rules to use, which files to include/ignore, and which plugins to load (e.g., the Next.js plugin adds rules specific to Next.js like "don't use `<a>` instead of `<Link>`").

---

## 8. shadcn/ui + Tailwind

### Tailwind CSS

A **utility-first CSS framework** — instead of writing `.button { color: blue; }`, you add classes directly in HTML:

```tsx
<button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
  Click me
</button>
```

These utility classes map to specific CSS rules. Tailwind scans your files and only includes the classes you actually use in the final CSS bundle.

`postcss.config.mjs` — Tailwind runs as a PostCSS plugin, which is how it hooks into the CSS build pipeline. You never touch this file.

### shadcn/ui

shadcn is NOT a traditional library. When you run `npx shadcn@latest add button`, it **copies** the component source code directly into `components/ui/button.tsx`. You own and can edit that code.

`components.json` tells shadcn:
- Where to put components (`components/ui/`)
- Which CSS framework (Tailwind)
- Which path alias to use (`@/`)

---

## 9. `skills-lock.json`

This belongs to the **Antigravity AI agent** (your coding assistant). It records which AI skill modules are available in this project. Completely unrelated to your app — you can ignore it entirely.

---

## 10. How a Full Request Works End-to-End

Here's what happens when a logged-in user visits `/dashboard`:

```
1. Browser → GET /dashboard

2. proxy.ts runs
   → reads session cookie
   → calls Supabase Auth to verify the session
   → if invalid: redirect to /login
   → if valid: continue

3. Next.js finds app/dashboard/page.tsx

4. Server Component renders on the server (Node.js):
   → calls db.select().from(profiles)...
   → Drizzle generates SQL: SELECT * FROM profiles WHERE id = $1
   → sends SQL to Supabase PostgreSQL over DATABASE_URL connection
   → PostgreSQL returns rows
   → Drizzle maps rows back to TypeScript objects
   → React renders JSX → HTML string

5. HTML sent to browser
   → browser displays instantly (no waiting for JS to load)

6. Browser downloads Client Component JS bundles
   → React "hydrates" — attaches event listeners to the server-rendered HTML
   → App is now interactive
```

---

## 11. The Development Workflow

A typical feature workflow on this project:

```bash
# 1. Create branch
git checkout -b feature/my-feature

# 2. Edit schema.ts if you need new tables
#    Push to DB
npx drizzle-kit push

# 3. Write your page in app/feature/page.tsx
#    Write server actions in app/feature/actions.ts

# 4. Check for errors
npx eslint .

# 5. Format code
npx prettier --write .

# 6. Test locally
npm run dev  # open localhost:3000

# 7. Commit and push
git add .
git commit -m "feat: add feature page"
git push origin feature/my-feature

# 8. Open pull request → Vercel auto-deploys preview URL
```
