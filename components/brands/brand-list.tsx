'use client';

import { Brand } from '@/hooks/use-brands';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  IconLoader,
  IconTrash,
  IconEdit,
  IconWorld,
  IconBuildingStore,
} from '@tabler/icons-react';
import Image from 'next/image';

interface BrandListProps {
  brands: Brand[];
  onEdit: (brand: Brand) => void;
  onDelete: (brandId: string) => void;
  isDeleting?: boolean;
  deletingBrandId?: string | null;
}

export function BrandList({
  brands,
  onEdit,
  onDelete,
  isDeleting,
  deletingBrandId,
}: BrandListProps) {
  return (
    <div className="space-y-3">
      {brands.map((brand) => (
        <Card key={brand.id} className="transition-shadow hover:shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {/* Favicon */}
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                  {brand.faviconUrl ? (
                    <Image
                      src={brand.faviconUrl}
                      alt={`${brand.name || brand.domain} favicon`}
                      width={24}
                      height={24}
                      className="object-cover"
                      onError={(e) => {
                        // Fallback to default icon if favicon fails to load
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
                  <div className="mb-1 flex items-center gap-2">
                    <h4 className="truncate text-sm font-medium">
                      {brand.name || brand.domain}
                    </h4>
                    {brand.name && brand.name !== brand.domain && (
                      <span className="truncate text-xs text-muted-foreground">
                        ({brand.domain})
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Added {new Date(brand.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(brand)}
                  className="h-8 w-8 p-0"
                >
                  <IconEdit className="h-4 w-4" />
                </Button>

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
                        Are you sure you want to delete this? This action cannot
                        be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(brand.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={isDeleting}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
