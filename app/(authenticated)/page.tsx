import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { eq } from "drizzle-orm";
import {
   ArrowRight,
   Baby,
   BookOpen,
   CalendarCheck,
   CalendarClock,
   Form,
   Users,
   type LucideIcon,
} from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { getUserRole } from "@/lib/auth/require-admin";
import { ROLES, type Role } from "@/lib/roles";
import { getSubscriptionDetails } from "@/lib/stripe";
import { Spinner } from "@/components/ui/spinner";
import { PageShell } from "@/components/page-shell";
import { CheckoutButton } from "@/components/subscribe-button";

const SUBSCRIPTION_PRICE_ID = process.env.STRIPE_PRICE_ID!;
const PRODUCT_PRICE_ID = process.env.STRIPE_PRODUCT_PRICE_ID!;

type QuickLink = {
   title: string;
   description: string;
   href: string;
   icon: LucideIcon;
};

const QUICK_LINKS: Record<Role, QuickLink[]> = {
   [ROLES.ADMIN]: [
      {
         title: "Services",
         description: "Programs, lessons and webinars",
         href: "/services",
         icon: BookOpen,
      },
      {
         title: "Users",
         description: "Families, coordinators and admins",
         href: "/users",
         icon: Users,
      },
      {
         title: "Forms",
         description: "Registration questions",
         href: "/forms",
         icon: Form,
      },
   ],
   [ROLES.COORDINATOR]: [
      {
         title: "Services",
         description: "Programs you coordinate",
         href: "/services",
         icon: BookOpen,
      },
      {
         title: "Scheduled lessons",
         description: "Upcoming private lessons",
         href: "/scheduled-lessons",
         icon: CalendarClock,
      },
   ],
   [ROLES.USER]: [
      {
         title: "My registrations",
         description: "Programs and lessons you signed up for",
         href: "/registrations",
         icon: CalendarCheck,
      },
      {
         title: "My children",
         description: "Manage your children's profiles",
         href: "/children",
         icon: Baby,
      },
   ],
};

export default function Page() {
   return (
      <Suspense
         fallback={
            <div className="flex flex-1 items-center justify-center">
               <Spinner className="size-8 text-muted-foreground" />
            </div>
         }
      >
         <HomeContent />
      </Suspense>
   );
}

function WelcomeHero({ name, email }: { name: string | null; email: string }) {
   return (
      <section className="relative overflow-hidden rounded-3xl bg-primary px-6 py-8 text-primary-foreground shadow-md md:px-10 md:py-10">
         <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-brand-sky/40 blur-3xl"
         />
         <div
            aria-hidden
            className="pointer-events-none absolute -bottom-28 left-1/3 size-64 rounded-full bg-brand-gold/20 blur-3xl"
         />
         <Image
            src="/yellow-star.svg"
            alt=""
            aria-hidden
            width={53}
            height={38}
            unoptimized
            className="pointer-events-none absolute top-1/2 right-6 hidden h-20 w-auto -translate-y-1/2 sm:block md:right-12 md:h-28"
         />
         <div className="relative flex flex-col gap-2 sm:pr-32 md:pr-40">
            <p className="text-sm font-medium text-primary-foreground/70">
               Welcome back
            </p>
            <h1 className="text-3xl font-semibold md:text-4xl">
               {name ? `Hi, ${name}!` : "Hi there!"}
            </h1>
            <p className="text-sm text-primary-foreground/70">
               Signed in as{" "}
               <span className="font-medium text-primary-foreground">
                  {email}
               </span>
            </p>
         </div>
      </section>
   );
}

function QuickLinks({ links }: { links: QuickLink[] }) {
   return (
      <section aria-labelledby="quick-links" className="flex flex-col gap-3">
         <h2 id="quick-links" className="text-lg font-semibold">
            Jump back in
         </h2>
         <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {links.map((link) => (
               <Link
                  key={link.href}
                  href={link.href}
                  className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-xs transition-all hover:-translate-y-0.5 hover:border-brand-sky/60 hover:shadow-md"
               >
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                     <link.icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                     <p className="font-heading font-semibold text-foreground">
                        {link.title}
                     </p>
                     <p className="truncate text-sm text-muted-foreground">
                        {link.description}
                     </p>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
               </Link>
            ))}
         </div>
      </section>
   );
}

function IconTile({ icon: Icon }: { icon: LucideIcon }) {
   return (
      <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
         <Icon className="size-5" />
      </div>
   );
}

function DetailRow({
   label,
   children,
}: {
   label: string;
   children: React.ReactNode;
}) {
   return (
      <div className="flex items-center justify-between gap-4 py-2.5">
         <span className="text-sm text-muted-foreground">{label}</span>
         <span className="text-sm font-semibold text-foreground">
            {children}
         </span>
      </div>
   );
}

async function HomeContent() {
   const supabase = await createClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();

   if (!user) return null;

   const [role, profile] = await Promise.all([
      getUserRole(),
      db.query.profiles.findFirst({
         where: eq(profiles.id, user.id),
         columns: { firstName: true },
      }),
   ]);
   const firstName = profile?.firstName?.trim() || null;
   const links = role ? QUICK_LINKS[role] : [];

   if (role === ROLES.COORDINATOR) {
      return (
         <PageShell>
            <WelcomeHero name={firstName} email={user.email!} />
            <QuickLinks links={links} />
         </PageShell>
      );
   }

   const [subscription] = await Promise.all([getSubscriptionDetails(user.id)]);
   const ownsProduct = false;

   return (
      <PageShell>
         <WelcomeHero name={firstName} email={user.email!} />

         {links.length > 0 && <QuickLinks links={links} />}
      </PageShell>
   );
}
