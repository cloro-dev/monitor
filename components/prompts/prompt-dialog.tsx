'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { countries } from '@/lib/countries';
import { Loader2, Plus } from 'lucide-react';
import { useCreatePrompt, useUpdatePrompt } from '@/hooks/use-prompts';
import { useBrands } from '@/hooks/use-brands';
import { toast } from 'sonner';

interface Prompt {
  id: string;
  text: string;
  country: string;
  createdAt: string;
  updatedAt: string;
  brand?: {
    id: string;
    domain: string;
    name?: string;
  };
}

interface PromptDialogProps {
  trigger?: React.ReactNode;
  prompt?: Prompt;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function PromptDialog({
  trigger,
  prompt,
  open,
  onOpenChange,
}: PromptDialogProps) {
  const [isOpen, setIsOpen] = useState(open || false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    text: '',
    country: '',
    brandId: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { brands, isLoading: isLoadingBrands } = useBrands();

  const { createPrompt } = useCreatePrompt();
  const { updatePrompt } = useUpdatePrompt();

  const isEditing = Boolean(prompt);

  useEffect(() => {
    if (prompt) {
      setFormData({
        text: prompt.text,
        country: prompt.country,
        brandId: prompt.brand?.id || '',
      });
    } else {
      setFormData({
        text: '',
        country: '',
        brandId: '',
      });
    }
    setErrors({});
  }, [prompt, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    // Validation
    const newErrors: Record<string, string> = {};
    if (formData.text.length < 10) {
      newErrors.text = 'Prompt must be at least 10 characters';
    }
    if (formData.text.length > 200) {
      newErrors.text = 'Prompt must be at most 200 characters';
    }
    if (!formData.country) {
      newErrors.country = 'Please select a country';
    }
    if (!formData.brandId) {
      newErrors.brandId = 'Please select a brand';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsLoading(false);
      return;
    }

    try {
      if (isEditing && prompt) {
        await updatePrompt(prompt.id, formData);
        toast.success('Prompt updated successfully');
      } else {
        await createPrompt(formData);
        toast.success('Prompt created successfully');
      }

      setIsOpen(false);
      setFormData({ text: '', country: '', brandId: '' });
      onOpenChange?.(false);
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  const characterCount = formData.text.length;
  const isCharacterCountValid = characterCount >= 10 && characterCount <= 200;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Prompt' : 'Add New Prompt'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="text">Prompt text</Label>
            <Textarea
              id="text"
              value={formData.text}
              onChange={(e) =>
                setFormData({ ...formData, text: e.target.value })
              }
              placeholder="Enter your prompt (10-200 characters)"
              className={`min-h-[100px] resize-none ${
                !isCharacterCountValid && formData.text.length > 0
                  ? 'border-red-500 focus:border-red-500'
                  : ''
              }`}
              disabled={isLoading}
            />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {characterCount}/200 characters
              </span>
              {formData.text.length > 0 && !isCharacterCountValid && (
                <span className="text-red-500">Must be 10-200 characters</span>
              )}
            </div>
            {errors.text && (
              <p className="text-sm text-red-500">{errors.text}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select
                value={formData.country}
                onValueChange={(value) =>
                  setFormData({ ...formData, country: value })
                }
                disabled={isLoading}
              >
                <SelectTrigger
                  className={`${errors.country ? 'border-red-500 focus:border-red-500' : ''}`}
                >
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  <div className="max-h-[200px] overflow-y-auto">
                    {countries.map((country) => (
                      <SelectItem key={country.value} value={country.label}>
                        {country.label}
                      </SelectItem>
                    ))}
                  </div>
                </SelectContent>
              </Select>
              {errors.country && (
                <p className="text-sm text-red-500">{errors.country}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Select
                value={formData.brandId}
                onValueChange={(value) =>
                  setFormData({ ...formData, brandId: value })
                }
                disabled={isLoading || isLoadingBrands}
              >
                <SelectTrigger
                  className={`${errors.brandId ? 'border-red-500 focus:border-red-500' : ''}`}
                >
                  <SelectValue placeholder="Select a brand" />
                </SelectTrigger>
                <SelectContent>
                  <div className="max-h-[200px] overflow-y-auto">
                    {brands?.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.domain}
                      </SelectItem>
                    ))}
                  </div>
                </SelectContent>
              </Select>
              {errors.brandId && (
                <p className="text-sm text-red-500">{errors.brandId}</p>
              )}
            </div>
          </div>

          {errors.submit && (
            <div className="rounded-md bg-red-50 p-3">
              <p className="text-sm text-red-700">{errors.submit}</p>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isLoading ||
                !isCharacterCountValid ||
                !formData.country ||
                !formData.brandId
              }
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>{isEditing ? 'Update Prompt' : 'Create Prompt'}</>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Default trigger button component
export function AddPromptButton() {
  return (
    <PromptDialog
      trigger={
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Prompt
        </Button>
      }
    />
  );
}
