import { useState } from "react";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "./useAuth";

// Custom hook to manage exercise completion data and related operations.
export function useExerciseUpdates(userExerciseId: number | null) {
  const [showCompletionForm, setShowCompletionForm] = useState(false);
  const [showRemovalConfirmation, setShowRemovalConfirmation] = useState(false);
  const [reps, setReps] = useState(0);
  const [sets, setSets] = useState(0);
  const [painLevel, setPainLevel] = useState(0);
  const navigation = useNavigation();
  const { createApiInstance } = useAuth();

  // Function to handle saving exercise completion data
  // This function is called when the user submits the completion form.
  const handleSave = async () => {
    // Validate input fields
    if (!reps || !sets || painLevel === undefined) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }

    // Api instance creation
    const api = await createApiInstance();
    if (!api) return;

    try {
      // Update user exercise data
      const response = await api.put(`/user-exercises/${userExerciseId}/`, {
        reps: reps,
        sets: sets,
        pain_level: painLevel,
        completed: true,
      });

      // Close the modal
      setShowCompletionForm(false);

      // Get flags from response
      const { should_decrease, should_increase, should_remove } = response.data;

      // Handle different scenarios based on flags from backend
      if (should_remove) {
        // Show removal confirmation dialog if the exercise should be removed
        setShowRemovalConfirmation(true);
      } else if (should_decrease) {
        // If pain level is high, ask if they want to decrease difficulty
        Alert.alert(
          "Exercise Difficulty",
          "Your pain level is high. Would you like to decrease the difficulty for next time?",
          [
            {
              text: "No",
              onPress: () => navigation.goBack(),
              style: "cancel",
            },
            {
              text: "Yes",
              onPress: async () => {
                try {
                  await api.post(
                    `/user-exercises/${userExerciseId}/confirm_decrease/`,
                    { confirm: "yes" }
                  );
                  Alert.alert(
                    "Success",
                    "Exercise difficulty decreased for next time!"
                  );
                  navigation.goBack();
                } catch (error) {
                  console.error("Error decreasing difficulty:", error);
                  Alert.alert(
                    "Error",
                    "Failed to decrease difficulty. Please try again."
                  );
                  navigation.goBack();
                }
              },
            },
          ]
        );
      } else if (should_increase) {
        // If pain level is consistently low, ask if they want to increase difficulty
        Alert.alert(
          "Exercise Progress",
          "Your pain level is low and you've had consistent low pain for 3 days. Would you like to increase the difficulty for next time?",
          [
            {
              text: "No",
              onPress: () => navigation.goBack(),
              style: "cancel",
            },
            {
              text: "Yes",
              onPress: async () => {
                try {
                  await api.post(
                    `/user-exercises/${userExerciseId}/confirm_increase/`,
                    { confirm: "yes" }
                  );
                  Alert.alert(
                    "Success",
                    "Exercise difficulty increased for next time!"
                  );
                  navigation.goBack();
                } catch (error) {
                  console.error("Error increasing difficulty:", error);
                  Alert.alert(
                    "Error",
                    "Failed to increase difficulty. Please try again."
                  );
                  navigation.goBack();
                }
              },
            },
          ]
        );
      } else if (painLevel <= 3) {
        // If pain level is low but not consistently low enough to increase difficulty
        Alert.alert(
          "Exercise Progress",
          "Your pain level is low. Keep it up for 3 days to unlock higher difficulty!",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      } else {
        // Default success message if no special conditions
        Alert.alert("Success", "Exercise completed successfully", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      // Handle error when saving exercise completion
      console.error("Error saving exercise:", error);
      Alert.alert(
        "Error",
        "Failed to save exercise completion. Please try again."
      );
    }
  };

  const handleRemovalConfirmation = async (confirm: boolean) => {
    try {
      // Validate user exercise ID
      if (!userExerciseId) {
        Alert.alert("Error", "Invalid exercise ID");
        return;
      }
      // Create API instance
      const api = await createApiInstance();
      if (!api) return;

      // Confirm removal of exercise
      await api.post(`/user-exercises/${userExerciseId}/confirm_removal/`, {
        confirm: confirm ? "yes" : "no",
      });

      setShowRemovalConfirmation(false);

      // Show appropriate alert based on user's choice
      // If user confirms removal, show success message
      if (confirm) {
        Alert.alert(
          "Exercise Removed",
          "This exercise has been removed from your routine due to high pain level. Please consult your healthcare provider.",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert(
          "Exercise Kept",
          "Exercise kept in your routine. Consider modifying how you perform it or consulting your healthcare provider.",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error("Error handling removal confirmation:", error);
      Alert.alert("Error", "Failed to process your request");
    }
  };

  const handleRemoval = async () => {
    try {
      console.log("Removing exercise with ID:", userExerciseId);
      // Validate user exercise ID
      if (!userExerciseId) {
        Alert.alert("Error", "Invalid exercise ID");
        return;
      }
      // Create API instance
      const api = await createApiInstance();
      if (!api) return;

      // Remove exercise
      await api.put(`/user-exercises/${userExerciseId}/remove_exercise/`);

      setShowRemovalConfirmation(false);
      Alert.alert(
        "Exercise Removed",
        "This exercise has been removed from your routine. You can add it back on the dashboard.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error("Error removing exercise:", error);
      Alert.alert("Error", "Failed to remove exercise. Please try again.");
    }
  };

  // Generate dropdown data
  const getDropdownData = (maxValue: number) => {
    return Array.from({ length: maxValue }, (_, i) => ({
      label: `${i + 1}`,
      value: i + 1,
    }));
  };

  // Generate pain level dropdown data
  const getPainLevelData = () => {
    return Array.from({ length: 11 }, (_, i) => ({
      label: `${i}`,
      value: i,
    }));
  };

  return {
    showCompletionForm,
    setShowCompletionForm,
    showRemovalConfirmation,
    setShowRemovalConfirmation,
    reps,
    setReps,
    sets,
    setSets,
    painLevel,
    setPainLevel,
    handleSave,
    handleRemoval,
    handleRemovalConfirmation,
    getDropdownData,
    getPainLevelData,
  };
}
