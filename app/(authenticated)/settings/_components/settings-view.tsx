import Link from "next/link";
import { Baby, ChevronRight, CreditCard, LogOut } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
} from "@/components/ui/card";
import { PageHeader, PageShell } from "@/components/page-shell";
import { ROLES } from "@/lib/roles";
import { signout } from "@/app/login/actions";
import { profileRoleLabel } from "@/app/(authenticated)/users/profile-role-label";
import { ProfileForm, type OwnProfile } from "./profile-form";
import { PasswordForm } from "./password-form";
import { SubscriptionCard } from "./subscription-card";
import type { SubscriptionDetails } from "@/lib/stripe";

const USER_LINKS = [
   {
      href: "/memberships",
      icon: CreditCard,
      title: "Membership",
      description: "Manage your subscription",
   },
   {
      href: "/children",
      icon: Baby,
      title: "My children",
      description: "Add or update your children",
   },
];

export function SettingsView({
   profile,
   email,
   subscription,
}: {
   profile: OwnProfile & { role: string };
   email: string;
   subscription?: SubscriptionDetails;
}) {
   const fullName = `${profile.firstName} ${profile.lastName}`.trim();
   const initials =
      `${profile.firstName[0] ?? ""}${profile.lastName[0] ?? ""}`.toUpperCase();

   return (
      <PageShell>
         <PageHeader
            title="Settings"
            description="Manage your profile, password, and account."
         />
         <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="flex min-w-0 flex-col gap-6 lg:col-start-2 lg:row-start-1">
               <Card>
                  <CardHeader className="border-b">
                     <CardTitle className="text-base font-semibold">
                        Account
                     </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                     <div className="flex items-center gap-3">
                        <Avatar className="size-11">
                           <AvatarFallback className="bg-secondary text-sm font-semibold text-secondary-foreground">
                              {initials}
                           </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                           <p className="truncate font-semibold text-foreground">
                              {fullName}
                           </p>
                           <Badge variant="secondary" className="mt-1">
                              {profileRoleLabel(profile.role)}
                           </Badge>
                        </div>
                     </div>
                     <dl className="flex flex-col gap-1 text-sm">
                        <dt className="text-xs font-medium text-muted-foreground">
                           Email
                        </dt>
                        <dd className="truncate font-medium" title={email}>
                           {email}
                        </dd>
                     </dl>
                     <p className="text-xs text-muted-foreground">
                        To change your email or role, contact an administrator.
                     </p>
                     <form>
                        <Button
                           formAction={signout}
                           variant="outline"
                           className="w-full"
                        >
                           <LogOut />
                           Sign out
                        </Button>
                     </form>
                  </CardContent>
               </Card>

               {subscription !== undefined && (
                  <SubscriptionCard subscription={subscription} />
               )}

               {profile.role === ROLES.USER && (
                  <Card size="sm">
                     <CardHeader>
                        <CardTitle className="text-sm font-semibold">
                           Your family & membership
                        </CardTitle>
                        <CardDescription className="text-[0.8rem]">
                           Shortcuts to the rest of your account.
                        </CardDescription>
                     </CardHeader>
                     <CardContent className="flex flex-col px-2">
                        {USER_LINKS.map((link) => (
                           <Link
                              key={link.href}
                              href={link.href}
                              className="group flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted"
                           >
                              <span className="flex size-8 items-center justify-center rounded-lg bg-secondary text-primary">
                                 <link.icon className="size-4" />
                              </span>
                              <span className="flex min-w-0 flex-1 flex-col">
                                 <span className="text-sm font-semibold">
                                    {link.title}
                                 </span>
                                 <span className="text-xs text-muted-foreground">
                                    {link.description}
                                 </span>
                              </span>
                              <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                           </Link>
                        ))}
                     </CardContent>
                  </Card>
               )}
            </div>
            <div className="flex min-w-0 flex-col gap-6 lg:col-start-1 lg:row-start-1">
               <ProfileForm profile={profile} />
               <PasswordForm />
            </div>
         </div>
      </PageShell>
   );
}
