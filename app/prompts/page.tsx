"use client";

import { PromptsTable } from "@/components/prompts/prompts-table";
import { AddPromptButton } from "@/components/prompts/prompt-dialog";
import { Layout } from "@/components/layout";
import { usePrompts } from "@/hooks/use-prompts";

// Force dynamic rendering for authentication
export const dynamic = "force-dynamic";

export default function PromptsPage() {
  const { prompts, error } = usePrompts();

  return (
    <Layout breadcrumbs={[{ label: "Prompts" }]}>
      <div className="flex-1 space-y-4 p-4 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <p className="text-muted-foreground">Manage your AI prompts</p>
          </div>
          <div className="flex items-center space-x-2">
            <AddPromptButton />
          </div>
        </div>

        <div className="border rounded-lg bg-card">
          {error ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <p className="text-destructive mb-2">Failed to load prompts</p>
                <p className="text-muted-foreground text-sm">
                  {error.message || "Please try again later"}
                </p>
              </div>
            </div>
          ) : (
            <PromptsTable data={prompts} />
          )}
        </div>
      </div>
    </Layout>
  );
}
