import {
  View,
  Text,
  Pressable,
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from "react-native";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import tw from "tailwind-react-native-classnames";
import YoutubePlayer from "react-native-youtube-iframe";
import { Ionicons } from "@expo/vector-icons";
import { Dropdown } from "react-native-element-dropdown";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamsList } from "@/types/navigation";
import { useExerciseData } from "@/hooks/useExerciseData";
import { useVideoPlayer } from "../hooks/useVideoPlayer";
import { useExerciseCompletion } from "@/hooks/useExerciseCompletion";

// Define the interface for the route params
type ExerciseRouteParams = {
  exerciseId: number;
  userExerciseId: number | null;
};

// Exercise screen component
// This component displays the details of an exercise and allows the user to complete it.
export default function Exercise() {
  const route =
    useRoute<RouteProp<Record<string, ExerciseRouteParams>, string>>();
  const navigation =
    useNavigation<StackNavigationProp<RootStackParamsList, "login">>();

  // Optionally extract exerciseId and userExerciseId from the route params when they are not undefined
  const exerciseId = route?.params?.exerciseId;
  const userExerciseId = route?.params?.userExerciseId;

  // Check if exerciseId and userExerciseId are defined
  const { loading, exercise, userExercise } = useExerciseData(
    exerciseId,
    userExerciseId
  );
  const { playing, onStateChange } = useVideoPlayer();
  const {
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
    handleRemovalConfirmation,
    getDropdownData,
    getPainLevelData,
  } = useExerciseCompletion(userExerciseId);

  // Generate dropdown data
  const repsVals = getDropdownData(userExercise?.reps ?? 20);
  const setsVals = getDropdownData(userExercise?.sets ?? 10);
  const painLevels = getPainLevelData();

  // Exercise not found error handling
  if (!exercise) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Exercise not found</Text>
      </View>
    );
  }

  // Loading state
  // If loading is true, show a loading indicator
  if (loading) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-white`}>
        <ActivityIndicator size="large" color="#14b8a6" />
      </View>
    );
  }

  // if setShowRemovalConfirmation is true, show a confirmation modal
  if (showRemovalConfirmation) {
    return (
      <Modal
        visible={showRemovalConfirmation}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRemovalConfirmation(false)}
      >
        <TouchableWithoutFeedback
          onPress={() => setShowRemovalConfirmation(false)}
        >
          <View
            style={tw`flex-1 bg-black bg-opacity-50 justify-center items-center`}
          >
            <TouchableWithoutFeedback>
              <View style={tw`bg-white rounded-lg p-6 w-11/12 max-w-md`}>
                <Text style={tw`text-xl font-bold text-center mb-4`}>
                  Confirm Removal
                </Text>
                <Text style={tw`text-gray-700 mb-4`}>
                  You've reported a pain level of {painLevel} for this exercise.
                  {"\n"}Do you want to remove it from your routine?
                </Text>
                <Pressable
                  onPress={() => handleRemovalConfirmation(true)}
                  style={({ pressed }) => [
                    tw`p-4 rounded-lg items-center mb-2`,
                    {
                      opacity: pressed ? 0.8 : 1,
                      backgroundColor: "#14b8a6",
                    },
                  ]}
                >
                  <Text style={tw`text-white font-bold text-lg`}>Yes</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleRemovalConfirmation(false)}
                  style={({ pressed }) => [
                    tw`p-4 rounded-lg items-center`,
                    {
                      opacity: pressed ? 0.8 : 1,
                      backgroundColor: "#f87171",
                    },
                  ]}
                >
                  <Text style={tw`text-white font-bold text-lg`}>No</Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  }

  return (
    <View style={tw`flex-1 bg-white px-4`}>
      <View style={tw`flex-row items-center pt-10 pb-4`}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed, hovered }) => [
            tw`p-2 rounded-full`,
            {
              backgroundColor: hovered ? "#0d9488" : "#14b8a6",
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </Pressable>
        <Text
          style={[
            tw`text-2xl font-semibold flex-1 text-center`,
            { color: "#14b8a6" },
          ]}
        >
          {exercise.name}
        </Text>
        <View style={tw`w-8`} />
      </View>

      <View
        style={[
          tw`w-full relative rounded-xl overflow-hidden`,
          { aspectRatio: 16 / 9 },
        ]}
      >
        <YoutubePlayer
          height={240}
          play={playing}
          videoId={"2pbHPfsC3-U"}
          onChangeState={onStateChange}
        />
      </View>

      <View style={tw`mt-4 px-4`}>
        <Text style={tw`text-lg text-center font-semibold`}>
          Reps: {userExercise?.reps}
          <Text style={[tw`text-4xl`, { color: "#14b8a6" }]}> • </Text>
          Sets: {userExercise?.sets}
          {(userExercise?.hold ?? 0) > 0 && (
            <>
              {"  "}
              <Text style={[tw`text-4xl`, { color: "#14b8a6" }]}>• </Text>
              <Text>Hold: {userExercise?.hold}s</Text>
            </>
          )}
        </Text>

        <Text style={tw`text-lg text-center font-semibold mt-2`}>
          Difficulty: {exercise.difficulty_level}
        </Text>

        {exercise.additional_notes && (
          <Text style={tw`text-center text-left mt-2`}>
            {exercise.additional_notes}
          </Text>
        )}
      </View>

      <View style={tw`absolute bottom-10 w-full items-center`}>
        <Pressable
          style={({ pressed, hovered }) => [
            tw`items-center p-4 rounded-2xl w-28`,
            {
              backgroundColor: hovered ? "#0d9488" : "#14b8a6",
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          onPress={() => setShowCompletionForm(true)}
        >
          <Text style={tw`text-white font-semibold`}>Complete</Text>
        </Pressable>

        <Modal
          visible={showCompletionForm}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowCompletionForm(false)}
        >
          <TouchableWithoutFeedback
            onPress={() => setShowCompletionForm(false)}
          >
            <View
              style={tw`flex-1 bg-black bg-opacity-50 justify-center items-center`}
            >
              <TouchableWithoutFeedback>
                <View style={tw`bg-white rounded-lg p-6 w-11/12 max-w-md`}>
                  <Text style={tw`text-xl font-bold text-center mb-4`}>
                    Complete Exercise
                  </Text>

                  <View style={tw`mb-4`}>
                    <Text style={tw`text-gray-700 mb-1`}>Reps Completed</Text>
                    <Dropdown
                      style={tw`border border-gray-300 rounded-lg p-3 mt-1`}
                      placeholderStyle={tw`text-gray-500`}
                      selectedTextStyle={tw`text-black`}
                      data={repsVals}
                      labelField="label"
                      valueField="value"
                      placeholder="Select number"
                      value={reps}
                      onChange={(item) => setReps(item.value)}
                    />
                  </View>

                  <View style={tw`mb-4`}>
                    <Text style={tw`text-gray-700 mb-1`}>Sets Completed</Text>
                    <Dropdown
                      style={tw`border border-gray-300 rounded-lg p-3 mt-1`}
                      placeholderStyle={tw`text-gray-500`}
                      selectedTextStyle={tw`text-black`}
                      data={setsVals}
                      labelField="label"
                      valueField="value"
                      placeholder="Select number"
                      value={sets}
                      onChange={(item) => setSets(item.value)}
                    />
                  </View>

                  <View style={tw`mb-6`}>
                    <Text style={tw`text-gray-700 mb-1`}>
                      Pain Level (0-10)
                    </Text>
                    <Dropdown
                      style={tw`border border-gray-300 rounded-lg p-3 mt-1`}
                      placeholderStyle={tw`text-gray-500`}
                      selectedTextStyle={tw`text-black`}
                      data={painLevels}
                      labelField="label"
                      valueField="value"
                      placeholder="Select number"
                      value={painLevel}
                      onChange={(item) => setPainLevel(item.value)}
                    />
                  </View>

                  <Pressable
                    onPress={handleSave}
                    style={({ pressed }) => [
                      tw`p-4 rounded-lg items-center`,
                      {
                        opacity: pressed ? 0.8 : 1,
                        backgroundColor: "#14b8a6",
                      },
                    ]}
                  >
                    <Text style={tw`text-white font-bold text-lg`}>Save</Text>
                  </Pressable>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    </View>
  );
}
