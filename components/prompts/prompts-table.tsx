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
import { MoreHorizontal, Trash2, Check, Archive, Pencil } from 'lucide-react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDeletePrompt, useUpdatePrompt, Prompt } from '@/hooks/use-prompts';
import { toast } from 'sonner';
import { getCountryFlag } from '@/lib/countries';
import { PromptDialog } from './prompt-dialog';
import { PromptResultsSheet } from './prompt-results-sheet';
import { getFaviconUrl } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

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
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [isResultsSheetOpen, setIsResultsSheetOpen] = useState(false);
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
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  const handleRowClick = (prompt: Prompt, e: React.MouseEvent) => {
    // Don't open sheet if clicking on buttons or dropdowns
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('[data-radix-collection-item]')
    ) {
      return;
    }

    setSelectedPrompt(prompt);
    setIsResultsSheetOpen(true);
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
              <TableHead>Country</TableHead>
              {!showStatusActions && (
                <>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Sentiment</TableHead>
                  <TableHead>Position</TableHead>
                </>
              )}
              <TableHead>Created</TableHead>
              <TableHead className="w-[70px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((prompt) => (
              <TableRow
                key={prompt.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={(e) => handleRowClick(prompt, e)}
              >
                <TableCell className="py-2 align-middle font-medium">
                  <div
                    className="line-clamp-3 max-w-md whitespace-normal break-words"
                    title={prompt.text}
                  >
                    {prompt.text}
                  </div>
                </TableCell>
                <TableCell className="py-2 align-middle">
                  <div className="flex items-center gap-2">
                    {prompt.brand?.domain && (
                      <Avatar className="h-4 w-4 rounded-sm">
                        <AvatarImage
                          src={getFaviconUrl(prompt.brand.domain)}
                          alt={prompt.brand.name || prompt.brand.domain}
                        />
                        <AvatarFallback className="rounded-sm text-[8px]">
                          {(prompt.brand.name || prompt.brand.domain || 'B')
                            .charAt(0)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <span>
                      {prompt.brand?.name || prompt.brand?.domain || 'N/A'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap py-2 align-middle">
                  <div className="flex items-center">
                    <span className="mr-2 text-lg">
                      {getCountryFlag(prompt.country)}
                    </span>
                    <span className="text-muted-foreground">
                      {prompt.country}
                    </span>
                  </div>
                </TableCell>
                {!showStatusActions && (
                  <>
                    <TableCell className="py-2 align-middle">
                      {prompt.visibilityScore != null
                        ? `${prompt.visibilityScore.toFixed(0)}%`
                        : '-'}
                    </TableCell>
                    <TableCell className="py-2 align-middle">
                      {prompt.averageSentiment != null
                        ? prompt.averageSentiment.toFixed(1)
                        : '-'}
                    </TableCell>
                    <TableCell className="py-2 align-middle">
                      {prompt.averagePosition != null
                        ? prompt.averagePosition.toFixed(1)
                        : '-'}
                    </TableCell>
                  </>
                )}
                <TableCell className="whitespace-nowrap py-2 align-middle text-muted-foreground">
                  {formatTimeAgo(prompt.createdAt)}
                </TableCell>
                <TableCell className="py-2 align-middle">
                  <div className="flex items-center justify-end gap-2">
                    {prompt.status === 'SUGGESTED' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-foreground/70 hover:bg-primary/10"
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
                            setEditingPrompt(prompt);
                            setIsEditOpen(true);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setDeletingPrompt(prompt);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          {prompt.status === 'ARCHIVED' ? (
                            <>
                              <Trash2 className="mr-2 h-4 w-4 text-red-600 focus:text-red-600" />
                              Delete
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

      {editingPrompt && (
        <PromptDialog
          open={isEditOpen}
          onOpenChange={(open) => {
            setIsEditOpen(open);
            if (!open) setEditingPrompt(null);
          }}
          prompt={editingPrompt}
        />
      )}

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

      {/* Prompt Results Sheet */}
      <PromptResultsSheet
        open={isResultsSheetOpen}
        onOpenChange={(open) => {
          setIsResultsSheetOpen(open);
          if (!open) setSelectedPrompt(null);
        }}
        prompt={selectedPrompt}
      />
    </>
  );
}
