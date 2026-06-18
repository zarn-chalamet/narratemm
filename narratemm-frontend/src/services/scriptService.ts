import api from './api';

export interface ScriptResponse {
  id: string;
  projectId: string;
  content: string;
  style: string;
  language: string;
  segments: any[];
  geminiModel: string;
  createdAt: string;
  updatedAt: string;
}

export const scriptService = {
  generate: async (projectId: string, style: string, language: string): Promise<ScriptResponse> => {
    const response = await api.post<ScriptResponse>(`/script/generate/${projectId}`, { style, language });
    return response.data;
  },

  get: async (projectId: string): Promise<ScriptResponse> => {
    const response = await api.get<ScriptResponse>(`/script/${projectId}`);
    return response.data;
  },

  update: async (projectId: string, content: string): Promise<ScriptResponse> => {
    const response = await api.put<ScriptResponse>(`/script/${projectId}`, { content });
    return response.data;
  },
};
