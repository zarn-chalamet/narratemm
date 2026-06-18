import { create } from 'zustand';
import { projectService, type ProjectResponse } from '../services/projectService';

interface ProjectState {
  projects: ProjectResponse[];
  currentProject: ProjectResponse | null;
  isLoading: boolean;
  error: string | null;

  loadProjects: () => Promise<void>;
  loadProject: (id: string) => Promise<void>;
  createProject: (title: string, aspectRatio: string) => Promise<ProjectResponse>;
  updateProject: (id: string, data: { title?: string; aspectRatio?: string }) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  clearCurrentProject: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,

  loadProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const projects = await projectService.getAll();
      set({ projects, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to load projects', isLoading: false });
    }
  },

  loadProject: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const project = await projectService.getById(id);
      set({ currentProject: project, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to load project', isLoading: false });
    }
  },

  createProject: async (title: string, aspectRatio: string) => {
    set({ isLoading: true, error: null });
    try {
      const project = await projectService.create({ title, aspectRatio });
      set((state) => ({
        projects: [project, ...state.projects],
        currentProject: project,
        isLoading: false,
      }));
      return project;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to create project';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  updateProject: async (id: string, data: { title?: string; aspectRatio?: string }) => {
    try {
      const updated = await projectService.update(id, data);
      set((state) => ({
        projects: state.projects.map((p) => (p.id === id ? updated : p)),
        currentProject: state.currentProject?.id === id ? updated : state.currentProject,
      }));
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to update project');
    }
  },

  deleteProject: async (id: string) => {
    try {
      await projectService.delete(id);
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        currentProject: state.currentProject?.id === id ? null : state.currentProject,
      }));
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to delete project');
    }
  },

  clearCurrentProject: () => set({ currentProject: null }),
}));
