"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PromptDialog } from "./prompt-dialog";
import { MoreHorizontal, Edit, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Prompt {
  id: string;
  text: string;
  country: string;
  createdAt: string;
  updatedAt: string;
}

interface PromptsTableProps {
  data: Prompt[];
}

export function PromptsTable({
  data,
  onPromptSaved,
  onPromptDeleted
}: PromptsTableProps & {
  onPromptSaved?: (prompt: Prompt) => void;
  onPromptDeleted?: (promptId: string) => void;
}) {
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [deletingPrompt, setDeletingPrompt] = useState<Prompt | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handlePromptSaved = (savedPrompt: Prompt) => {
    if (editingPrompt) {
      // Update existing prompt - let parent handle state update
      onPromptSaved?.(savedPrompt);
    } else {
      // Add new prompt - let parent handle state update
      onPromptSaved?.(savedPrompt);
    }
    setEditingPrompt(null);
  };

  const handleDeletePrompt = async () => {
    if (!deletingPrompt) return;

    try {
      const response = await fetch(`/api/prompts/${deletingPrompt.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete prompt");
      }

      // Remove prompt from the list - let parent handle state update
      onPromptDeleted?.(deletingPrompt.id);
      setDeletingPrompt(null);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting prompt:", error);
      // You could add a toast notification here
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">No prompts yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first prompt to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative w-full overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Prompt</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((prompt) => (
              <TableRow key={prompt.id}>
                <TableCell className="font-medium">
                  <div className="max-w-md truncate" title={prompt.text}>
                    {prompt.text}
                  </div>
                </TableCell>
                <TableCell>{prompt.country}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(prompt.createdAt)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0"
                      >
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setEditingPrompt(prompt)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setDeletingPrompt(prompt);
                          setIsDeleteDialogOpen(true);
                        }}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <PromptDialog
        prompt={editingPrompt || undefined}
        onSuccess={handlePromptSaved}
        open={!!editingPrompt}
        onOpenChange={(open) => !open && setEditingPrompt(null)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the prompt &quot;{deletingPrompt?.text.substring(0, 50)}
              {deletingPrompt && deletingPrompt.text.length > 50 ? "..." : ""}&quot;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePrompt}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}