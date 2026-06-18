import api from './api';

export interface ProjectResponse {
  id: string;
  userId: string;
  title: string;
  status: string;
  thumbnail: string | null;
  videoPath: string | null;
  youtubeUrl: string | null;
  aspectRatio: string;
  durationSeconds: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectRequest {
  title: string;
  aspectRatio: string;
}

export const projectService = {
  create: async (data: CreateProjectRequest): Promise<ProjectResponse> => {
    const response = await api.post<ProjectResponse>('/projects', data);
    return response.data;
  },

  getAll: async (): Promise<ProjectResponse[]> => {
    const response = await api.get<ProjectResponse[]>('/projects');
    return response.data;
  },

  getById: async (id: string): Promise<ProjectResponse> => {
    const response = await api.get<ProjectResponse>(`/projects/${id}`);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateProjectRequest>): Promise<ProjectResponse> => {
    const response = await api.put<ProjectResponse>(`/projects/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/projects/${id}`);
  },
};
