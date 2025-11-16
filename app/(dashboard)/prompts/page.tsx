"use client";

import { PromptsTable } from "@/components/prompts/prompts-table";
import { AddPromptButton } from "@/components/prompts/prompt-dialog";
import { usePrompts } from "@/hooks/use-prompts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Force dynamic rendering for authentication
export const dynamic = "force-dynamic";

export default function PromptsPage() {
  const { prompts, error } = usePrompts();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>AI Prompts</CardTitle>
              <CardDescription>
                Create and manage your prompt templates
              </CardDescription>
            </div>
            <AddPromptButton />
          </div>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
