"use client";

import { useState, useEffect } from "react";
import { PromptsTable } from "@/components/prompts/prompts-table";
import { AddPromptButton } from "@/components/prompts/prompt-dialog";
import { Layout } from "@/components/layout";

interface Prompt {
  id: string;
  text: string;
  country: string;
  createdAt: string;
  updatedAt: string;
}

// Force dynamic rendering for authentication
export const dynamic = "force-dynamic";

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function fetchPrompts() {
    try {
      const response = await fetch("/api/prompts");
      if (response.ok) {
        const data = await response.json();
        setPrompts(data);
      }
    } catch (error) {
      console.error("Error fetching prompts:", error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchPrompts();
  }, []);

  const handlePromptUpdated = (updatedPrompt: Prompt) => {
    // Handle both new prompts and updated prompts
    setPrompts((prev) => {
      const existingIndex = prev.findIndex((p) => p.id === updatedPrompt.id);
      if (existingIndex >= 0) {
        // Update existing prompt
        return prev.map((p) => (p.id === updatedPrompt.id ? updatedPrompt : p));
      } else {
        // Add new prompt to the beginning
        return [updatedPrompt, ...prev];
      }
    });
  };

  const handlePromptDeleted = (deletedPromptId: string) => {
    // Remove the deleted prompt from the state
    setPrompts((prev) => prev.filter((p) => p.id !== deletedPromptId));
  };

  return (
    <Layout breadcrumbs={[{ label: "Prompts" }]}>
      <div className="flex-1 space-y-4 p-4 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <p className="text-muted-foreground">Manage your AI prompts</p>
          </div>
          <div className="flex items-center space-x-2">
            <AddPromptButton onSuccess={handlePromptUpdated} />
          </div>
        </div>

        <div className="border rounded-lg bg-card">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <PromptsTable
              data={prompts}
              onPromptSaved={handlePromptUpdated}
              onPromptDeleted={handlePromptDeleted}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}
