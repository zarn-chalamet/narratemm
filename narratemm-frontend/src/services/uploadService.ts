import api from './api';

export interface UploadResponse {
  projectId: string;
  videoPath: string;
  fileName: string;
  fileSize: number;
  durationSeconds: number | null;
  message: string;
}

export const uploadService = {
  uploadFile: async (projectId: string, file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', projectId);

    const response = await api.post<UploadResponse>('/upload/file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  uploadYoutube: async (projectId: string, youtubeUrl: string): Promise<UploadResponse> => {
    const response = await api.post<UploadResponse>('/upload/youtube', {
      projectId,
      youtubeUrl,
    });
    return response.data;
  },

  uploadLogo: async (projectId: string, file: File): Promise<{ logoPath: string }> => {
    const formData = new FormData();
    formData.append('logo', file);
    const response = await api.post<{ logoPath: string }>(`/upload/logo/${projectId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};
