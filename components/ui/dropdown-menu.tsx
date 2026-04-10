"use client";

import * as React from "react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

const DropdownMenu = DropdownMenuPrimitive.Root;

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

const DropdownMenuGroup = DropdownMenuPrimitive.Group;

const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

const DropdownMenuSub = DropdownMenuPrimitive.Sub;

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

function DropdownMenuSubTrigger({
   className,
   ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger>) {
   return (
      <DropdownMenuPrimitive.SubTrigger
         className={cn(
            "focus:bg-accent data-[state=open]:bg-accent flex cursor-default items-center rounded-md px-2 py-1.5 text-sm outline-none select-none",
            className
         )}
         {...props}
      />
   );
}

function DropdownMenuSubContent({
   className,
   ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
   return (
      <DropdownMenuPrimitive.SubContent
         className={cn(
            "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-md",
            className
         )}
         {...props}
      />
   );
}

function DropdownMenuContent({
   className,
   sideOffset = 4,
   ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
   return (
      <DropdownMenuPrimitive.Portal>
         <DropdownMenuPrimitive.Content
            sideOffset={sideOffset}
            className={cn(
               "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[10rem] overflow-hidden rounded-md border p-1 shadow-md",
               className
            )}
            {...props}
         />
      </DropdownMenuPrimitive.Portal>
   );
}

function DropdownMenuItem({
   className,
   ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item>) {
   return (
      <DropdownMenuPrimitive.Item
         className={cn(
            "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
            className
         )}
         {...props}
      />
   );
}

function DropdownMenuSeparator({
   className,
   ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
   return (
      <DropdownMenuPrimitive.Separator
         className={cn("bg-muted -mx-1 my-1 h-px", className)}
         {...props}
      />
   );
}

export {
   DropdownMenu,
   DropdownMenuTrigger,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuSeparator,
   DropdownMenuGroup,
   DropdownMenuPortal,
   DropdownMenuSub,
   DropdownMenuSubTrigger,
   DropdownMenuSubContent,
   DropdownMenuRadioGroup,
};
