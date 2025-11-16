import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { PromptsTable } from "@/components/prompts/prompts-table";
import { AddPromptButton } from "@/components/prompts/prompt-dialog";
import { headers } from "next/headers";

async function getPrompts() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return [];
  }

  const prompts = await prisma.prompt.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      text: true,
      country: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return prompts.map(prompt => ({
    ...prompt,
    createdAt: prompt.createdAt.toISOString(),
    updatedAt: prompt.updatedAt.toISOString(),
  }));
}

export default async function PromptsPage() {
  const prompts = await getPrompts();

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Prompts</h2>
          <p className="text-muted-foreground">
            Manage your AI prompts organized by country
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <AddPromptButton />
        </div>
      </div>

      <div className="border rounded-lg bg-card">
        <PromptsTable data={prompts} />
      </div>
    </div>
  );
}