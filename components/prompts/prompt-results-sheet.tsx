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

  const MODEL_BASE_URLS: Record<string, string> = {
    COPILOT: 'https://copilot.microsoft.com',
    GEMINI: 'https://gemini.google.com',
    AIMODE: 'https://www.google.com',
    AIOVERVIEW: 'https://www.google.com',
    CHATGPT: 'https://chatgpt.com',
    PERPLEXITY: 'https://www.perplexity.ai',
  };

  const HIDE_UI_ELEMENTS_STYLE = `<style>
    /* Copilot Sidebar & Header */
    div:has(> [data-testid="sidebar-container"]),
    [data-testid="sidebar-container"],
    [data-testid="sticky-header"],
    .side-nav-menu-button {
      display: none !important;
    }

    /* Gemini Sidebar */
    bard-sidenav,
    mat-sidenav,
    .mat-drawer-backdrop {
      display: none !important;
    }

    /* General Layout Fixes */
    main {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
    }
  </style>`;

  const renderHtmlContent = (response: any) => {
    if (!response) return null;

    // Extract content from different response formats
    let htmlString = '';
    let textContent = '';
    let sources: any[] = [];

    // Handle the nested structure: { result: { ... } }
    let dataToCheck = response;
    if (response.result) {
      dataToCheck = response.result;
    }

    // Check for different content types in different locations
    const checkContent = (obj: any) => {
      if (typeof obj === 'string') {
        // Heuristic: If it looks like HTML, treat as HTML. Otherwise text.
        if (obj.trim().startsWith('<') && obj.includes('>')) {
          htmlString = obj;
        } else {
          textContent = obj;
        }
      } else if (typeof obj === 'object' && obj !== null) {
        // Check for HTML in various locations
        if (obj.html) {
          htmlString = obj.html;
        }
        // Check for content field
        else if (obj.content) {
          // Check if content is HTML
          if (
            typeof obj.content === 'string' &&
            obj.content.trim().startsWith('<')
          ) {
            htmlString = obj.content;
          } else {
            textContent = obj.content;
          }
        }
        // Check for aioverview text (for AI Overview)
        else if (obj.aioverview?.text) {
          textContent = obj.aioverview.text;
          if (obj.aioverview.sources) sources = obj.aioverview.sources;
        }
        // Check for direct text field
        else if (obj.text) {
          textContent = obj.text;
        }

        // Capture top-level sources if not already found
        if (obj.sources && sources.length === 0) {
          sources = obj.sources;
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

    // If we have text content (no HTML), parse Markdown-like structure and display in iframe
    // Use this if htmlString is empty OR if we decided the "html" was actually text
    if (textContent && !htmlString) {
      return (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          <p>No HTML available</p>
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
      // Inject base URL for relative links
      const baseUrl = currentResult?.model
        ? MODEL_BASE_URLS[currentResult.model as keyof typeof MODEL_BASE_URLS]
        : null;

      const isGoogleModel = ['GEMINI', 'AIOVERVIEW', 'AIMODE'].includes(
        currentResult?.model || '',
      );

      // --- GOOGLE MODELS (GEMINI, AI OVERVIEW, AI MODE) ---
      if (isGoogleModel) {
        let finalHtml = htmlString;

        // 0. Attempt to extract hidden content from WIZ_global_data (Specific to Gemini/Google)
        // Gemini snapshots are often empty shells requiring JS. We extract the text payload 'DnVkpd'.
        const wizDataMatch = htmlString.match(
          /"DnVkpd"\s*:\s*"((?:[^"\\]|\\.)*)"/,
        );
        if (wizDataMatch && wizDataMatch[1]) {
          try {
            // Decode the JSON string to get the actual content
            let extractedContent = JSON.parse(`"${wizDataMatch[1]}"`);

            // Format specific delimiters used by Gemini
            // ∰ seems to separate turns/sections
            extractedContent = extractedContent.replace(
              /∰/g,
              '<hr class="gemini-separator">',
            );

            // ∞ seems to separate prompts/images/responses. Often precedes URLs.
            // We'll try to detect image URLs following this and turn them into tags.
            extractedContent = extractedContent.replace(
              /∞(https:\/\/[^ ]+\.(?:jpg|png|webp|gif|jpeg)(?:\?[^ ]*)?)/gi,
              '<br><img src="$1" class="gemini-image" alt="Generated Image"><br>',
            );

            // Handle remaining ∞
            extractedContent = extractedContent.replace(/∞/g, '<br>');

            // Handle newlines
            extractedContent = extractedContent.replace(/\n/g, '<br>');

            // Construct a new renderable document
            finalHtml = `<!DOCTYPE html>
            <html>
              <head>
                <base href="${baseUrl || ''}">
                <style>
                  body {
                    font-family: 'Google Sans', Roboto, sans-serif;
                    line-height: 1.5;
                    padding: 20px;
                    color: #e3e3e3;
                    background-color: #131314;
                  }
                  .gemini-separator {
                    border: 0;
                    border-top: 1px solid #444;
                    margin: 24px 0;
                  }
                  .gemini-image {
                    max-width: 100%;
                    border-radius: 8px;
                    margin: 12px 0;
                    border: 1px solid #333;
                  }
                  a { color: #8ab4f8; }
                  table { border-collapse: collapse; width: 100%; margin: 16px 0; }
                  th, td { border: 1px solid #444; padding: 8px; text-align: left; }
                  th { background-color: #1f1f1f; }
                </style>
              </head>
              <body>
                ${extractedContent}
              </body>
            </html>`;
          } catch (e) {
            console.error('Failed to parse Gemini WIZ data', e);
            // Fallback to original HTML if parsing fails
          }
        }

        // 1. Strip scripts to prevent execution/blanking (if we fell back to original HTML)
        finalHtml = finalHtml.replace(
          /<script\b[^>]*>[\s\S]*?<\/script>/gim,
          '',
        );

        // 2. Strip noscript tags (Fix for "Redirecting..." messages)
        finalHtml = finalHtml.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');

        // 3. Inject Base URL (if we didn't rebuild the doc)
        if (baseUrl && !finalHtml.includes('<base ')) {
          if (finalHtml.includes('<head>')) {
            finalHtml = finalHtml.replace(
              '<head>',
              `<head><base href="${baseUrl}">`,
            );
          } else {
            finalHtml = finalHtml.replace(
              /(<html[^>]*>)/i,
              `$1<head><base href="${baseUrl}"></head>`,
            );
          }
        }

        // 4. Inject styles (Dark mode + UI hiding)
        const GOOGLE_STYLES = `<style>
          /* Gemini Dark Mode Variable Overrides */
          :root {
            --gem-sys-color--surface: #131314 !important;
            --gem-sys-color--surface-container: #1e1f20 !important;
            --gem-sys-color--on-surface: #e3e3e3 !important;
            --bard-color-synthetic--chat-window-surface: #131314 !important;
            --bard-color-surface-dim-tmp: #131314 !important;
          }

          /* UI hiding - Gemini & Google Search (AI Mode) */
          bard-sidenav, mat-sidenav, .mat-drawer-backdrop, .side-nav-menu-button, /* Gemini */
          header, #header, #searchform, .sfbg, #appbar, /* Top bars */
          div[role="navigation"], #leftnav, #sidetogether, /* Sidebars */
          [role="banner"], .Fgvgjc, #hdtb, .hdtb-msb, /* Headers & Tools */
          footer, #footer, .fbar, /* Footers */
          .pdp-nav, [aria-label="Main menu"], .gb_Td, .gb_L, /* Misc UI */
          
          /* Specific AI Mode Selectors found in analysis */
          .DZ13He, /* Main sticky top bar */
          .wYq63b, /* Accessibility links bar */
          .eT9Cje, /* History/New Search buttons */
          .bNg8Rb, /* Hidden H1 headers */
          .S6VXfe, /* Accessibility container */
          .Lu57id  /* Potential other top bar */
          { display: none !important; }
          
          /* General Layout */
          main { width: 100% !important; max-width: 100% !important; margin: 0 !important; }
          
          /* Force Dark Mode on Body and Gemini Containers */
          body, .content-container, chat-app, .main-content, .chat-container {
            background-color: #131314 !important;
            color: #e3e3e3 !important;
          }
        </style>`;

        if (finalHtml.includes('<head>')) {
          finalHtml = finalHtml.replace('<head>', `<head>${GOOGLE_STYLES}`);
        } else {
          finalHtml = finalHtml.replace(
            /(<html[^>]*>)/i,
            `$1<head>${GOOGLE_STYLES}</head>`,
          );
        }

        return (
          <div className="h-full w-full rounded-md border bg-background">
            <iframe
              key={currentResult?.id}
              srcDoc={finalHtml}
              className="h-full w-full border-0"
              sandbox="allow-popups" // No scripts
              title="AI Response"
            />
          </div>
        );
      }

      // --- CHATGPT SPECIFIC LOGIC ---
      if (currentResult?.model === 'CHATGPT') {
        let finalHtml = htmlString;

        // 1. Inject Base URL
        if (baseUrl) {
          finalHtml = finalHtml.replace(
            '<head>',
            `<head><base href="${baseUrl}">`,
          );
        }

        // 2. Inject CSS Overrides (Force Dark Mode)
        const CHATGPT_STYLES = `<style>
          /* Force Dark Background on main containers and wrappers */
          html, body, main, article, footer, form, 
          [class*="bg-"], [class*="footer"], [class*="bottom"], 
          div[class*="border-t"],
          #thread-bottom-container, #thread-bottom,
          #thread, .composer-parent, .group\\/thread {
            background-color: #131314 !important;
            color: #e3e3e3 !important;
            border-color: #2a2b36 !important;
          }

          /* Force background on specific white artifacts in the footer */
          #thread-bottom-container .bg-clip-padding,
          #thread-bottom-container .content-fade,
          #thread-bottom-container .absolute {
             background-color: transparent !important;
          }
          
          /* Specific targeting for the composer/input box (was white) */
          form .bg-token-bg-primary, form .shadow-short {
            background-color: #2a2b36 !important;
            border-color: #3e3f4b !important;
            box-shadow: none !important;
          }

          /* Disclaimer Footer - Force Dark Background */
          div[class*="text-token-text-secondary"] {
            color: #9ca3af !important;
            background-color: #131314 !important;
          }
          
          /* Force Text Color to Light */
          p, h1, h2, h3, h4, h5, h6, li, span, div, td, th, textarea, button {
            color: #e3e3e3 !important;
          }
          
          /* Links - Light Blue */
          a, a span {
            color: #8ab4f8 !important; 
          }
          
          /* Code Blocks */
          pre, code, pre div, code span {
            background-color: #2a2b36 !important;
            color: #e3e3e3 !important;
            text-shadow: none !important;
          }
          
          /* Inputs/Textareas */
          input, textarea {
            background-color: transparent !important; /* Let container bg show */
            color: #e3e3e3 !important;
            border-color: #3e3f4b !important;
          }
          
          /* Placeholder text */
          textarea::placeholder {
            color: #9ca3af !important;
          }

          /* Hide Sidebar */
          nav, [class*="sidebar"] {
            display: none !important;
          }
          
          /* Media visibility */
          img, video {
            opacity: 1 !important;
          }
        </style>`;

        if (finalHtml.includes('<head>')) {
          finalHtml = finalHtml.replace('<head>', `<head>${CHATGPT_STYLES}`);
        } else {
          finalHtml = finalHtml.replace(
            /(<html[^>]*>)/i,
            `$1<head>${CHATGPT_STYLES}</head>`,
          );
        }

        return (
          <div className="h-full w-full rounded-md border bg-background">
            <iframe
              key={currentResult?.id}
              srcDoc={finalHtml}
              className="h-full w-full border-0"
              sandbox="allow-popups"
              title="ChatGPT Response"
            />
          </div>
        );
      }

      // --- PERPLEXITY SPECIFIC LOGIC ---
      if (currentResult?.model === 'PERPLEXITY') {
        let finalHtml = htmlString;

        // 1. Inject Base URL
        if (baseUrl) {
          finalHtml = finalHtml.replace(
            '<head>',
            `<head><base href="${baseUrl}">`,
          );
        }

        // 2. Inject Color Inversion Styles (Dark -> Light)
        const PERPLEXITY_STYLES = `<style>
          html { filter: invert(1) hue-rotate(180deg); background-color: white !important; }
          img, video, iframe, svg { filter: invert(1) hue-rotate(180deg); }
        </style>`;

        if (finalHtml.includes('<head>')) {
          finalHtml = finalHtml.replace('<head>', `<head>${PERPLEXITY_STYLES}`);
        } else {
          finalHtml = finalHtml.replace(
            /(<html[^>]*>)/i,
            `$1<head>${PERPLEXITY_STYLES}</head>`,
          );
        }

        return (
          <div className="h-full w-full rounded-md border bg-background">
            <iframe
              key={currentResult?.id}
              srcDoc={finalHtml}
              className="h-full w-full border-0"
              sandbox="allow-popups"
              title="Perplexity Response"
            />
          </div>
        );
      }

      // --- STANDARD LOGIC (Copilot, etc.) ---
      let finalHtml = htmlString;

      // Strip noscript tags (Standard practice)
      finalHtml = finalHtml.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');

      if (baseUrl) {
        finalHtml = finalHtml.replace(
          '<head>',
          `<head><base href="${baseUrl}">`,
        );
      }

      // Inject standard UI hiding styles
      finalHtml = finalHtml.replace(
        '</head>',
        `${HIDE_UI_ELEMENTS_STYLE}</head>`,
      );

      return (
        <div className="h-full w-full rounded-md border bg-background">
          <iframe
            key={currentResult?.id}
            srcDoc={finalHtml}
            className="h-full w-full border-0"
            sandbox="allow-popups"
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
      padding: 16px;
      font-family: system-ui, -apple-system, sans-serif;
      white-space: pre-wrap;
      word-wrap: break-word;
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
