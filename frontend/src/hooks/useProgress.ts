'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api,
  ProgressOverviewSchema,
  ProgressTrendsSchema,
  TopicMasteryListSchema,
} from '@/lib/api';

// Helper to determine active polling only when tab is visible
const getActivePollInterval = () => {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    return false;
  }
  return 6000; // 6 seconds near-real-time polling
};

export function useProgressOverview() {
  return useQuery({
    queryKey: ['progress', 'overview'],
    queryFn: () => api.get('/progress/overview', ProgressOverviewSchema),
    refetchInterval: getActivePollInterval,
    refetchOnWindowFocus: true,
    staleTime: 3000,
  });
}

export function useProgressTrends() {
  return useQuery({
    queryKey: ['progress', 'trends'],
    queryFn: () => api.get('/progress/trends', ProgressTrendsSchema),
    refetchInterval: getActivePollInterval,
    refetchOnWindowFocus: true,
    staleTime: 3000,
  });
}

export function useTopicMastery() {
  return useQuery({
    queryKey: ['progress', 'topics'],
    queryFn: () => api.get('/progress/topic-mastery', TopicMasteryListSchema),
    refetchInterval: getActivePollInterval,
    refetchOnWindowFocus: true,
    staleTime: 5000,
  });
}

export function useInvalidateAnalytics() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['progress'] });
    void queryClient.invalidateQueries({ queryKey: ['analytics'] });
  };
}
