"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { Alert, AlertDescription } from "../ui/alert";
import { Terminal } from "lucide-react";
import { IconLoader } from "@tabler/icons-react";

export function OrganizationCreationForm({
  onSuccess,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  onSuccess?: () => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [logo, setLogo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    setName(value);
    const generatedSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    setSlug(generatedSlug);
  };

  async function handleSubmit(e: any) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          slug,
          logo: logo || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (onSuccess) onSuccess();
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
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Create Your Organization</CardTitle>
          <CardDescription>
            Every user needs an organization to get started. Create your first organization to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4 border border-red-500" variant="destructive">
              <Terminal className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={(e) => handleSubmit(e)}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-3">
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  onChange={(e) => handleNameChange(e.target.value)}
                  value={name}
                  id="org-name"
                  type="text"
                  placeholder="My Company"
                  required
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="org-slug">Organization Slug</Label>
                <Input
                  onChange={(e) => setSlug(e.target.value)}
                  value={slug}
                  id="org-slug"
                  type="text"
                  placeholder="my-company"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  This will be used in URLs and must be unique.
                </p>
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
        </CardContent>
      </Card>
    </div>
  );
}