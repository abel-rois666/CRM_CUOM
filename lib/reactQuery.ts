
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Data remains fresh for 5 minutes
      gcTime: 1000 * 60 * 30, // Cache garbage collection time (30 mins)
      refetchOnWindowFocus: false, // Disable auto-refetch on window focus for better UX
      retry: 1,
    },
  },
});
