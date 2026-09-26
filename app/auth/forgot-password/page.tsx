import { AuthCard } from "@/components/auth-card";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
   return (
      <AuthCard
         title="Forgot your password?"
         description="Enter your account's email and we'll send you a link to choose a new password."
      >
         <ForgotPasswordForm />
      </AuthCard>
   );
}
