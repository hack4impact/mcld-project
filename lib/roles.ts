export const ROLES = {
  ADMIN: "admin",
  COORDINATOR: "coordinator",
  USER: "user",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
