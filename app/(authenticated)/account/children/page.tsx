import { Suspense } from "react";
import { redirect } from "next/navigation";
import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { getCurrentUser } from "@/lib/auth/current-user";
import { formatDate } from "@/lib/format";
import { listChildrenForParent } from "./queries";

export default function ChildrenPage() {
   return (
      <Suspense fallback={<Spinner className="size-8 text-muted-foreground" />}>
         <ChildrenContent />
      </Suspense>
   );
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
   return (
      <div className="flex items-start justify-between gap-4">
         <span className="text-sm text-muted-foreground">{label}</span>
         <span className="text-right text-sm font-medium">
            {value?.trim() ? value : "—"}
         </span>
      </div>
   );
}

async function ChildrenContent() {
   const user = await getCurrentUser();
   if (!user) redirect("/login");

   const kids = await listChildrenForParent(user.id);

   return (
      <main className="flex flex-col gap-6 p-8">
         <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold">Children</h1>
            <p className="text-sm text-muted-foreground">
               Children linked to your account.
            </p>
         </div>

         {kids.length === 0 ? (
            <p className="text-sm text-muted-foreground">
               No children are linked to your account yet. Children are added
               when you register one for a service.
            </p>
         ) : (
            <div className="grid gap-4 md:grid-cols-2">
               {kids.map((child) => (
                  <Card key={child.id}>
                     <CardHeader>
                        <CardTitle>
                           {child.firstName} {child.lastName}
                        </CardTitle>
                        <CardDescription>
                           Born {formatDate(child.dob)} ·{" "}
                           {child.gender.replace(/_/g, " ")}
                        </CardDescription>
                     </CardHeader>
                     <CardContent className="space-y-4">
                        <div className="space-y-2">
                           <DetailRow
                              label="Allergies"
                              value={child.allergies}
                           />
                           <DetailRow
                              label="Medical conditions"
                              value={child.medicalConditions}
                           />
                           <DetailRow
                              label="Medications"
                              value={child.medications}
                           />
                        </div>

                        <div className="space-y-2 border-t border-border pt-4">
                           <p className="text-sm font-medium">
                              Emergency contacts
                           </p>
                           {child.emergencyContacts.length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                 None on file.
                              </p>
                           ) : (
                              child.emergencyContacts.map((contact) => (
                                 <div
                                    key={`${child.id}-${contact.emailAddress}`}
                                    className="text-sm"
                                 >
                                    <p className="font-medium">
                                       {contact.fullName}{" "}
                                       <span className="font-normal text-muted-foreground">
                                          ({contact.relationship})
                                       </span>
                                    </p>
                                    <p className="text-muted-foreground">
                                       {contact.phoneNumber} ·{" "}
                                       {contact.emailAddress}
                                    </p>
                                 </div>
                              ))
                           )}
                        </div>
                     </CardContent>
                  </Card>
               ))}
            </div>
         )}
      </main>
   );
}
