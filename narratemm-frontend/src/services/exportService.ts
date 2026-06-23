import api from './api';

export interface ExportSettings {
  aspectRatio: string;
  logoPath?: string;
  logoPosition?: string;
  logoX?: number;
  logoY?: number;
  logoSize?: number;
  logoOpacity?: number;
  subtitleEnabled?: boolean;
  subtitleFont?: string;
  subtitleSize?: number;
  audioMix?: number;
  subtitleLanguage?: 'burmese' | 'original'; 
}

export interface ExportResponse {
  id: string;
  projectId: string;
  status: 'processing' | 'done' | 'failed';
  progress: number;
  outputPath: string | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

export interface LogoUploadResponse {
  logoPath: string;
  message: string;
}

export const exportService = {
  start: async (projectId: string, settings: ExportSettings): Promise<ExportResponse> => {
    
    console.log('📤 Sending export settings:', settings);

    const response = await api.post<ExportResponse>(
      `/export/start/${projectId}`,
      { settings }
    );
    return response.data;
  },

  getStatus: async (jobId: string): Promise<ExportResponse> => {
    const response = await api.get<ExportResponse>(`/export/status/${jobId}`);
    return response.data;
  },

  getDownloadUrl: (jobId: string): string => {
    return `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/export/download/${jobId}`;
  },

  getPreviewUrl: (jobId: string): string => {
    return `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/export/preview/${jobId}`;
  },

  downloadFile: async (jobId: string, filename: string): Promise<void> => {
    const response = await api.get(`/export/download/${jobId}`, {
      responseType: 'blob',
    });
    
    const blob = new Blob([response.data], { type: 'video/mp4' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  uploadLogo: async (
    projectId: string, 
    file: File
  ): Promise<{ logoPath: string }> => {
    const formData = new FormData();
    formData.append('logo', file);
    
    const response = await api.post<{ logoPath: string }>(
      `/upload/logo/${projectId}`, 
      formData
    );
    return response.data;
  },

};