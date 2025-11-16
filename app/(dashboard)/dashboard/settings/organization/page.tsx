"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, Users, Settings as SettingsIcon, ArrowLeft } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { IconLoader } from "@tabler/icons-react";
import Link from "next/link";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  createdAt: string;
  members: Array<{
    id: string;
    user: {
      name: string;
      email: string;
    };
    role: string;
  }>;
}

export default function OrganizationSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const action = searchParams.get("action");
  const { data: session } = authClient.useSession();

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [logo, setLogo] = useState("");

  useEffect(() => {
    fetchOrganization();

    // Check if we should show create modal
    if (action === "create") {
      // Redirect to create organization flow
      router.push("/signup");
    }
  }, [action, router, session]);

  const fetchOrganization = async () => {
    try {
      const response = await fetch("/api/organizations");
      if (response.ok) {
        const data = await response.json();
        const activeOrg = session && 'activeOrganizationId' in session
          ? data.organizations.find((org: any) => org.id === (session as any).activeOrganizationId)
          : data.organizations[0];

        if (activeOrg) {
          setOrganization(activeOrg);
          setName(activeOrg.name);
          setSlug(activeOrg.slug);
          setLogo(activeOrg.logo || "");
        }
      }
    } catch (error) {
      console.error("Error fetching organization:", error);
      setError("Failed to load organization data");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/organizations/${organization?.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, slug, logo }),
      });

      if (response.ok) {
        setSuccess("Organization updated successfully");
        await fetchOrganization(); // Refresh data
      } else {
        const data = await response.json();
        setError(data.error || "Failed to update organization");
      }
    } catch (error) {
      console.error("Error updating organization:", error);
      setError("Failed to update organization");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <IconLoader className="animate-spin h-8 w-8" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="space-y-6">
        <Alert>
          <Building2 className="h-4 w-4" />
          <AlertDescription>
            No organization found. Please create an organization to continue.
          </AlertDescription>
        </Alert>
        <Button onClick={() => router.push("/signup")}>
          Create Organization
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Organization Settings</h1>
          <p className="text-muted-foreground">
            Manage your organization details and members
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Organization Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organization Details
            </CardTitle>
            <CardDescription>
              Update your organization information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveChanges} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Organization Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter organization name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Organization Slug</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="organization-slug"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  This will be used in URLs and must be unique.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo">Logo URL (Optional)</Label>
                <Input
                  id="logo"
                  type="url"
                  value={logo}
                  onChange={(e) => setLogo(e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <Button type="submit" disabled={saving} className="w-full">
                {saving ? (
                  <>
                    <IconLoader className="animate-spin h-4 w-4 mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Members */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Members
            </CardTitle>
            <CardDescription>
              Manage organization members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {organization.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{member.user.name}</p>
                    <p className="text-sm text-muted-foreground">{member.user.email}</p>
                  </div>
                  <div className="text-sm">
                    <span className="px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {member.role}
                    </span>
                  </div>
                </div>
              ))}

              {organization.members.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No members found
                </p>
              )}
            </div>

            <Button variant="outline" className="w-full mt-4" disabled>
              Invite Members (Coming Soon)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}