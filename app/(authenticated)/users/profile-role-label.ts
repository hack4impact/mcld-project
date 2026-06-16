/** Shared between server (`page.tsx`) and client (`users-columns`). No `"use client"`. */

const ROLE_LABELS: Record<string, string> = {
   admin: "Admin",
   coordinator: "Coordinator",
   user: "User",
};

export function profileRoleLabel(role: string): string {
   return ROLE_LABELS[role] ?? role;
}

export type UserRow = {
   id: string;
   firstName: string;
   lastName: string;
   email: string;
   role: string;
   isActive: boolean;
   lastLoginAt: Date;
   stripeCustomerId: string | null;
};
