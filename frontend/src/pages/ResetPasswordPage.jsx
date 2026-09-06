import { ShieldCheck } from "lucide-react";
import { AuthLayout, AuthCard } from "@/components/auth/AuthLayout";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <AuthLayout>
      <div className="md:col-span-2 max-w-md mx-auto w-full">
        <AuthCard icon={ShieldCheck} label="Reset Password" title="Choose a New Password" subtitle="Use at least 8 characters with a letter and a number." testId="reset-password-card">
          <ResetPasswordForm />
        </AuthCard>
      </div>
    </AuthLayout>
  );
}
