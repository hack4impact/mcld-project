"use client";

import { useActionState, useEffect, useState } from "react";
import { createUserAdmin, updateUserAdmin, type UserAdminActionState } from "../actions";
import type { UserRow } from "../profile-role-label";
import { ROLES } from "@/lib/roles";
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

export function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<string>(ROLES.USER);
  const [state, formAction, pending] = useActionState<
    UserAdminActionState,
    FormData
  >(createUserAdmin, null);

  useEffect(() => {
    if (state?.message) {
      setOpen(false);
      setRole(ROLES.USER);
    }
  }, [state?.message]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add user</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          {state?.errors?._form?.map((msg) => (
            <p key={msg} className="text-sm text-destructive">
              {msg}
            </p>
          ))}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="first_name">First name</Label>
              <Input id="first_name" name="first_name" required />
              <FieldError errors={state?.errors?.first_name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last name</Label>
              <Input id="last_name" name="last_name" required />
              <FieldError errors={state?.errors?.last_name} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
            <FieldError errors={state?.errors?.email} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              minLength={8}
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
                required
                autoComplete="new-password"
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
                <SelectItem value={ROLES.COACH}>Coach</SelectItem>
                <SelectItem value={ROLES.ADMIN}>Admin</SelectItem>
              </SelectContent>
            </Select>
            <input type="hidden" name="role" value={role} />
            <FieldError errors={state?.errors?.role} />
          </div>

          {state?.message && (
            <p className="text-sm text-muted-foreground">{state.message}</p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type EditUserDialogProps = {
    user: UserRow;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  };
  
  export function EditUserDialog({ user, open, onOpenChange }: EditUserDialogProps) {
    const [role, setRole] = useState(user.role);
    const [state, formAction, pending] = useActionState<
      UserAdminActionState,
      FormData
    >(updateUserAdmin, null);
  
    // Reset role when opening a different user
    useEffect(() => {
      if (open) setRole(user.role);
    }, [open, user.id, user.role]);
  
    useEffect(() => {
      if (state?.message) onOpenChange(false);
    }, [state?.message, onOpenChange]);
  
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
          </DialogHeader>
          <form action={formAction} className="flex flex-col gap-4" key={user.id}>
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
                defaultValue={user.email}
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
                  <SelectItem value={ROLES.COACH}>Coach</SelectItem>
                  <SelectItem value={ROLES.ADMIN}>Admin</SelectItem>
                </SelectContent>
              </Select>
              <input type="hidden" name="role" value={role} />
              <FieldError errors={state?.errors?.role} />
            </div>
  
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }