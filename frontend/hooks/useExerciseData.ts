import { useState, useEffect } from "react";
import { Alert } from "react-native";
import axios from "axios";
import { ExerciseItem, UserExerciseItem } from "@/types/exercise";
import { useAuth } from "./useAuth";

export function useExerciseData(
  exerciseId: number,
  userExerciseId: number | null
) {
  const [loading, setLoading] = useState(true);
  const [exercise, setExercise] = useState<ExerciseItem>();
  const [userExercise, setUserExercise] = useState<UserExerciseItem>();
  const { createApiInstance, refreshToken } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const api = await createApiInstance();
        if (!api) return;

        try {
          const [userExercisesResponse, exercisesResponse] = await Promise.all([
            api.get(`/user-exercises/${userExerciseId}/`),
            api.get(`/exercises/${exerciseId}/`),
          ]);

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
