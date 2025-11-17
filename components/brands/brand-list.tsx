"use client";

import { Brand } from "@/hooks/use-brands";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
} from "@/components/ui/alert-dialog";
import {
  IconLoader,
  IconTrash,
  IconEdit,
  IconWorld,
  IconBuildingStore,
} from "@tabler/icons-react";
import Image from "next/image";

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
  if (brands.length === 0) {
    return (
      <div className="text-center py-8">
        <IconBuildingStore className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">
          No brands yet
        </h3>
        <p className="text-sm text-muted-foreground">
          Add your first brand to start tracking domain information
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {brands.map((brand) => (
        <Card key={brand.id} className="hover:shadow-sm transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Favicon */}
                <div className="flex-shrink-0 w-8 h-8 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                  {brand.faviconUrl ? (
                    <Image
                      src={brand.faviconUrl}
                      alt={`${brand.brandName || brand.domain} favicon`}
                      width={24}
                      height={24}
                      className="object-cover"
                      onError={(e) => {
                        // Fallback to default icon if favicon fails to load
                        e.currentTarget.style.display = "none";
                        e.currentTarget.nextElementSibling?.classList.remove(
                          "hidden"
                        );
                      }}
                    />
                  ) : null}
                  <IconWorld className="w-4 h-4 text-muted-foreground hidden" />
                </div>

                {/* Brand Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm truncate">
                      {brand.brandName || brand.domain}
                    </h4>
                    {brand.brandName && brand.brandName !== brand.domain && (
                      <span className="text-xs text-muted-foreground truncate">
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
              <div className="flex items-center gap-1 flex-shrink-0">
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
                        Are you sure you want to delete &quot;
                        {brand.brandName || brand.domain}&quot;? This action
                        cannot be undone.
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
