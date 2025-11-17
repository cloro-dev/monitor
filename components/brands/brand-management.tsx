'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useBrands } from '@/hooks/use-brands';
import {
  IconLoader,
  IconWorld,
  IconTrash,
  IconPlus,
} from '@tabler/icons-react';
import Image from 'next/image';
import { isValidDomain } from '@/lib/domain-fetcher';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const addBrandSchema = z.object({
  domain: z.string().min(1, 'Domain is required').refine(isValidDomain, {
    message: 'Please enter a valid domain name (e.g., example.com)',
  }),
});

type AddBrandFormData = z.infer<typeof addBrandSchema>;

export function BrandManagement() {
  const { brands, isLoading, createBrand, deleteBrand } = useBrands();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingBrandId, setDeletingBrandId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddBrandFormData>({
    resolver: zodResolver(addBrandSchema),
  });

  const handleAddBrand = async (data: AddBrandFormData) => {
    setIsSubmitting(true);
    try {
      await createBrand(data.domain);
      toast.success(`Successfully added brand: ${data.domain}`);
      reset();
    } catch (error: any) {
      console.error('Error adding brand:', error);
      toast.error(error.message || 'Failed to add brand');
      throw error; // Re-throw to prevent form from clearing on error
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBrand = async (brandId: string) => {
    setIsDeleting(true);
    setDeletingBrandId(brandId);
    try {
      await deleteBrand(brandId);
      toast.success('Brand deleted successfully');
    } catch (error: any) {
      console.error('Error deleting brand:', error);
      toast.error(error.message || 'Failed to delete brand');
    } finally {
      setIsDeleting(false);
      setDeletingBrandId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <IconLoader className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Existing Brands List */}
      {brands.map((brand) => (
        <div
          key={brand.id}
          className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {/* Favicon */}
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
              {brand.faviconUrl ? (
                <Image
                  src={brand.faviconUrl}
                  alt={`${brand.brandName || brand.domain} favicon`}
                  width={24}
                  height={24}
                  className="object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove(
                      'hidden',
                    );
                  }}
                />
              ) : null}
              <IconWorld className="hidden h-4 w-4 text-muted-foreground" />
            </div>

            {/* Brand Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium">
                  {brand.brandName || brand.domain}
                </span>
                {brand.brandName && brand.brandName !== brand.domain && (
                  <span className="truncate text-sm text-muted-foreground">
                    ({brand.domain})
                  </span>
                )}
                <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">
                  Added {new Date(brand.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Delete Button */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                disabled={isDeleting}
              >
                {isDeleting && deletingBrandId === brand.id ? (
                  <IconLoader className="h-4 w-4 animate-spin" />
                ) : (
                  <IconTrash className="h-4 w-4" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Brand</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &quot;
                  {brand.brandName || brand.domain}&quot;? This action cannot be
                  undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDeleteBrand(brand.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={isDeleting}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ))}

      {/* Empty State */}
      {brands.length === 0 && (
        <div className="py-8 text-center">
          <IconWorld className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-medium text-muted-foreground">
            No brands yet
          </h3>
          <p className="text-sm text-muted-foreground">
            Add your first brand using the input below
          </p>
        </div>
      )}

      {/* Add Brand Input Row */}
      <form onSubmit={handleSubmit(handleAddBrand)} className="pt-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="example.com"
              {...register('domain')}
              className="pr-10"
              disabled={isSubmitting}
            />
            <IconWorld className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <IconLoader className="h-4 w-4 animate-spin" />
            ) : (
              <IconPlus className="h-4 w-4" />
            )}
          </Button>
        </div>
        {errors.domain ? (
          <p className="mt-1 text-sm text-destructive">
            {errors.domain.message}
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            Enter a domain name to track its brand information
          </p>
        )}
      </form>
    </div>
  );
}
