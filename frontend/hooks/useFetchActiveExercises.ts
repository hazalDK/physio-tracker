import { useState, useCallback } from "react";
import { Alert } from "react-native";
import axios from "axios";
import { ExerciseItem, UserExerciseItem } from "@/types/exercise";
import { useAuth } from "./useAuth";

export function useFetchActiveExercises() {
  const [loading, setLoading] = useState(true);
  const [userExercises, setUserExercises] = useState<UserExerciseItem[]>([]);
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const { createApiInstance, refreshToken } = useAuth();

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const api = await createApiInstance();
      if (!api) return;

      try {
        const [userExercisesResponse, exercisesResponse] = await Promise.all([
          api.get("/user-exercises/"),
          api.get("/users/active_exercises/"),
        ]);

        setUserExercises(
          Array.isArray(userExercisesResponse.data)
            ? userExercisesResponse.data
            : []
        );

        setExercises(
          Array.isArray(exercisesResponse.data) ? exercisesResponse.data : []
        );
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          const newToken = await refreshToken();
          if (!newToken) return;

          const api = await createApiInstance();
          if (!api) return;

          const [retryUserExercises, retryExercises] = await Promise.all([
            api.get("/user-exercises/"),
            api.get("/users/active_exercises/"),
          ]);

          setUserExercises(
            Array.isArray(retryUserExercises.data)
              ? retryUserExercises.data
              : []
          );

          setExercises(
            Array.isArray(retryExercises.data) ? retryExercises.data : []
          );
        } else {
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

  const refreshData = useCallback(() => {
    fetchData();
    setRefreshKey((prev) => prev + 1);
  }, [fetchData]);

  return {
    loading,
    userExercises,
    exercises,
    refreshKey,
    fetchData,
    refreshData,
  };
}
