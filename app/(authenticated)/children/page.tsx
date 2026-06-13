import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/utils/supabase/server";
import { listChildrenForParent } from "./queries";
import { CreateChildDialog } from "./_components/create-child-dialog";

export default function ChildrenPage() {
   return (
      <Suspense fallback={<Spinner className="size-8 text-muted-foreground" />}>
         <ChildrenContent />
      </Suspense>
   );
}

async function ChildrenContent() {
   const supabase = await createClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();
   if (!user) redirect("/login");

   const childList = await listChildrenForParent(user.id);

   return (
      <main className="flex h-full max-h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-4 overflow-hidden p-8">
         <h1 className="shrink-0 text-3xl font-bold">My children</h1>
         <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
         <CreateChildDialog />
         </div>
      </main>
   );
}