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

export const voiceService = {
  generate: async (projectId: string, voiceName: string, stylePrompt?: string, speed?: number): Promise<VoiceResponse> => {
    const response = await api.post<VoiceResponse>(`/voice/generate/${projectId}`, {
      voiceName,
      stylePrompt: stylePrompt || '',
      speed: speed || 1.0,
    });
    return response.data;
  },

  get: async (projectId: string): Promise<VoiceResponse> => {
    const response = await api.get<VoiceResponse>(`/voice/${projectId}`);
    return response.data;
  },

  getAudioUrl: (projectId: string): string => {
    return `http://localhost:8080/api/voice/audio/${projectId}`;
  },
};
