'use client';

import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  useActiveOrganization,
  useUpdateOrganization,
} from '@/hooks/use-organizations';
import { ChatGPTLogo } from './logos/chatgpt-logo';
import { PerplexityLogo } from './logos/perplexity-logo';
import { CopilotLogo } from './logos/copilot-logo';
import { AIModeLogo } from './logos/ai-mode-logo';
import { AIOverviewLogo } from './logos/ai-overview-logo';

interface AIModel {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

const AI_MODELS: AIModel[] = [
  {
    id: 'CHATGPT',
    name: 'ChatGPT',
    icon: ChatGPTLogo,
  },
  {
    id: 'PERPLEXITY',
    name: 'Perplexity',
    icon: PerplexityLogo,
  },
  {
    id: 'MICROSOFT_COPILOT',
    name: 'Microsoft Copilot',
    icon: CopilotLogo,
  },
  {
    id: 'GOOGLE_AI_MODE',
    name: 'Google AI Mode',
    icon: AIModeLogo,
  },
  {
    id: 'GOOGLE_AI_OVERVIEW',
    name: 'Google AI Overview',
    icon: AIOverviewLogo,
  },
];

export function AIModelsSettings() {
  const { activeOrganization } = useActiveOrganization();
  const { updateOrganization } = useUpdateOrganization();

  const [saving, setSaving] = useState(false);
  const [enabledModels, setEnabledModels] = useState<string[]>([]);

  // Initialize enabled models when organization data loads
  useEffect(() => {
    if (activeOrganization) {
      const models = (activeOrganization.aiModels as string[]) || [
        'CHATGPT',
        'PERPLEXITY',
        'MICROSOFT_COPILOT',
        'GOOGLE_AI_MODE',
        'GOOGLE_AI_OVERVIEW',
      ];
      setEnabledModels(models);
    }
  }, [activeOrganization]);

  const handleModelToggle = async (modelId: string, enabled: boolean) => {
    if (!activeOrganization) return;

    setSaving(true);

    try {
      const newEnabledModels = enabled
        ? [...enabledModels, modelId]
        : enabledModels.filter((id) => id !== modelId);

      await updateOrganization({
        organizationId: activeOrganization.id,
        aiModels: newEnabledModels,
      });

      setEnabledModels(newEnabledModels);
      toast.success(`AI Models updated successfully`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update AI models',
      );
      // Revert the change on error
      setEnabledModels(enabledModels);
    } finally {
      setSaving(false);
    }
  };

  // Handle loading state
  if (!activeOrganization) {
    return (
      <div className="space-y-3">
        {AI_MODELS.map((model) => {
          const IconComponent = model.icon;
          return (
            <div key={model.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconComponent />
                <Label className="text-sm font-medium">{model.name}</Label>
              </div>
              <div className="h-4 w-8 animate-pulse rounded-full bg-muted" />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {AI_MODELS.map((model) => {
        const isEnabled = enabledModels.includes(model.id);
        const IconComponent = model.icon;

        return (
          <div key={model.id} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconComponent />
              <Label className="text-sm font-medium">{model.name}</Label>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={(checked) =>
                handleModelToggle(model.id, checked)
              }
              disabled={saving}
            />
          </div>
        );
      })}

      {enabledModels.length === 0 && (
        <div className="py-6 text-center">
          <p className="text-sm text-muted-foreground">
            No AI models enabled. Enable at least one model to start tracking.
          </p>
        </div>
      )}
    </div>
  );
}
