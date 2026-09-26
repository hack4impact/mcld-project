import { Suspense } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { Spinner } from "@/components/ui/spinner";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { ROLES } from "@/lib/roles";
import { getSubscriptionDetails } from "@/lib/stripe";
import { createClient } from "@/utils/supabase/server";
import { SettingsView } from "./_components/settings-view";

export default function SettingsPage() {
   return (
      <Suspense
         fallback={
            <div className="flex flex-1 items-center justify-center">
               <Spinner className="size-8 text-muted-foreground" />
            </div>
         }
      >
         <SettingsContent />
      </Suspense>
   );
}

async function SettingsContent() {
   const supabase = await createClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();
   if (!user) {
      redirect("/login");
   }

   const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
      columns: {
         firstName: true,
         lastName: true,
         role: true,
         phone: true,
         address: true,
         gender: true,
         dob: true,
      },
   });
   if (!profile) {
      redirect("/login");
   }

   // Only members (role "user") have a subscription to show or start.
   const subscription =
      profile.role === ROLES.USER
         ? await getSubscriptionDetails(user.id)
         : undefined;

   return (
      <SettingsView
         profile={profile}
         email={user.email ?? ""}
         subscription={subscription}
      />
   );
}
