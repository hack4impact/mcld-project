const DEFAULT_LABELS: Record<string, string> = {
   admin: "Admin",
   coach: "Coach",
   user: "User",
};

export function profileRoleLabel(role: string): string {
   return DEFAULT_LABELS[role] ?? role;
}
