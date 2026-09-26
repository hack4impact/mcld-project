import { Suspense } from "react";
import { redirect } from "next/navigation";

import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/utils/supabase/server";
import { ROLES } from "@/lib/roles";
import { listChildrenForParent } from "@/app/(authenticated)/users/children-queries";
import { ChildrenClient } from "./_components/children-client";

export default function ChildrenPage() {
   return (
      <Suspense
         fallback={<Spinner className="size-8 text-muted-foreground" />}
      >
         <ChildrenContent />
      </Suspense>
   );
}

async function ChildrenContent() {
   const supabase = await createClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();

   if (!user) {
      redirect("/login");
   }

   const { data: claimsData } = await supabase.auth.getClaims();
   const role = claimsData?.claims?.user_role;
   if (role === ROLES.ADMIN) {
      redirect("/users");
   }
   if (role !== ROLES.USER) {
      redirect("/");
   }

   const childList = await listChildrenForParent(user.id);

   return (
      <main className="flex h-full max-h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-4 overflow-hidden p-8">
         <div className="shrink-0">
            <h1 className="text-2xl font-semibold tracking-tight">
               My children
            </h1>
            <p className="text-sm text-muted-foreground">
               Add and manage children linked to your account.
            </p>
         </div>
         <ChildrenClient childList={childList} />
      </main>
   );
}
