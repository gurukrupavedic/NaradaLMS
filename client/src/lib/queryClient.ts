import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { createApiError, type ApiError } from "@/types/api-errors";

async function throwIfResNotOk(res: Response): Promise<void> {
  if (!res.ok) {
    let errorData: any = {};
    
    try {
      const contentType = res.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        errorData = await res.json();
      } else {
        errorData = { message: await res.text() };
      }
    } catch {
      errorData = { message: res.statusText };
    }

    const apiError: ApiError = createApiError(
      res.status,
      errorData.message || `HTTP ${res.status}: ${res.statusText}`,
      errorData.code,
      errorData.details
    );

    throw apiError;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method: method.toUpperCase(),
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: (failureCount, error: any) => {
        // Maximum 3 retry attempts
        if (failureCount >= 3) return false;
        
        // Don't retry client errors (4xx) or auth failures
        if (error?.status >= 400 && error?.status < 500) return false;
        if (error?.message?.includes('401') || error?.message?.includes('403')) return false;
        
        // Retry network and server errors
        return error?.isNetworkError || error?.isServerError || error?.status >= 500;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Maximum 2 retry attempts for mutations
        if (failureCount >= 2) return false;
        
        // Don't retry client errors (4xx)
        if (error?.status >= 400 && error?.status < 500) return false;
        
        // Only retry network and server errors
        return error?.isNetworkError || error?.isServerError;
      },
      retryDelay: 1000,
    },
  },
});
