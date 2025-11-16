import { Layout } from "@/components/layout"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"

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

  // Check if user has any organizations
  const userOrganizations = await prisma.organization.findMany({
    where: {
      members: {
        some: {
          userId: session.user.id,
        },
      },
    },
  });

  // If no organizations, redirect to signup to create one
  if (userOrganizations.length === 0) {
    redirect("/signup");
  }

  // If session has no active organization, set the first one
  if (!session.session.activeOrganizationId && userOrganizations.length > 0) {
    await prisma.session.updateMany({
      where: {
        userId: session.user.id,
      },
      data: {
        activeOrganizationId: userOrganizations[0].id,
      },
    });
  }

  return (
    <Layout>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {children}
      </div>
    </Layout>
  );
}