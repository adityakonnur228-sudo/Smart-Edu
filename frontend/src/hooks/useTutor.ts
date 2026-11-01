'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, TutorConversationSchema, TutorConversationPageSchema, TutorAskResponseSchema, type TutorConversation, type TutorConversationPage, type TutorAskResponse, type TutorSource } from '@/lib/api';
import { z } from 'zod';

export type { TutorAskResponse, TutorSource, TutorConversationPage };

export function useTutorConversations(page = 0, size = 20) {
  return useQuery({
    queryKey: ['tutor', 'conversations', page, size],
    queryFn: () => api.get(`/tutor/conversations?page=${page}&size=${size}`, TutorConversationPageSchema),
  });
}

export function useTutorConversation(id: number) {
  return useQuery({
    queryKey: ['tutor', 'conversation', id],
    queryFn: () => api.get(`/tutor/conversations/${id}`),
    enabled: !!id,
  });
}

export function useCreateTutorConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (title: string) =>
      api.post('/tutor/conversations', { title }, TutorConversationSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutor', 'conversations'] });
    },
  });
}

export function useAskTutor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { question: string; materialId?: number; materialIds?: number[]; attachments?: any[]; conversationId?: number; grounded?: boolean; model?: string }) => {
      const headers: Record<string, string> = {};
      if (data.model) headers['X-LLM-Model'] = data.model;
      return api.post('/tutor/ask', data, TutorAskResponseSchema, { headers });
    },
    onSuccess: (result, { conversationId }) => {
      if (conversationId) {
        queryClient.invalidateQueries({ queryKey: ['tutor', 'conversation', conversationId] });
      }
      queryClient.invalidateQueries({ queryKey: ['tutor', 'conversations'] });
    },
  });
}

export function useAskTutorGrounded() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { question: string; materialIds: number[]; attachments?: any[]; conversationId?: number; model?: string }) => {
      const headers: Record<string, string> = {};
      if (data.model) headers['X-LLM-Model'] = data.model;
      return api.post('/tutor/ask-grounded', data, TutorAskResponseSchema, { headers });
    },
    onSuccess: (result, { conversationId }) => {
      if (conversationId) {
        queryClient.invalidateQueries({ queryKey: ['tutor', 'conversation', conversationId] });
      }
      queryClient.invalidateQueries({ queryKey: ['tutor', 'conversations'] });
    },
  });
}

export function useDeleteTutorConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.delete(`/tutor/conversations/${id}`),
    onSuccess: (_, id) => {
      queryClient.setQueryData(['tutor', 'conversations'], (old: any) =>
        Array.isArray(old) ? old.filter((c: any) => c.id !== id) : []
      );
      queryClient.invalidateQueries({ queryKey: ['tutor', 'conversations'] });
    },
  });
}

export function useClearAllTutorConversations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.delete('/tutor/conversations'),
    onSuccess: () => {
      queryClient.setQueryData(['tutor', 'conversations'], []);
      queryClient.invalidateQueries({ queryKey: ['tutor', 'conversations'] });
    },
  });
}

export function useRenameTutorConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, title }: { id: number; title: string }) =>
      api.patch(`/tutor/conversations/${id}`, { title }, TutorConversationSchema),
    onSuccess: (updated, { id }) => {
      queryClient.setQueryData(['tutor', 'conversation', id], updated);
      queryClient.invalidateQueries({ queryKey: ['tutor', 'conversations'] });
    },
  });
}

export function useTutorHealth() {
  return useQuery({
    queryKey: ['tutor', 'health'],
    queryFn: () => api.get('/tutor/health'),
    refetchInterval: 30000, // Check every 30 seconds
  });
}