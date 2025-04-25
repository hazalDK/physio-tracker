import { useState, useCallback } from "react";
import { Alert } from "react-native";
import axios from "axios";
import { ExerciseItem, UserExerciseItem } from "@/types/exercise";
import { useAuth } from "./useAuth";

/**
 * Custom hook to fetch and manage active exercises and user exercises data.
 */
export function useFetchDashboardExercises(): {
  loading: boolean;
  userExercises: UserExerciseItem[];
  exercises: ExerciseItem[];
  inActiveExercises: ExerciseItem[];
  refreshKey: number;
  fetchData: () => Promise<void>;
  refreshData: () => void;
} {
  const [loading, setLoading] = useState(true);
  const [userExercises, setUserExercises] = useState<UserExerciseItem[]>([]);
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [inActiveExercises, setInActiveExercises] = useState<ExerciseItem[]>(
    []
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const { createApiInstance, refreshToken } = useAuth();

  // Function to fetch active exercises and user exercises data and handle token refresh if needed
  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      // Create API instance
      const api = await createApiInstance();
      if (!api) return;

      try {
        // Fetch user exercises and active exercises data
        const [
          userExercisesResponse,
          exercisesResponse,
          inactiveExercisesResponse,
        ] = await Promise.all([
          api.get("/user-exercises/"),
          api.get("/users/active_exercises/"),
          api.get("/users/inactive_exercises/"),
        ]);

        // Set user exercises and active exercises data
        setUserExercises(
          Array.isArray(userExercisesResponse.data)
            ? userExercisesResponse.data
            : []
        );

        setExercises(
          Array.isArray(exercisesResponse.data) ? exercisesResponse.data : []
        );

        setInActiveExercises(
          Array.isArray(inactiveExercisesResponse.data)
            ? inactiveExercisesResponse.data
            : []
        );

        setInActiveExercises(
          Array.isArray(inactiveExercisesResponse.data)
            ? inactiveExercisesResponse.data
            : []
        );
      } catch (error) {
        // Handle 401 error by refreshing the token and retrying the request
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          const newToken = await refreshToken();
          if (!newToken) return;

          // Create a new API instance with the refreshed token
          const api = await createApiInstance();
          if (!api) return;

          // Retry fetching user exercises and active exercises data
          const [retryUserExercises, retryExercises, retryInactiveExercises] =
            await Promise.all([
              api.get("/user-exercises/"),
              api.get("/users/active_exercises/"),
              api.get("/users/inactive_exercises/"),
            ]);

          // Set user exercises and active exercises data
          setUserExercises(
            Array.isArray(retryUserExercises.data)
              ? retryUserExercises.data
              : []
          );

          setExercises(
            Array.isArray(retryExercises.data) ? retryExercises.data : []
          );

          setInActiveExercises(
            Array.isArray(retryInactiveExercises.data)
              ? retryInactiveExercises.data
              : []
          );
        } else {
          // Handle other errors
          // Log the error and show an alert to the user
          console.error("API request failed:", error);
          Alert.alert(
            "Error",
            "Failed to load your exercises. Please check your connection and try again."
          );
          setExercises([]);
          setUserExercises([]);
        }
      }
    } catch (error) {
      console.error("Failed to load exercises:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Function to refresh data by calling fetchData and updating the refresh key
  const refreshData = useCallback(() => {
    fetchData();
    setRefreshKey((prev) => prev + 1);
  }, [fetchData]);

  return {
    loading,
    userExercises,
    exercises,
    inActiveExercises,
    refreshKey,
    fetchData,
    refreshData,
  };
}
