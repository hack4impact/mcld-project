export const ROLES = {
  ADMIN: "admin",
  COACH: "coach",
  USER: "user",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
