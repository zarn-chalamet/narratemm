import api from './api';

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface OAuthLoginRequest {
  provider: 'google' | 'facebook';
  idToken: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    avatar: string;
    provider: string;
    role: string;
    createdAt: string;
  };
  token: string;
  expiresIn: number;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  avatar: string;
  provider: string;
  role: string;
  createdAt: string;
}

export const authService = {
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', data);
    if (response.data.token) {
      localStorage.setItem('narratemm-token', response.data.token);
    }
    return response.data;
  },

  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', data);
    if (response.data.token) {
      localStorage.setItem('narratemm-token', response.data.token);
    }
    return response.data;
  },

  loginWithOAuth: async (data: OAuthLoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/oauth', data);
    if (response.data.token) {
      localStorage.setItem('narratemm-token', response.data.token);
    }
    return response.data;
  },

  getCurrentUser: async (): Promise<UserResponse> => {
    const response = await api.get<UserResponse>('/auth/me');
    return response.data;
  },

  logout: async (): Promise<void> => {
    localStorage.removeItem('narratemm-token');
  },
};
