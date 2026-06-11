import { randomBytes } from "node:crypto";

export function generateScheduleToken(): string {
   return randomBytes(24).toString("base64url");
}
