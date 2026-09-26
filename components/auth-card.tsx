import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
} from "@/components/ui/card";

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
      <div className="flex min-h-screen items-center justify-center p-4">
         <Card className="w-full max-w-md">
            <CardHeader>
               <CardTitle className="text-2xl">{title}</CardTitle>
               {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
            <CardContent>{children}</CardContent>
         </Card>
      </div>
   );
}

export function AuthAlert({
   tone,
   children,
}: {
   tone: "success" | "error";
   children: React.ReactNode;
}) {
   return (
      <div
         role={tone === "error" ? "alert" : "status"}
         className={
            tone === "error"
               ? "mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive"
               : "mb-4 rounded-md bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400"
         }
      >
         {children}
      </div>
   );
}
