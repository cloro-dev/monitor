import { ResetPasswordConfirmForm } from '@/components/auth/reset-password-confirm-form';

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <ResetPasswordConfirmForm searchParams={searchParams} />
      </div>
    </div>
  );
}
