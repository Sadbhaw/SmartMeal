import axios, { AxiosInstance } from "axios";
import * as SecureStore from "expo-secure-store";

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

// Use EXPO_PUBLIC_API_URL for development (must be prefixed with EXPO_PUBLIC_)
// Fallback to localhost for development environments where LAN is not applicable
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

console.log(`[Auth Client] Connecting to API: ${API_URL}`);

const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Add access token to requests
axiosInstance.interceptors.request.use(async (config) => {
  const accessToken = await SecureStore.getItemAsync("access_token");
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Handle token refresh on 401
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await SecureStore.getItemAsync("refresh_token");
        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        const response = await axios.post(`${API_URL}/api/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token } = response.data;

        await SecureStore.setItemAsync("access_token", access_token);
        await SecureStore.setItemAsync("refresh_token", refresh_token);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and force re-login
        await SecureStore.deleteItemAsync("access_token");
        await SecureStore.deleteItemAsync("refresh_token");
        throw refreshError;
      }
    }

    return Promise.reject(error);
  }
);

export const authClient = {
  register: async (email: string, password: string): Promise<AuthTokens> => {
    const response = await axiosInstance.post("/api/auth/register", {
      email,
      password,
    });
    return {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
    };
  },

  login: async (email: string, password: string): Promise<AuthTokens> => {
    const response = await axiosInstance.post("/api/auth/login", {
      email,
      password,
    });
    return {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
    };
  },

  logout: async (): Promise<void> => {
    const refreshToken = await SecureStore.getItemAsync("refresh_token");
    if (refreshToken) {
      try {
        await axiosInstance.post("/api/auth/logout", { refresh_token: refreshToken });
      } catch {
        // Ignore errors during logout
      }
    }
    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("refresh_token");
  },

  getCurrentUser: async (): Promise<{ id: number; email: string }> => {
    const response = await axiosInstance.get("/api/auth/me");
    return response.data.data;
  },

  storeTokens: async (tokens: AuthTokens): Promise<void> => {
    await SecureStore.setItemAsync("access_token", tokens.access_token);
    await SecureStore.setItemAsync("refresh_token", tokens.refresh_token);
  },

  getStoredTokens: async (): Promise<AuthTokens | null> => {
    const accessToken = await SecureStore.getItemAsync("access_token");
    const refreshToken = await SecureStore.getItemAsync("refresh_token");

    if (!accessToken || !refreshToken) {
      return null;
    }

    return { access_token: accessToken, refresh_token: refreshToken };
  },

  getAccessToken: async (): Promise<string | null> => {
    return await SecureStore.getItemAsync("access_token");
  },

  clearTokens: async (): Promise<void> => {
    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("refresh_token");
  },

  getAuthenticatedAxios: () => axiosInstance,
};
