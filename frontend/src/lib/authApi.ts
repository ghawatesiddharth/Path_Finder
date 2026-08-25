import api from './api';

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserResponse {
  id: string;
  email: string;
  is_active: boolean;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export async function registerUser(
  data: RegisterRequest
): Promise<UserResponse> {
  const response = await api.post<UserResponse>(
    '/auth/register',
    data
  );

  return response.data;
}

export async function loginUser(
  data: LoginRequest
): Promise<TokenResponse> {
  const response = await api.post<TokenResponse>(
    '/auth/login',
    data
  );

  localStorage.setItem(
    'access_token',
    response.data.access_token
  );

  return response.data;
}

export async function getCurrentUser(): Promise<UserResponse> {
  const response = await api.get<UserResponse>(
    '/auth/me'
  );

  return response.data;
}

export function logoutUser(): void {
  localStorage.removeItem('access_token');
}

export function isAuthenticated(): boolean {
  return Boolean(
    localStorage.getItem('access_token')
  );
}