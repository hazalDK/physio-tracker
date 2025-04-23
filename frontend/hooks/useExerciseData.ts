import { useState, useEffect } from "react";
import { Alert } from "react-native";
import axios from "axios";
import { ExerciseItem, UserExerciseItem } from "@/types/exercise";
import { useAuth } from "./useAuth";

/**
 * Custom hook to fetch and manage exercise data.
 * @param {number} exerciseId - The ID of the exercise.
 * @param {number | null} userExerciseId - The ID of the user exercise.
 * @returns {Object} - An object containing loading state, exercise data, and user exercise data.
 */
export function useExerciseData(
  exerciseId: number,
  userExerciseId: number | null
): {
  loading: boolean;
  exercise?: ExerciseItem;
  userExercise?: UserExerciseItem;
} {
  const [loading, setLoading] = useState(true);
  const [exercise, setExercise] = useState<ExerciseItem>();
  const [userExercise, setUserExercise] = useState<UserExerciseItem>();
  const { createApiInstance, refreshToken } = useAuth();

  // Function to fetch exercise and user exercise data and handle token refresh if needed
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Create API instance
        const api = await createApiInstance();
        if (!api) return;

        try {
          // Fetch user exercise and exercise data
          const [userExercisesResponse, exercisesResponse] = await Promise.all([
            api.get(`/user-exercises/${userExerciseId}/`),
            api.get(`/exercises/${exerciseId}/`),
          ]);

          // Set user exercise and exercise data
          setUserExercise(
            !Array.isArray(userExercisesResponse.data)
              ? userExercisesResponse.data
              : ({} as UserExerciseItem)
          );

          setExercise(
            !Array.isArray(exercisesResponse.data)
              ? exercisesResponse.data
              : ({} as ExerciseItem)
          );
        } catch (error) {
          // Handle 401 error by refreshing the token and retrying the request
          if (axios.isAxiosError(error) && error.response?.status === 401) {
            const newToken = await refreshToken();
            if (!newToken) return;

            const api = await createApiInstance();
            if (!api) return;

            const [retryUserExercises, retryExercises] = await Promise.all([
              api.get(`/user-exercises/${userExerciseId}/`),
              api.get(`/exercises/${exerciseId}/`),
            ]);

            setUserExercise(
              !Array.isArray(retryUserExercises.data)
                ? retryUserExercises.data
                : ({} as UserExerciseItem)
            );

            setExercise(
              !Array.isArray(retryExercises.data)
                ? retryExercises.data
                : ({} as ExerciseItem)
            );
          } else {
            // Handle other errors
            console.error("API request failed:", error);
            Alert.alert(
              "Error",
              "Failed to load your exercises. Please check your connection and try again."
            );
            setExercise({} as ExerciseItem);
            setUserExercise({} as UserExerciseItem);
          }
        }
      } catch (error) {
        console.error("Failed to load exercise data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [exerciseId, userExerciseId]);

  return { loading, exercise, userExercise };
}
