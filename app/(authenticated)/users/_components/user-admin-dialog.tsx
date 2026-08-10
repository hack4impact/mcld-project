"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
   createUserAdmin,
   updateUserAdmin,
   type UserAdminActionState,
} from "../actions";
import type { UserRow } from "../profile-role-label";
import { ROLES } from "@/lib/roles";
import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
   Dialog,
   DialogContent,
   DialogFooter,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";

function FieldError({ errors }: { errors?: string[] }) {
   if (!errors?.length) return null;
   return <p className="text-sm text-destructive">{errors[0]}</p>;
}

function useActionConfirm(
   state: UserAdminActionState | null,
   pending: boolean,
   onSuccess: () => void,
) {
   const [confirmOpen, setConfirmOpen] = useState(false);
   const prevStateRef = useRef(state);

   useEffect(() => {
      if (state === prevStateRef.current) return;
      prevStateRef.current = state;
      if (state?.message) onSuccess();
   }, [state, onSuccess]);

   const confirmVisible =
      confirmOpen &&
      !state?.message &&
      !(state?.errors && !pending);

   function openConfirm() {
      setConfirmOpen(false);
      queueMicrotask(() => setConfirmOpen(true));
   }

   return { confirmVisible, openConfirm, setConfirmOpen };
}

type ConfirmAlertProps = {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   title: string;
   description: string;
   confirmLabel: string;
   pending: boolean;
   onConfirm: () => void;
};

function ConfirmAlert({
   open,
   onOpenChange,
   title,
   description,
   confirmLabel,
   pending,
   onConfirm,
}: ConfirmAlertProps) {
   return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
         <AlertDialogContent className="sm:max-w-md">
            <AlertDialogHeader className="place-items-start text-left sm:place-items-start sm:text-left">
               <AlertDialogTitle>{title}</AlertDialogTitle>
               <AlertDialogDescription>{description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="sm:flex-row sm:justify-end">
               <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
               <AlertDialogAction
                  disabled={pending}
                  onClick={(e) => {
                     e.preventDefault();
                     onConfirm();
                  }}
               >
                  {pending ? "Please wait…" : confirmLabel}
               </AlertDialogAction>
            </AlertDialogFooter>
         </AlertDialogContent>
      </AlertDialog>
   );
}

const CREATE_DEFAULTS = {
   firstName: "",
   lastName: "",
   email: "",
   password: "",
   confirmPassword: "",
   role: ROLES.USER,
   subscriptionMonths: "0",
};

type CreateUserFormContentProps = {
   onSuccess: () => void;
   onCancel: () => void;
};

function CreateUserFormContent({
   onSuccess,
   onCancel,
}: CreateUserFormContentProps) {
   const [firstName, setFirstName] = useState(CREATE_DEFAULTS.firstName);
   const [lastName, setLastName] = useState(CREATE_DEFAULTS.lastName);
   const [email, setEmail] = useState(CREATE_DEFAULTS.email);
   const [password, setPassword] = useState(CREATE_DEFAULTS.password);
   const [confirmPassword, setConfirmPassword] = useState(
      CREATE_DEFAULTS.confirmPassword,
   );
   const [role, setRole] = useState<string>(CREATE_DEFAULTS.role);
   const [subscriptionMonths, setSubscriptionMonths] = useState(
      CREATE_DEFAULTS.subscriptionMonths,
   );

   const formRef = useRef<HTMLFormElement>(null);
   const [state, formAction, pending] = useActionState<
      UserAdminActionState,
      FormData
   >(createUserAdmin, null);

   const { confirmVisible, openConfirm, setConfirmOpen } = useActionConfirm(
      state,
      pending,
      onSuccess,
   );

   return (
      <>
         <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
         </DialogHeader>
         <form
            ref={formRef}
            action={formAction}
            className="flex flex-col gap-4"
            noValidate
         >
            {state?.errors?._form?.map((msg) => (
               <p key={msg} className="text-sm text-destructive">
                  {msg}
               </p>
            ))}

            <div className="grid grid-cols-2 gap-3">
               <div className="space-y-2">
                  <Label htmlFor="first_name">First name</Label>
                  <Input
                     id="first_name"
                     name="first_name"
                     value={firstName}
                     onChange={(e) => setFirstName(e.target.value)}
                     required
                  />
                  <FieldError errors={state?.errors?.first_name} />
               </div>
               <div className="space-y-2">
                  <Label htmlFor="last_name">Last name</Label>
                  <Input
                     id="last_name"
                     name="last_name"
                     value={lastName}
                     onChange={(e) => setLastName(e.target.value)}
                     required
                  />
                  <FieldError errors={state?.errors?.last_name} />
               </div>
            </div>

            <div className="space-y-2">
               <Label htmlFor="email">Email</Label>
               <Input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
               />
               <FieldError errors={state?.errors?.email} />
            </div>

            <div className="space-y-2">
               <Label htmlFor="password">Password</Label>
               <Input
                  id="password"
                  name="password"
                  type="password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
               />
               <FieldError errors={state?.errors?.password} />
            </div>

            <div className="space-y-2">
               <Label htmlFor="confirm_password">Confirm password</Label>
               <Input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
               />
               <FieldError errors={state?.errors?.confirm_password} />
            </div>

            <div className="space-y-2">
               <Label htmlFor="role">Role</Label>
               <Select value={role} onValueChange={setRole}>
                  <SelectTrigger id="role">
                     <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                     <SelectItem value={ROLES.USER}>User</SelectItem>
                     <SelectItem value={ROLES.COORDINATOR}>
                        Coordinator
                     </SelectItem>
                     <SelectItem value={ROLES.ADMIN}>Admin</SelectItem>
                  </SelectContent>
               </Select>
               <input type="hidden" name="role" value={role} />
               <FieldError errors={state?.errors?.role} />
            </div>

            {role === ROLES.USER && (
               <div className="space-y-2">
                  <Label htmlFor="subscription_months">
                     Subscription Months
                  </Label>
                  <Input
                     id="subscription_months"
                     name="subscription_months"
                     type="number"
                     min={0}
                     max={24}
                     value={subscriptionMonths}
                     onChange={(e) => setSubscriptionMonths(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                     Creates a trial on the platform plan.
                  </p>
                  <FieldError errors={state?.errors?.subscription_months} />
               </div>
            )}

            {role !== ROLES.USER && (
               <input type="hidden" name="subscription_months" value="0" />
            )}

            <button type="submit" className="sr-only" tabIndex={-1}>
               Submit
            </button>

            <DialogFooter>
               <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={pending}
               >
                  Cancel
               </Button>
               <Button
                  type="button"
                  onClick={openConfirm}
                  disabled={pending}
               >
                  Create user
               </Button>
            </DialogFooter>
         </form>

         <ConfirmAlert
            open={confirmVisible}
            onOpenChange={setConfirmOpen}
            title="Create user?"
            description="Are you sure you want to create this user?"
            confirmLabel="Yes, create user"
            pending={pending}
            onConfirm={() => formRef.current?.requestSubmit()}
         />
      </>
   );
}

export function CreateUserDialog() {
   const [open, setOpen] = useState(false);
   const [formKey, setFormKey] = useState(0);

   function handleOpenChange(next: boolean) {
      setOpen(next);
      if (!next) {
         setFormKey((k) => k + 1);
      }
   }

   function handleSuccess() {
      setOpen(false);
      setFormKey((k) => k + 1);
   }

   return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
         <DialogTrigger asChild className=''>
            <Button>
               Add user
            </Button>
         </DialogTrigger>
         {open && (
            <DialogContent className="sm:max-w-md">
               <CreateUserFormContent
                  key={formKey}
                  onSuccess={handleSuccess}
                  onCancel={() => handleOpenChange(false)}
               />
            </DialogContent>
         )}
      </Dialog>
   );
}

type EditUserFormContentProps = {
   user: UserRow;
   onSuccess: () => void;
   onCancel: () => void;
};

function EditUserFormContent({
   user,
   onSuccess,
   onCancel,
}: EditUserFormContentProps) {
   const [email, setEmail] = useState(user.email);
   const [role, setRole] = useState(user.role);

   const formRef = useRef<HTMLFormElement>(null);
   const [state, formAction, pending] = useActionState<
      UserAdminActionState,
      FormData
   >(updateUserAdmin, null);

   const { confirmVisible, openConfirm, setConfirmOpen } = useActionConfirm(
      state,
      pending,
      onSuccess,
   );

   return (
      <>
         <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
         </DialogHeader>
         <form
            ref={formRef}
            action={formAction}
            className="flex flex-col gap-4"
            noValidate
         >
            {state?.errors?._form?.map((msg) => (
               <p key={msg} className="text-sm text-destructive">
                  {msg}
               </p>
            ))}

            <input type="hidden" name="user_id" value={user.id} />

            <p className="text-sm text-muted-foreground">
               {user.firstName} {user.lastName}
            </p>

            <div className="space-y-2">
               <Label htmlFor="edit_email">Email</Label>
               <Input
                  id="edit_email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
               />
               <FieldError errors={state?.errors?.email} />
            </div>

            <div className="space-y-2">
               <Label htmlFor="edit_role">Role</Label>
               <Select value={role} onValueChange={setRole}>
                  <SelectTrigger id="edit_role">
                     <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                     <SelectItem value={ROLES.USER}>User</SelectItem>
                     <SelectItem value={ROLES.COORDINATOR}>
                        Coordinator
                     </SelectItem>
                     <SelectItem value={ROLES.ADMIN}>Admin</SelectItem>
                  </SelectContent>
               </Select>
               <input type="hidden" name="role" value={role} />
               <FieldError errors={state?.errors?.role} />
            </div>

            <button type="submit" className="sr-only" tabIndex={-1}>
               Submit
            </button>

            <DialogFooter>
               <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={pending}
               >
                  Cancel
               </Button>
               <Button
                  type="button"
                  onClick={openConfirm}
                  disabled={pending}
               >
                  Save changes
               </Button>
            </DialogFooter>
         </form>

         <ConfirmAlert
            open={confirmVisible}
            onOpenChange={setConfirmOpen}
            title="Save changes?"
            description="Are you sure you want to save these changes?"
            confirmLabel="Yes, save changes"
            pending={pending}
            onConfirm={() => formRef.current?.requestSubmit()}
         />
      </>
   );
}

type EditUserDialogProps = {
   user: UserRow;
   open: boolean;
   onOpenChange: (open: boolean) => void;
};

export function EditUserDialog({
   user,
   open,
   onOpenChange,
}: EditUserDialogProps) {
   const [formKey, setFormKey] = useState(0);

   function handleOpenChange(next: boolean) {
      onOpenChange(next);
      if (!next) {
         setFormKey((k) => k + 1);
      }
   }

   function handleSuccess() {
      handleOpenChange(false);
   }

   return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
         {open && (
            <DialogContent className="sm:max-w-md">
               <EditUserFormContent
                  key={formKey}
                  user={user}
                  onSuccess={handleSuccess}
                  onCancel={() => handleOpenChange(false)}
               />
            </DialogContent>
         )}
      </Dialog>
   );
}
