import { Layout } from "@/components/layout"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <Layout>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {children}
      </div>
    </Layout>
  );
}