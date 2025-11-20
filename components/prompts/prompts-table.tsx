'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Trash2, Check, Archive } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDeletePrompt, useUpdatePrompt, Prompt } from '@/hooks/use-prompts';
import { toast } from 'sonner';

interface PromptsTableProps {
  data: Prompt[];
  showStatusActions?: boolean;
}

export function PromptsTable({
  data,
  showStatusActions = false,
}: PromptsTableProps) {
  const [deletingPrompt, setDeletingPrompt] = useState<Prompt | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { deletePrompt } = useDeletePrompt();
  const { updatePrompt } = useUpdatePrompt();

  const handleDeletePrompt = async () => {
    if (!deletingPrompt) return;

    try {
      // Delete logic is now "Archive" in the backend for ACTIVE/SUGGESTED
      await deletePrompt(deletingPrompt.id);
      toast.success('Prompt archived successfully');
      setDeletingPrompt(null);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to archive prompt',
      );
    }
  };

  const handleApprovePrompt = async (prompt: Prompt) => {
    try {
      await updatePrompt(prompt.id, { status: 'ACTIVE' });
      toast.success('Prompt approved and active');
    } catch (error) {
      toast.error('Failed to approve prompt');
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    const years = Math.floor(days / 365);
    return `${years}y ago`;
  };

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="text-center">
          <h3 className="mb-2 text-lg font-medium">No prompts found</h3>
          <p className="mb-4 text-muted-foreground">
            Try adjusting your filters or create a new prompt.
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
              <TableHead>Brand</TableHead>
              {!showStatusActions && (
                <>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Sentiment</TableHead>
                  <TableHead>Position</TableHead>
                </>
              )}
              <TableHead>Created</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((prompt) => (
              <TableRow key={prompt.id}>
                <TableCell className="align-top font-medium">
                  <div
                    className="line-clamp-3 max-w-md whitespace-normal break-words"
                    title={prompt.text}
                  >
                    {prompt.text}
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  {prompt.brand?.name || prompt.brand?.domain || 'N/A'}
                </TableCell>
                {!showStatusActions && (
                  <>
                    <TableCell className="align-top">
                      {prompt.visibilityScore != null
                        ? `${prompt.visibilityScore.toFixed(0)}%`
                        : '-'}
                    </TableCell>
                    <TableCell className="align-top">
                      {prompt.averageSentiment != null
                        ? prompt.averageSentiment.toFixed(1)
                        : '-'}
                    </TableCell>
                    <TableCell className="align-top">
                      {prompt.averagePosition != null
                        ? prompt.averagePosition.toFixed(1)
                        : '-'}
                    </TableCell>
                  </>
                )}
                <TableCell className="whitespace-nowrap align-top text-muted-foreground">
                  {formatTimeAgo(prompt.createdAt)}
                </TableCell>
                <TableCell className="align-top">
                  <div className="flex items-center justify-end gap-2">
                    {prompt.status === 'SUGGESTED' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-green-600 hover:bg-green-50 hover:text-green-700"
                        onClick={() => handleApprovePrompt(prompt)}
                        title="Approve"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setDeletingPrompt(prompt);
                            setIsDeleteDialogOpen(true);
                          }}
                          className="text-red-600 focus:text-red-600"
                        >
                          {prompt.status === 'ARCHIVED' ? (
                            <>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Permanently
                            </>
                          ) : (
                            <>
                              <Archive className="mr-2 h-4 w-4" />
                              Archive
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deletingPrompt?.status === 'ARCHIVED'
                ? 'Delete Permanently?'
                : 'Archive Prompt?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deletingPrompt?.status === 'ARCHIVED' ? (
                <>
                  This will <strong>permanently delete</strong> the prompt
                  &quot;
                  {deletingPrompt?.text.substring(0, 50)}
                  {deletingPrompt && deletingPrompt.text.length > 50
                    ? '...'
                    : ''}
                  &quot;. This action cannot be undone.
                </>
              ) : (
                <>
                  This will archive the prompt &quot;
                  {deletingPrompt?.text.substring(0, 50)}
                  {deletingPrompt && deletingPrompt.text.length > 50
                    ? '...'
                    : ''}
                  &quot;. You can restore it later from the Archived tab.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePrompt}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deletingPrompt?.status === 'ARCHIVED' ? 'Delete' : 'Archive'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
