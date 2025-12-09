'use client';
import { useState, useEffect } from 'react';
import { LoadingBoundary } from '@/components/ui/loading-boundary';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Users, Globe, Bot } from 'lucide-react';
import { IconLoader } from '@tabler/icons-react';
import { toast } from 'sonner';
import {
  useActiveOrganization,
  useUpdateOrganization,
  useOrganizations,
} from '@/hooks/use-organizations';
import { BrandManagement } from '@/components/brands/brand-management';
import { AIModelsSettings } from '@/components/ai-models/ai-models-settings';

export default function SettingsPage() {
  const { activeOrganization } = useActiveOrganization();
  const { isLoading: orgLoading } = useOrganizations();
  const { updateOrganization } = useUpdateOrganization();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [logo, setLogo] = useState('');

  // Initialize form when organization data loads
  useEffect(() => {
    if (activeOrganization) {
      setName(activeOrganization.name);
      setLogo(activeOrganization.logo || '');
    }
  }, [activeOrganization]);

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    if (!activeOrganization) return;

    try {
      await updateOrganization({
        organizationId: activeOrganization.id,
        name,
        logo,
      });

      toast.success('Organization updated successfully');
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Failed to update organization',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <LoadingBoundary isLoading={orgLoading} hasData={!!activeOrganization}>
      <div className="space-y-4">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Organization Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organization
              </CardTitle>
              <CardDescription>
                Update your organization information
              </CardDescription>
            </CardHeader>
            <CardContent className="py-6">
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
                  <Label htmlFor="logo">Logo URL (optional)</Label>
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
                      <IconLoader className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
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
              <div className="space-y-2">
                {activeOrganization.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-lg border p-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{member.user.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {member.user.email}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="rounded-full bg-secondary px-2 py-1 text-foreground">
                        {member.role}
                      </span>
                    </div>
                  </div>
                ))}

                {activeOrganization.members.length === 0 && (
                  <p className="py-4 text-center text-muted-foreground">
                    No members found
                  </p>
                )}
              </div>

              <Button variant="outline" className="mt-4 w-full" disabled>
                Invite Members (Coming Soon)
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Brands */}
          <Card className="py-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Brands
              </CardTitle>
              <CardDescription>
                Manage brands and domains for tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BrandManagement />
            </CardContent>
          </Card>

          {/* AI Models */}
          <Card className="py-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                AI Models
              </CardTitle>
              <CardDescription>
                Configure which AI models to use for tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AIModelsSettings />
            </CardContent>
          </Card>
        </div>
      </div>
    </LoadingBoundary>
  );
}
