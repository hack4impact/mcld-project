import { cn } from "@/lib/utils";

export function PageShell({
   children,
   className,
   fill = false,
}: {
   children: React.ReactNode;
   className?: string;
   fill?: boolean;
}) {
   return (
      <div
         className={cn(
            "flex w-full min-w-0 flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8",
            fill
               ? "h-full max-h-full min-h-0 overflow-hidden"
               : "overflow-y-auto",
            className,
         )}
      >
         {children}
      </div>
   );
}

export function PageHeader({
   title,
   description,
   actions,
   badge,
   eyebrow,
   className,
}: {
   title: React.ReactNode;
   description?: React.ReactNode;
   actions?: React.ReactNode;
   badge?: React.ReactNode;
   eyebrow?: React.ReactNode;
   className?: string;
}) {
   return (
      <header
         className={cn(
            "flex shrink-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
            className,
         )}
      >
         <div className="flex min-w-0 flex-col gap-1.5">
            {eyebrow}
            <div className="flex flex-wrap items-center gap-3">
               <h1 className="text-2xl font-semibold text-foreground md:text-3xl">
                  {title}
               </h1>
               {badge}
            </div>
            {description && (
               <p className="max-w-2xl text-sm text-muted-foreground md:text-[0.95rem]">
                  {description}
               </p>
            )}
         </div>
         {actions && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
               {actions}
            </div>
         )}
      </header>
   );
}

export function EmptyState({
   icon,
   title,
   description,
   action,
   className,
}: {
   icon?: React.ReactNode;
   title: React.ReactNode;
   description?: React.ReactNode;
   action?: React.ReactNode;
   className?: string;
}) {
   return (
      <div
         className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/60 px-6 py-14 text-center",
            className,
         )}
      >
         {icon && (
            <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-primary [&_svg]:size-6">
               {icon}
            </div>
         )}
         <div className="flex flex-col gap-1">
            <p className="font-heading text-base font-semibold text-foreground">
               {title}
            </p>
            {description && (
               <p className="max-w-sm text-sm text-muted-foreground">
                  {description}
               </p>
            )}
         </div>
         {action}
      </div>
   );
}
