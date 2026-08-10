import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { signout } from "@/app/login/actions";
import { getCurrentUser } from "@/lib/auth/current-user";
import { formatDateFromInstant } from "@/lib/format";
import { getAccountProfile } from "../queries";
import { ProfileForm } from "./_components/profile-form";

export default function ProfilePage() {
   return (
      <Suspense fallback={<Spinner className="size-8 text-muted-foreground" />}>
         <ProfileContent />
      </Suspense>
   );
}

async function ProfileContent() {
   const user = await getCurrentUser();
   if (!user) redirect("/login");

   const profile = await getAccountProfile(user.id);

   return (
      <main className="flex flex-col gap-6 p-8">
         <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold">Profile</h1>
            <p className="text-sm text-muted-foreground">
               {profile
                  ? `Signed in as ${user.email} · member since ${formatDateFromInstant(profile.memberSince)}`
                  : `Signed in as ${user.email}`}
            </p>
         </div>

         <Card className="max-w-3xl">
            <CardHeader>
               <CardTitle>Your details</CardTitle>
               <CardDescription>
                  Keep these up to date so coordinators can reach you. To change
                  your email address, contact us.
               </CardDescription>
            </CardHeader>
            <CardContent>
               {profile ? (
                  <ProfileForm
                     profile={{
                        firstName: profile.firstName,
                        lastName: profile.lastName,
                        phone: profile.phone,
                        address: profile.address,
                        dob: profile.dob,
                        gender: profile.gender,
                     }}
                  />
               ) : (
                  <p className="text-sm text-muted-foreground">
                     We could not load your profile details.
                  </p>
               )}
            </CardContent>
         </Card>

         <form>
            <Button formAction={signout} variant="outline">
               Sign out
            </Button>
         </form>
      </main>
   );
}
