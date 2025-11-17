"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconLoader, IconWorld, IconPlus } from "@tabler/icons-react";
import { isValidDomain } from "@/lib/domain-fetcher";

const addBrandSchema = z.object({
  domain: z.string().min(1, "Domain is required").refine(isValidDomain, {
    message: "Please enter a valid domain name (e.g., example.com)",
  }),
});

type AddBrandFormData = z.infer<typeof addBrandSchema>;

interface AddBrandFormProps {
  onSubmit: (domain: string) => Promise<void>;
  isLoading?: boolean;
}

export function AddBrandForm({ onSubmit, isLoading }: AddBrandFormProps) {
  const [previewDomain, setPreviewDomain] = useState<string>("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<AddBrandFormData>({
    resolver: zodResolver(addBrandSchema),
  });

  const domainValue = watch("domain", "");

  // Update preview as user types
  if (domainValue !== previewDomain && isValidDomain(domainValue)) {
    setPreviewDomain(domainValue);
  }

  const onFormSubmit = async (data: AddBrandFormData) => {
    try {
      await onSubmit(data.domain);
      reset();
      setPreviewDomain("");
    } catch (error) {
      // Error handling is done by the parent component
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <IconPlus className="h-5 w-5" />
          Add Brand
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="domain">Domain</Label>
            <div className="relative">
              <Input
                id="domain"
                type="text"
                placeholder="example.com"
                {...register("domain")}
                className="pr-10"
                disabled={isLoading}
              />
              <IconWorld className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
            {errors.domain ? (
              <p className="text-sm text-destructive">
                {errors.domain.message}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Enter a domain name to fetch its brand information
              </p>
            )}
          </div>

          {/* Preview */}
          {previewDomain && isValidDomain(previewDomain) && !errors.domain && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <IconWorld className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {previewDomain.split(".")[0].charAt(0).toUpperCase() +
                      previewDomain.split(".")[0].slice(1)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {previewDomain}
                  </p>
                </div>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <IconLoader className="h-4 w-4 mr-2 animate-spin" />
                Adding Brand...
              </>
            ) : (
              <>
                <IconPlus className="h-4 w-4 mr-2" />
                Add Brand
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
