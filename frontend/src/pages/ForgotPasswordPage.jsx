import { KeyRound } from "lucide-react";
import { AuthLayout, AuthCard } from "@/components/auth/AuthLayout";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <div className="md:col-span-2 max-w-md mx-auto w-full">
        <AuthCard icon={KeyRound} label="Forgot Password" title="Reset Your Password" subtitle="Enter your registered email and we'll send you a secure reset link." testId="forgot-password-card">
          <ForgotPasswordForm />
        </AuthCard>
      </div>
    </AuthLayout>
  );
}
