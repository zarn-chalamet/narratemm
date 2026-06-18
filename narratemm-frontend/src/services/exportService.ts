import api from './api';

export interface ExportSettings {
  aspectRatio: string;
  logoPath?: string;
  logoPosition?: string;
  logoSize?: number;
  logoOpacity?: number;
  subtitleEnabled?: boolean;
  subtitleFont?: string;
  subtitleSize?: number;
  audioMix?: number;
}

export interface ExportResponse {
  id: string;
  projectId: string;
  status: string;
  progress: number;
  outputPath: string | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

export const exportService = {
  start: async (projectId: string, settings: ExportSettings): Promise<ExportResponse> => {
    const response = await api.post<ExportResponse>(`/export/start/${projectId}`, { settings });
    return response.data;
  },

  getStatus: async (jobId: string): Promise<ExportResponse> => {
    const response = await api.get<ExportResponse>(`/export/status/${jobId}`);
    return response.data;
  },

  getDownloadUrl: (jobId: string): string => {
    return `http://localhost:8080/api/export/download/${jobId}`;
  },

  cancel: async (jobId: string): Promise<void> => {
    await api.delete(`/export/${jobId}`);
  },
};
