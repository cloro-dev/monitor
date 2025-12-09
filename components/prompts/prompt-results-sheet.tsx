'use client';
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/preserve-manual-memoization */
import { useState, useMemo, useEffect } from 'react';
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

    return prompt.results.reduce((acc: GroupedResults, result) => {
      const dateKey = format(new Date(result.createdAt), 'yyyy-MM-dd');
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(result);
      return acc;
    }, {});
  }, [prompt?.results]); // React Compiler sees this as prompt.results

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

  // Reset current result index when filtered results change
  useEffect(() => {
    setCurrentResultIndex(0);
  }, [filteredResults.length]); // Use length instead of array reference

  const currentResult = filteredResults[currentResultIndex];
  const totalResults = filteredResults.length;

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const renderHtmlContent = (response: any) => {
    if (!response) return null;

    // Extract content from different response formats
    let htmlString = '';
    let textContent = '';

    // Handle the nested structure: { result: { ... } }
    let dataToCheck = response;
    if (response.result) {
      dataToCheck = response.result;
    }

    // Check for different content types in different locations
    const checkContent = (obj: any) => {
      if (typeof obj === 'string') {
        htmlString = obj;
      } else if (typeof obj === 'object' && obj !== null) {
        // Check for HTML in various locations
        if (obj.html) {
          htmlString = obj.html;
        }
        // Check for content field
        else if (obj.content) {
          htmlString = obj.content;
        }
        // Check for aioverview text (for AI Overview)
        else if (obj.aioverview?.text) {
          textContent = obj.aioverview.text;
        }
        // Check for direct text field
        else if (obj.text) {
          textContent = obj.text;
        }
      }
    };

    // Check main content
    checkContent(dataToCheck);

    // Also check for nested structures
    if (dataToCheck.aioverview && !textContent) {
      checkContent(dataToCheck.aioverview);
    }

    // If HTML content is a URL, render it directly in an iframe
    if (htmlString && htmlString.startsWith('http')) {
      return (
        <div className="h-full w-full rounded-md border bg-background">
          <iframe
            key={currentResult?.id}
            src={htmlString}
            className="h-full w-full border-0"
            sandbox=""
            title="External Content"
          />
        </div>
      );
    }

    // If we have text content (no HTML), display it in an iframe to contain styles
    if (textContent && !htmlString) {
      // Convert text to HTML
      const textHtml = textContent
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');

      return (
        <div className="h-full w-full rounded-md border bg-background">
          <iframe
            srcDoc={`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'none'; style-src 'unsafe-inline';">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      margin: 16px;
      padding: 16px;
      color: #333;
      white-space: pre-wrap;
      word-wrap: break-word;
      overflow-wrap: break-word;
      background: transparent;
    }
    * {
      pointer-events: none !important;
      user-select: none !important;
      -webkit-user-select: none !important;
      -moz-user-select: none !important;
      -ms-user-select: none !important;
    }
  </style>
</head>
<body>
  ${textHtml}
</body>
</html>`}
            className="h-full w-full border-0"
            sandbox=""
            title="Prompt Response"
          />
        </div>
      );
    }

    // If we have no content at all
    if (!htmlString && !textContent) {
      return (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          <p>No content available</p>
        </div>
      );
    }

    // If we have HTML content
    // Check if it's a full document (starts with <html or <!DOCTYPE)
    const isFullDocument = /^\s*(<html|<!DOCTYPE)/i.test(htmlString);

    if (isFullDocument) {
      return (
        <div className="h-full w-full rounded-md border bg-background">
          <iframe
            key={currentResult?.id}
            srcDoc={htmlString}
            className="h-full w-full border-0"
            sandbox=""
            title="Prompt Response"
          />
        </div>
      );
    }

    // If it's a fragment, wrap it
    return (
      <div className="h-full w-full rounded-md border bg-background">
        <iframe
          key={currentResult?.id}
          srcDoc={`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'none'; style-src 'unsafe-inline';">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: system-ui, -apple-system, sans-serif;
    }
    /* Basic containment */
    img { max-width: 100%; height: auto; }
    /* Prevent interaction */
    body {
      pointer-events: none;
      user-select: none;
    }
  </style>
</head>
<body>
  ${htmlString}
</body>
</html>`}
          className="h-full w-full border-0"
          sandbox=""
          title="Prompt Response"
        />
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col rounded-lg border bg-background p-6 sm:!max-w-xl md:!max-w-2xl lg:!max-w-2xl xl:!max-w-3xl">
        {prompt && (
          <>
            <SheetHeader>
              <SheetTitle className="truncate">{prompt.text}</SheetTitle>
              <div className="text-sm text-muted-foreground">
                {prompt.brand?.name || prompt.brand?.domain} • {prompt.country}
              </div>
            </SheetHeader>

            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="flex h-full items-center justify-center text-center">
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
              <div className="flex h-full items-center justify-center text-center">
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
                {/* Filters */}
                <div className="flex flex-col">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                    <Select
                      value={userSelectedDate || selectedDate}
                      onValueChange={(value) => {
                        setUserSelectedDate(value);
                        setUserSelectedModel(''); // Reset model when date changes
                      }}
                      disabled={availableDates.length === 0}
                    >
                      <SelectTrigger className="w-48">
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
                      <SelectTrigger className="w-48">
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

                {/* HTML Content Display */}
                <div className="mt-4 min-h-[400px] flex-1 rounded-md border bg-muted/30">
                  {currentResult ? (
                    <LoadingBoundary isLoading={false} hasData={true}>
                      <div className="h-full">
                        {renderHtmlContent(currentResult.response)}
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
