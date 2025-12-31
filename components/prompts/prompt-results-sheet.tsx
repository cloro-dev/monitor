'use client';

import { useState, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Prompt, Result, usePrompt } from '@/hooks/use-prompts';
import { format } from 'date-fns';
import { Calendar, Eye, Loader2, AlertCircle } from 'lucide-react';
import { LoadingBoundary } from '@/components/ui/loading-boundary';
import { ChatGPTLogo } from '@/components/ai-models/logos/chatgpt-logo';
import { PerplexityLogo } from '@/components/ai-models/logos/perplexity-logo';
import { CopilotLogo } from '@/components/ai-models/logos/copilot-logo';
import { AIModeLogo } from '@/components/ai-models/logos/ai-mode-logo';
import { AIOverviewLogo } from '@/components/ai-models/logos/ai-overview-logo';
import { GeminiLogo } from '@/components/ai-models/logos/gemini-logo';
import { ResponseRenderer } from '@cloro-dev/response-parser/react';

interface PromptResultsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompt: Prompt | null;
}

interface GroupedResults {
  [date: string]: Result[];
}

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
    id: 'COPILOT',
    name: 'Microsoft Copilot',
    icon: CopilotLogo,
  },
  {
    id: 'GEMINI',
    name: 'Google Gemini',
    icon: GeminiLogo,
  },
  {
    id: 'AIMODE',
    name: 'Google AI Mode',
    icon: AIModeLogo,
  },
  {
    id: 'AIOVERVIEW',
    name: 'Google AI Overview',
    icon: AIOverviewLogo,
  },
];

export function PromptResultsSheet({
  open,
  onOpenChange,
  prompt,
}: PromptResultsSheetProps) {
  return (
    <ResultsSheetInner
      open={open}
      onOpenChange={onOpenChange}
      prompt={prompt}
      key={prompt?.id || 'no-prompt'}
    />
  );
}

function ResultsSheetInner({
  open,
  onOpenChange,
  prompt: initialPrompt,
}: PromptResultsSheetProps) {
  // Use derived state with user-selectable values
  const [userSelectedDate, setUserSelectedDate] = useState<string>('');
  const [userSelectedModel, setUserSelectedModel] = useState<string>('');
  const [currentResultIndex, setCurrentResultIndex] = useState(0);

  // Fetch full details including results
  const {
    prompt: fullPrompt,
    isLoading,
    error,
  } = usePrompt(open ? initialPrompt?.id || null : null);

  // Use full prompt if available, otherwise fallback to initial (for static data like title)
  const prompt = fullPrompt || initialPrompt;

  // Group results by date
  const groupedResults = useMemo(() => {
    if (!prompt?.results?.length) return {} as GroupedResults;

    return prompt!.results.reduce((acc: GroupedResults, result) => {
      const dateKey = format(new Date(result.createdAt), 'yyyy-MM-dd');
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(result);
      return acc;
    }, {});
  }, [prompt]);

  // Get available dates in descending order
  const availableDates = useMemo(() => {
    return Object.keys(groupedResults).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime(),
    );
  }, [groupedResults]);

  // Use user selected date or default to first available
  const selectedDate = userSelectedDate || availableDates[0] || '';

  // Get available models for the selected date
  const availableModels = useMemo(() => {
    if (!selectedDate || !groupedResults[selectedDate]) return [];
    const models = new Set(groupedResults[selectedDate].map((r) => r.model));
    return Array.from(models).sort();
  }, [selectedDate, groupedResults]);

  // Use user selected model or default to first available
  const selectedModel = userSelectedModel || availableModels[0] || '';

  // Get filtered results based on selected date and model
  const filteredResults = useMemo(() => {
    if (!selectedDate || !selectedModel) return [];
    return (
      groupedResults[selectedDate]?.filter((r) => r.model === selectedModel) ||
      []
    );
  }, [selectedDate, selectedModel, groupedResults]);

  const totalResults = filteredResults.length;

  // Ensure the current index is within bounds
  const safeCurrentIndex =
    currentResultIndex >= totalResults ? 0 : currentResultIndex;
  const currentResult = filteredResults[safeCurrentIndex];

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col rounded-lg border bg-background p-0 sm:!max-w-xl md:!max-w-2xl lg:!max-w-2xl xl:!max-w-3xl">
        {prompt && (
          <>
            <SheetHeader className="px-6 pb-2 pt-6">
              <div className="flex items-start justify-between gap-6">
                <div className="min-w-0 max-w-[280px] flex-1">
                  <SheetTitle className="break-words leading-tight">
                    {prompt.text}
                  </SheetTitle>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {prompt.brand?.name || prompt.brand?.domain} •{' '}
                    {prompt.country}
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-shrink-0 flex-row gap-3">
                  <Select
                    value={userSelectedDate || selectedDate}
                    onValueChange={(value) => {
                      setUserSelectedDate(value);
                      setUserSelectedModel(''); // Reset model when date changes
                    }}
                    disabled={availableDates.length === 0}
                  >
                    <SelectTrigger className="w-40">
                      <Calendar className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Select date" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDates.map((date) => (
                        <SelectItem key={date} value={date}>
                          {formatDate(date)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={userSelectedModel || selectedModel}
                    onValueChange={setUserSelectedModel}
                    disabled={availableModels.length === 0}
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((modelId) => {
                        const model = AI_MODELS.find((m) => m.id === modelId);
                        if (!model) return null;
                        const IconComponent = model.icon;
                        return (
                          <SelectItem key={modelId} value={modelId}>
                            <div className="flex items-center gap-2">
                              <IconComponent className="h-4 w-4" />
                              <span>{model.name}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </SheetHeader>

            {isLoading ? (
              <div className="flex h-full items-center justify-center px-6">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="flex h-full items-center justify-center px-6 text-center">
                <div className="space-y-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-destructive">
                      Failed to load results
                    </h3>
                    <p className="mt-2 text-muted-foreground">
                      There was an error loading the prompt details. Please try
                      again.
                    </p>
                  </div>
                </div>
              </div>
            ) : !prompt.results || prompt.results.length === 0 ? (
              <div className="flex h-full items-center justify-center px-6 text-center">
                <div className="space-y-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Eye className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      No Results Available
                    </h3>
                    <p className="mt-2 text-muted-foreground">
                      This prompt hasn&apos;t been tracked yet. Results will
                      appear here once the tracking process has run.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Competitor Brands */}
                {currentResult?.competitors && (
                  <div className="mt-2 px-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        Brands:
                      </span>
                      {Array.isArray(currentResult.competitors) ? (
                        currentResult.competitors.map(
                          (competitor: any, index: number) => (
                            <Badge
                              key={index}
                              className="bg-gray-100 text-xs text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                            >
                              {typeof competitor === 'string'
                                ? competitor
                                : competitor.name || JSON.stringify(competitor)}
                            </Badge>
                          ),
                        )
                      ) : (
                        <Badge className="bg-gray-100 text-xs text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                          {typeof currentResult.competitors === 'string'
                            ? currentResult.competitors
                            : JSON.stringify(currentResult.competitors)}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* HTML Content Display */}
                <div className="mx-6 mb-6 mt-4 min-h-[400px] flex-1 rounded-md border bg-muted/30">
                  {currentResult ? (
                    <LoadingBoundary isLoading={false} hasData={true}>
                      <div className="h-full">
                        <ResponseRenderer
                          response={currentResult.response}
                          removeLinks
                          invertColors
                          removeHeader
                          removeFooter
                          removeSidebar
                          className="h-full w-full"
                        />
                      </div>
                    </LoadingBoundary>
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <p className="text-center">
                        {selectedDate && selectedModel
                          ? 'No results found for the selected filters'
                          : 'Select a date and model to view results'}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
