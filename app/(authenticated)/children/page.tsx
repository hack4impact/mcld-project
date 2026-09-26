import { Suspense } from "react";
import { redirect } from "next/navigation";

import { Spinner } from "@/components/ui/spinner";
import { PageHeader, PageShell } from "@/components/page-shell";
import { createClient } from "@/utils/supabase/server";
import { getUserRole } from "@/lib/auth/require-admin";
import { ROLES } from "@/lib/roles";
import { listChildrenForParent } from "@/app/(authenticated)/users/children-queries";
import { ChildrenClient } from "./_components/children-client";

export default function ChildrenPage() {
   return (
      <Suspense
         fallback={
            <div className="flex flex-1 items-center justify-center">
               <Spinner className="size-8 text-muted-foreground" />
            </div>
         }
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

   const role = await getUserRole();
   if (role === ROLES.ADMIN) {
      redirect("/users");
   }
   if (role !== ROLES.USER) {
      redirect("/");
   }

   const childList = await listChildrenForParent(user.id);

   return (
      <PageShell fill>
         <PageHeader
            title="My children"
            description="Add and manage children linked to your account."
         />
         <ChildrenClient childList={childList} />
      </PageShell>
   );
}
