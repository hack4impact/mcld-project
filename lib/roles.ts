export const ROLES = {
   ADMIN: "admin",
   COORDINATOR: "coordinator",
   USER: "user",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export function isAdminRole(role: Role): boolean {
   return role === ROLES.ADMIN || role === ROLES.COORDINATOR;
}
