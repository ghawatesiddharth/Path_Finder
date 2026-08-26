import api from "./api";

export interface RegisterData {
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface UserResponse {
  id: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export async function registerUser(data: RegisterData) {
  const response = await api.post<UserResponse>(
    "/auth/register",
    data
  );

  return response.data;
}

export async function loginUser(data: LoginData) {
  const response = await api.post<TokenResponse>(
    "/auth/login",
    data
  );

  localStorage.setItem(
    "access_token",
    response.data.access_token
  );

  return response.data;
}

export async function getCurrentUser() {
  const response = await api.get<UserResponse>(
    "/auth/me"
  );

  return response.data;
}

export function logoutUser() {
  localStorage.removeItem("access_token");
}

export function isLoggedIn() {
  return Boolean(
    localStorage.getItem("access_token")
  );
}