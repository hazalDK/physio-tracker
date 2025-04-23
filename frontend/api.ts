// api.ts - API services using your useAuth hook
import axios, { AxiosInstance } from "axios";
import { useAuth } from "./hooks/useAuth";

// Constants
const API_BASE_URL = process.env.API_URL || "http://192.168.68.111:8000";

// Chat API service that uses the auth hook
export const createChatApi = (api: AxiosInstance | null) => {
  // Return empty functions if API is null
  if (!api) {
    return {
      fetchUserExercises: async () => [],
      fetchReports: async () => [],
      sendChatMessage: async () => ({ message: "Authentication required" }),
      resetChat: async () => {},
    };
  }

  return {
    fetchUserExercises: async () => {
      const response = await api.get("/user-exercises/");
      return response.data;
    },

    fetchReports: async () => {
      const response = await api.get("/reports/");
      return response.data;
    },

    sendChatMessage: async (message: string, exerciseContext: any) => {
      const response = await api.post("/api/chatbot/", {
        message,
        exerciseContext: JSON.stringify(exerciseContext),
      });
      return response.data;
    },

    resetChat: async () => {
      await api.post("/api/reset-chat/", {});
    },
  };
};

// Helper function for handling API requests with token refresh
export const apiRequestWithRefresh = async (
  apiCall: () => Promise<any>,
  auth: ReturnType<typeof useAuth>
) => {
  try {
    return await apiCall();
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      // Try to refresh the token
      const newToken = await auth.refreshToken();
      if (newToken) {
        // Create a new API instance with the refreshed token
        const newApi = axios.create({
          baseURL: API_BASE_URL,
          timeout: 10000,
          headers: {
            Authorization: `Bearer ${newToken}`,
            "Content-Type": "application/json",
          },
        });

        // Retry the original request with the new token
        try {
          return await apiCall();
        } catch (retryError) {
          throw retryError;
        }
      }
    }
    throw error;
  }
};
