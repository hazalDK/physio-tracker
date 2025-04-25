import { useState } from "react";
import { useAuth } from "./useAuth";
import { Alert } from "react-native";
import axios from "axios";

export function useReactivateExercise() {
  const [loading, setLoading] = useState(false);
  const { createApiInstance, refreshToken } = useAuth();

  // Function to reactivate an exercise
  const reactivateExercise = async (exerciseId: number) => {
    setLoading(true);
    try {
      // Create API instance
      const api = await createApiInstance();
      if (!api) return;

      try {
        // Reactivate the exercise
        const response = await api.put(
          `/user-exercises/${exerciseId}/reactivate_exercise/`,
          { exercise_id: exerciseId }
        );

        if (response.status === 200 || response.status === 201) {
          Alert.alert("Success", "Exercise added successfully");
        } else {
          Alert.alert("Error", "Failed to add the exercise");
        }
      } catch (error) {
        // Handle 401 error by refreshing the token and retrying the request
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          // Attempt token refresh
          const newToken = await refreshToken();
          if (!newToken) throw new Error("No refresh token available");

          // Create a new API instance with the refreshed token
          const api = await createApiInstance();
          if (!api) return;

          try {
            const response = await api.put(
              `/user-exercises/${exerciseId}/reactivate_exercise/`,
              { exercise_id: exerciseId }
            );

            if (response.status === 200 || response.status === 201) {
              Alert.alert("Success", "Exercise reactivated successfully");
            } else {
              Alert.alert("Error", "Failed to reactivate the exercise");
            }
          } catch (secondError) {
            handleApiError(secondError);
          }
        } else {
          handleApiError(error);
        }
      }
    } catch (error) {
      console.error("API request failed:", error);
      Alert.alert(
        "Error",
        "Failed to reactivate the exercise. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Helper function to handle API errors
  const handleApiError = (error: any) => {
    if (axios.isAxiosError(error) && error.response) {
      // Handle 400 error from our category/difficulty validation
      if (error.response.status === 400) {
        const errorMessage =
          error.response.data?.message ||
          "You already have an active exercise in this category with the same difficulty level.";
        Alert.alert("Cannot Add Exercise", errorMessage);
      } else {
        console.error("API request failed:", error);
        Alert.alert(
          "Error",
          "Failed to reactivate the exercise. Please try again."
        );
      }
    } else {
      console.error("API request failed:", error);
      Alert.alert(
        "Error",
        "Failed to reactivate the exercise. Please check your connection and try again."
      );
    }
  };

  return { loading, reactivateExercise };
}
