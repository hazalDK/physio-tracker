import { useState } from "react";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "./useAuth";

// Custom hook to manage user profile data and related operations.
export function useExerciseCompletion(userExerciseId: number | null) {
  const [showCompletionForm, setShowCompletionForm] = useState(false);
  const [reps, setReps] = useState(0);
  const [sets, setSets] = useState(0);
  const [painLevel, setPainLevel] = useState(0);
  const navigation = useNavigation();
  const { createApiInstance } = useAuth();

  // Function to handle saving exercise completion data
  // This function is called when the user submits the completion form.
  const handleSave = async () => {
    // Validate input fields
    if (!reps || !sets || !painLevel) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }

    // Api instance creation
    const api = await createApiInstance();
    if (!api) return;

    try {
      // Update user exercise data
      await api.put(`/user-exercises/${userExerciseId}/`, {
        reps: reps,
        sets: sets,
        pain_level: painLevel,
        completed: true,
      });

      // Closes the modal
      setShowCompletionForm(false);

      // Handle pain level logic
      // If pain level is low (1-3), check if they can increase difficulty
      if (painLevel <= 3) {
        try {
          const canIncreaseResponse = await api.get(
            `/user-exercises/${userExerciseId}/can_increase/`
          );

          if (canIncreaseResponse.data.can_increase) {
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
          } else {
            Alert.alert(
              "Exercise Progress",
              "Your pain level is low. Keep it up for 3 days to unlock higher difficulty!",
              [{ text: "OK", onPress: () => navigation.goBack() }]
            );
          }
        } catch (error) {
          // Handle error when checking increase eligibility
          console.error("Error checking increase eligibility:", error);
          Alert.alert("Success", "Exercise completed successfully", [
            { text: "OK", onPress: () => navigation.goBack() },
          ]);
        }
      } else if (painLevel > 3) {
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
      } else {
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
    reps,
    setReps,
    sets,
    setSets,
    painLevel,
    setPainLevel,
    handleSave,
    getDropdownData,
    getPainLevelData,
  };
}
