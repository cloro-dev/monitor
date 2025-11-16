import { authClient } from "./auth-client";

// Type for API response with optional error handling
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

// Generic fetcher for SWR that includes authentication
export async function fetcher<JSON = any>(
  input: RequestInfo,
  init?: RequestInit
): Promise<JSON> {
  try {
    // Get the current session to include authentication
    const session = await authClient.getSession({
      fetchOptions: {
        headers: {
          'Content-Type': 'application/json',
          ...init?.headers,
        },
      },
    });

    // Prepare headers with authentication
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((init?.headers as Record<string, string>) || {}),
    };

    // Add session cookie if available (Better Auth handles this automatically)
    // But we can add any additional auth headers if needed
    if (session.data?.user) {
      // The session cookie is automatically sent with fetch
      // No need to manually add Authorization header for Better Auth
    }

    const response = await fetch(input, {
      ...init,
      headers,
    });

    // Handle different response types
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || errorData.message || response.statusText;
      throw new Error(errorMessage);
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    // Return text for non-JSON responses
    return (await response.text()) as unknown as JSON;
  } catch (error) {
    // Re-throw the error for SWR to handle
    throw error;
  }
}

// Specialized fetcher for GET requests
export const get = <T = any>(url: string) => fetcher<T>(url);

// Specialized fetcher for POST requests
export const post = <T = any>(url: string, data?: any) =>
  fetcher<T>(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });

// Specialized fetcher for PUT requests
export const put = <T = any>(url: string, data?: any) =>
  fetcher<T>(url, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });

// Specialized fetcher for PATCH requests
export const patch = <T = any>(url: string, data?: any) =>
  fetcher<T>(url, {
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });

// Specialized fetcher for DELETE requests
export const del = <T = any>(url: string) =>
  fetcher<T>(url, {
    method: 'DELETE',
  });

// Export a default fetcher for SWR
export default fetcher;