'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useBrands } from '@/hooks/use-brands';
import {
  IconLoader,
  IconWorld,
  IconTrash,
  IconPlus,
} from '@tabler/icons-react';
import Image from 'next/image';
import { isValidDomain } from '@/lib/client-utils';
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
import { getFaviconUrl } from '@/lib/utils';
import { getCountriesForSelect } from '@/lib/countries';

const addBrandSchema = z.object({
  domain: z.string().min(1, 'Domain is required').refine(isValidDomain, {
    message:
      'Please enter a valid domain name with TLD suffix (e.g., example.com, example.es, example.pt)',
  }),
  defaultCountry: z.string().optional(),
});

type AddBrandFormData = z.infer<typeof addBrandSchema>;

export function BrandManagement() {
  const { brands, isLoading, createBrand, deleteBrand } = useBrands();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingBrandId, setDeletingBrandId] = useState<string | null>(null);
  const [countries, setCountries] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [isLoadingCountries, setIsLoadingCountries] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AddBrandFormData>({
    resolver: zodResolver(addBrandSchema),
  });

  // Load countries on component mount
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const countriesData = await getCountriesForSelect();
        setCountries(countriesData);
        // Set default to US if available
        const usOption = countriesData.find(
          (country) => country.value === 'US',
        );
        if (usOption) {
          setValue('defaultCountry', 'US');
        }
      } catch (error) {
        console.error('Error loading countries:', error);
      } finally {
        setIsLoadingCountries(false);
      }
    };

    loadCountries();
  }, [setValue]);

  const selectedCountry = watch('defaultCountry');

  const handleAddBrand = async (data: AddBrandFormData) => {
    setIsSubmitting(true);
    try {
      await createBrand(data.domain, data.defaultCountry);
      toast.success(
        `Brand added! We are generating 5 suggested prompts for your review in the Prompts page.`,
      );
      reset();
      // Reset country to US default
      setValue('defaultCountry', 'US');
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
          className="flex items-center justify-between rounded-lg border p-2 transition-colors hover:bg-muted/50"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {/* Favicon */}
            <div className="flex h-6 w-6 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
              <Image
                src={getFaviconUrl(brand.domain)}
                alt={`${brand.name || brand.domain} favicon`}
                width={32}
                height={32}
                className="h-full w-full object-cover"
                unoptimized
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove(
                    'hidden',
                  );
                }}
              />
              <IconWorld className="hidden h-4 w-4 flex-shrink-0 text-muted-foreground" />
            </div>

            {/* Brand Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium">
                  {brand.name || brand.domain}
                </span>
                {brand.name && brand.name !== brand.domain && (
                  <span className="truncate text-sm text-muted-foreground">
                    ({brand.domain})
                  </span>
                )}
                {brand.defaultCountry && (
                  <span className="rounded bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                    {brand.defaultCountry}
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
                  Are you sure you want to delete this? This action cannot be
                  undone.
                  <br />
                  <br />
                  <strong className="text-destructive">
                    All prompts associated with this brand will also be deleted.
                  </strong>
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
          <Input
            type="hidden"
            {...register('defaultCountry')}
            value={selectedCountry || ''}
          />
          <Select
            value={selectedCountry || ''}
            onValueChange={(value) => setValue('defaultCountry', value)}
            disabled={isSubmitting || isLoadingCountries}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Country">
                {selectedCountry && !isLoadingCountries && (
                  <div className="flex items-center gap-1">
                    <span>{selectedCountry}</span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country.value} value={country.value}>
                  {country.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            Enter a domain name and select a default country for prompt
            generation
          </p>
        )}
      </form>
    </div>
  );
}
