import api from './api';

export interface VoiceResponse {
  id: string;
  projectId: string;
  audioPath: string;
  voiceName: string;
  stylePrompt: string;
  speed: number;
  durationSeconds: number | null;
  createdAt: string;
}

export interface GenerateVoiceRequest {
  voiceName: string;
  stylePrompt?: string;
  speed?: number;
}

export const voiceService = {
  generate: async (projectId: string, data: GenerateVoiceRequest): Promise<VoiceResponse> => {
    const response = await api.post<VoiceResponse>(`/voice/generate/${projectId}`, data);
    return response.data;
  },

  get: async (projectId: string): Promise<VoiceResponse | null> => {
    try {
      const response = await api.get<VoiceResponse>(`/voice/${projectId}`);
      return response.data;
    } catch (err: any) {
      if (err.response?.status === 404) return null;
      throw err;
    }
  },

  getAudioUrl: (projectId: string): string => {
    return `http://localhost:8080/api/voice/audio/${projectId}`;
  },
};