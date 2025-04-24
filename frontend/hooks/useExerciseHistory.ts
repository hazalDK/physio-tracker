import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "./useAuth";
import { ExerciseHistoryItem } from "@/types/report";

export function useExerciseHistory() {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<ExerciseHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { createApiInstance, refreshToken } = useAuth();

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const api = await createApiInstance();
      if (!api) return;

      try {
        // Fetch exercise history from the API
        const response = await api.get("/reports/exercise_history/");
        if (response.data && response.data.history) {
          setHistory(response.data.history);
        }
      } catch (error) {
        // Handle 401 error by refreshing the token and retrying the request
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          // Attempt token refresh
          const newToken = await refreshToken();
          if (!newToken) return;

          const api = await createApiInstance();
          if (!api) return;

          // Retry with new token
          const response = await api.get("/reports/exercise_history/");
          if (response.data && response.data.history) {
            setHistory(response.data.history);
          }
        } else {
          // Handle other errors
          console.error("API request failed:", error);
          setError(
            "Failed to load your exercise history. Please check your connection and try again."
          );
        }
      }
    } catch (error) {
      console.error("Failed to load exercise history.");
      setError("An error occurred while loading exercise history.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch history on component mount
  useEffect(() => {
    fetchHistory();
  }, []);

  return {
    loading,
    history,
    error,
    refreshHistory: fetchHistory,
  };
}
