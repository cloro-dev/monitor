"use client";
import { useState, useEffect } from "react";
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
import { Building2, Users } from "lucide-react";
import { IconLoader } from "@tabler/icons-react";
import { toast } from "sonner";
import {
  useActiveOrganization,
  useUpdateOrganization,
} from "@/hooks/use-organizations";

export default function SettingsPage() {
  const { activeOrganization } = useActiveOrganization();
  const { updateOrganization } = useUpdateOrganization();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [logo, setLogo] = useState("");

  // Initialize form when organization data loads
  useEffect(() => {
    if (activeOrganization) {
      setName(activeOrganization.name);
      setLogo(activeOrganization.logo || "");
    }
  }, [activeOrganization]);

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    if (!activeOrganization) return;

    try {
      await updateOrganization({
        organizationId: activeOrganization.id,
        name,
        logo,
      });

      toast.success("Organization updated successfully");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to update organization"
      );
    } finally {
      setSaving(false);
    }
  };

  // Handle loading state while organization data is being fetched
  if (!activeOrganization) {
    return (
      <div className="flex items-center justify-center">
        <IconLoader className="animate-spin h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
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
            <CardDescription>Manage organization members</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeOrganization.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">{member.user.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {member.user.email}
                    </p>
                  </div>
                  <div className="text-sm">
                    <span className="px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {member.role}
                    </span>
                  </div>
                </div>
              ))}

              {activeOrganization.members.length === 0 && (
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
