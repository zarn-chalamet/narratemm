import api from './api';

export interface TranscriptResponse {
  id: string;
  projectId: string;
  rawText: string;
  srtContent: string;
  language: string;
  source: string;
  durationSeconds: number | null;
  createdAt: string;
}

export interface TranscribeResponse {
  transcript: TranscriptResponse;
  message: string;
}

export const transcriptService = {
  transcribe: async (projectId: string): Promise<TranscribeResponse> => {
    const response = await api.post<TranscribeResponse>(`/transcript/transcribe/${projectId}`);
    return response.data;
  },

  get: async (projectId: string): Promise<TranscriptResponse> => {
    const response = await api.get<TranscriptResponse>(`/transcript/${projectId}`);
    return response.data;
  },

  update: async (projectId: string, rawText: string, srtContent: string): Promise<TranscriptResponse> => {
    const response = await api.put<TranscriptResponse>(`/transcript/${projectId}`, { rawText, srtContent });
    return response.data;
  },
};
