import Image from "next/image";
import { CircleAlert, CircleCheck } from "lucide-react";

import { cn } from "@/lib/utils";

export function AuthShell({ children }: { children: React.ReactNode }) {
   return (
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
         <BrandPanel />

         <div className="flex items-center justify-center px-4 py-10 sm:px-8">
            <div className="w-full max-w-md">
               <Image
                  src="/logo.png"
                  alt="Montréal Centre for Learning Disabilities"
                  width={200}
                  height={66}
                  className="mb-10 h-12 w-auto"
                  priority
               />
               {children}
            </div>
         </div>
      </div>
   );
}

function BrandPanel() {
   return (
      <div className="relative hidden overflow-hidden bg-[#263962] lg:block">
         <Image
            src="/login-hero.png"
            alt="A smiling teacher working with a young student at her desk"
            fill
            priority
            sizes="40vw"
            className="object-cover object-[70%_50%]"
         />
      </div>
   );
}

export function AuthHeading({
   title,
   description,
}: {
   title: string;
   description?: React.ReactNode;
}) {
   return (
      <div className="mb-8 flex flex-col gap-2">
         <h1 className="text-3xl font-semibold">{title}</h1>
         {description && <p className="text-muted-foreground">{description}</p>}
      </div>
   );
}

export function AuthCard({
   title,
   description,
   children,
}: {
   title: string;
   description?: React.ReactNode;
   children: React.ReactNode;
}) {
   return (
      <AuthShell>
         <AuthHeading title={title} description={description} />
         {children}
      </AuthShell>
   );
}

export function AuthAlert({
   tone,
   children,
}: {
   tone: "success" | "error";
   children: React.ReactNode;
}) {
   const Icon = tone === "error" ? CircleAlert : CircleCheck;
   return (
      <div
         role={tone === "error" ? "alert" : "status"}
         className={cn(
            "mb-6 flex items-start gap-2 rounded-xl p-3.5 text-sm font-medium",
            tone === "error"
               ? "bg-destructive/10 text-destructive"
               : "bg-success-soft text-success",
         )}
      >
         <Icon className="mt-0.5 size-4 shrink-0" />
         <div>{children}</div>
      </div>
   );
}
