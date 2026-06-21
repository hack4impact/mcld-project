import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";
import { signout } from "@/app/login/actions";
import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Page() {
   return (
      <Suspense>
         <HomeContent />
      </Suspense>
   );
}

async function HomeContent() {
   const supabase = await createClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();

   if (!user) return null;

   return (
      <main className="min-h-screen p-4 w-full">
         <div className="flex flex-row gap-4 w-full">
            <Card className="flex-1">
               <CardHeader>
                  <CardTitle className="text-2xl">Welcome</CardTitle>
                  <CardDescription>You are signed in as</CardDescription>
               </CardHeader>
               <CardContent className="space-y-4">
                  <p className="text-sm font-medium">{user.email}</p>
                  <form>
                     <Button formAction={signout} variant="outline">
                        Sign out
                     </Button>
                  </form>
               </CardContent>
            </Card>
         </div>
      </main>
   );
}
