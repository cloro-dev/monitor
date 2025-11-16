"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "../ui/alert";
import { Terminal } from "lucide-react";
import { IconLoader } from "@tabler/icons-react";

interface OrganizationCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrganizationCreationModal({
  open,
  onOpenChange,
}: OrganizationCreationModalProps) {
  const [name, setName] = useState("");
  const [logo, setLogo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-generate unique slug from name
  const generateUniqueSlug = async (value: string) => {
    if (!value.trim()) {
      return "";
    }

    let baseSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    let finalSlug = baseSlug;
    let counter = 1;

    // Keep checking and incrementing until we find an available slug
    while (true) {
      try {
        const response = await fetch(
          `/api/organizations/check-slug?slug=${encodeURIComponent(finalSlug)}`
        );

        if (response.ok) {
          const data = await response.json();
          if (!data.exists) {
            // Slug is available
            return finalSlug;
          }
        }
      } catch (error) {
        // If API fails, just use the generated slug
        console.error("Error checking slug availability:", error);
        return finalSlug;
      }

      // Slug exists, try the next one
      finalSlug = `${baseSlug}-${counter}`;
      counter++;

      // Prevent infinite loop
      if (counter > 100) {
        return finalSlug;
      }
    }
  };

  const handleSuccess = () => {
    onOpenChange(false);
    // Redirect to dashboard after successful organization creation
    window.location.href = "/";
  };

  // Prevent closing the modal unless organization is successfully created
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Don't allow closing when open (required modal)
      return;
    }
    onOpenChange(newOpen);
  };

  async function handleSubmit(e: any) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Generate unique slug when submitting
      const generatedSlug = await generateUniqueSlug(name);

      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          slug: generatedSlug,
          logo: logo || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        handleSuccess();
      } else {
        setError(data.error || "Failed to create organization");
        setLoading(false);
      }
    } catch (error) {
      setError("Failed to create organization");
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={false}
        // Prevent escape key and outside clicks from closing the modal
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Create Your Organization</DialogTitle>
          <DialogDescription>
            Every user needs an organization to get started. Just provide a name
            and we&apos;ll handle the rest.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2">
          {error && (
            <Alert className="mb-4 border border-red-500" variant="destructive">
              <Terminal className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={(e) => handleSubmit(e)}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-3">
                <Label htmlFor="org-name">Organization name</Label>
                <Input
                  onChange={(e) => setName(e.target.value)}
                  value={name}
                  id="org-name"
                  type="text"
                  placeholder="My Company"
                  required
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="org-logo">Logo URL (Optional)</Label>
                <Input
                  onChange={(e) => setLogo(e.target.value)}
                  value={logo}
                  id="org-logo"
                  type="url"
                  placeholder="https://example.com/logo.png"
                />
              </div>
              <div className="flex flex-col gap-3">
                <Button disabled={loading} type="submit" className="w-full">
                  {loading ? (
                    <IconLoader className="animate-spin" stroke={2} />
                  ) : (
                    "Create Organization"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
