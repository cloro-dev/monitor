'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

interface LazyFaviconProps {
  url: string;
  hostname: string;
  size?: 'sm' | 'md' | 'lg';
  fallbackClassName?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

const fallbackSizes = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export function LazyFavicon({
  url,
  hostname,
  size = 'md',
  fallbackClassName = '',
}: LazyFaviconProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get favicon URL with cache busting for failed requests
  const getFaviconUrl = (hostname: string, retry: boolean = false) => {
    const domain = hostname.startsWith('www.')
      ? hostname.substring(4)
      : hostname;
    const cacheParam = retry ? `?retry=${Date.now()}` : '';
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64${cacheParam}`;
  };

  // Intersection Observer for lazy loading
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px', // Start loading 50px before element comes into view
      },
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [isVisible]);

  // Load favicon when element becomes visible
  useEffect(() => {
    if (!isVisible || hasError || !imgRef.current) return;

    // Check if we already have the correct src set
    const currentSrc = imgRef.current.src;
    const targetSrc = getFaviconUrl(hostname);
    if (currentSrc === targetSrc) return;

    // Set loading state before starting async operation
    const loadingTimeout = setTimeout(() => setIsLoading(true), 0);

    // Preload the image to check if it loads successfully
    const img = new Image();
    img.onload = () => {
      clearTimeout(loadingTimeout);
      setIsLoading(false);
      setHasError(false);
    };

    img.onerror = () => {
      clearTimeout(loadingTimeout);
      setIsLoading(false);
      setHasError(true);
      // Retry once with a cache busting parameter
      if (imgRef.current && !imgRef.current.src.includes('retry=')) {
        imgRef.current.src = getFaviconUrl(hostname, true);
      }
    };

    img.src = targetSrc;

    return () => {
      clearTimeout(loadingTimeout);
    };
  }, [isVisible, hostname, hasError]);

  // Generate fallback text from hostname
  const getFallbackText = (hostname: string) => {
    const domain = hostname.replace(/^www\./, '').split('.')[0];
    return domain.charAt(0).toUpperCase();
  };

  return (
    <div ref={containerRef} className="relative">
      <Avatar className={`${sizeClasses[size]} ${fallbackClassName}`}>
        {isVisible && !hasError ? (
          <>
            {isLoading && (
              <Skeleton className={`${sizeClasses[size]} absolute inset-0`} />
            )}
            <AvatarImage
              ref={imgRef}
              src={getFaviconUrl(hostname)}
              alt={`${hostname} favicon`}
              className="object-cover"
              onError={() => {
                // If the image in AvatarImage fails to load, fallback will be shown
                setHasError(true);
                setIsLoading(false);
              }}
            />
          </>
        ) : (
          <AvatarFallback
            className={`bg-muted text-muted-foreground ${fallbackSizes[size]}`}
          >
            {getFallbackText(hostname)}
          </AvatarFallback>
        )}
      </Avatar>
    </div>
  );
}

// Memoized version to prevent unnecessary re-renders in tables
export const MemoizedLazyFavicon = React.memo(LazyFavicon);

// For usage in table cells with consistent sizing
export function FaviconCell({
  url,
  hostname,
}: {
  url: string;
  hostname: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <LazyFavicon url={url} hostname={hostname} size="sm" />
    </div>
  );
}
