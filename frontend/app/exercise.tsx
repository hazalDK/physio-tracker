import {
  View,
  Text,
  Pressable,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  TextInput,
} from "react-native";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import tw from "tailwind-react-native-classnames";
import YoutubePlayer from "react-native-youtube-iframe";
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { Dropdown } from "react-native-element-dropdown";

// Define the interface for the exercise item
interface ExerciseItem {
  id: number;
  name: string;
  slug: string;
  image: string;
  video_link: string;
  difficulty_level: string;
  additional_notes: string;
  category: number;
}

// Define the interface for the userExercise item
interface UserExerciseItem {
  id: number;
  user: number;
  exercise: number;
  sets: number;
  reps: number;
  hold: number;
  pain_level: number;
  completed: boolean;
}

// Define the interface for the route params
type ExerciseRouteParams = {
  exerciseId: number;
  userExerciseId: number | null;
};

export default function Exercise() {
  const [loading, setLoading] = useState(true);
  const [userExercise, setUserExercise] = useState<UserExerciseItem>();
  const [exercise, setExercise] = useState<ExerciseItem>();
  const route =
    useRoute<RouteProp<Record<string, ExerciseRouteParams>, string>>();
  const [showCompletionForm, setShowCompletionForm] = useState(false);
  const [reps, setReps] = useState(0);
  const [sets, setSets] = useState(0);
  const [painLevel, setPainLevel] = useState(0);
  const [playing, setPlaying] = useState(false);
  const navigation = useNavigation();

  // Use optional chaining to safely access route params
  const exerciseId = route?.params?.exerciseId;
  const userExerciseId = route?.params?.userExerciseId;

  console.log("Exercise data:", exerciseId);
  console.log("User exercise data:", userExerciseId);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      try {
        // 1. Get token or redirect to login
        let token = await SecureStore.getItemAsync("access_token");
        console.log("Token:", token);
        if (!token) {
          Alert.alert("Login Required", "Please sign in to continue", [
            { text: "OK", onPress: () => navigation.navigate("login") },
          ]);
          return;
        }

        // 2. Create an axios instance with proper defaults
        const api = axios.create({
          baseURL: process.env.API_URL || "http://192.168.68.111:8000",
          timeout: 10000,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        // 3. Use Promise.all for parallel requests
        const [userExercisesResponse, exercisesResponse] = await Promise.all([
          api.get(`/user-exercises/${userExerciseId}/`),
          api.get(`/exercises/${exerciseId}/`),
        ]);

        // 4. Process successful responses
        if (!Array.isArray(userExercisesResponse.data)) {
          setUserExercise(userExercisesResponse.data);
        } else {
          console.warn("Invalid user exercises data format");
          setUserExercise({} as UserExerciseItem);
        }

        if (!Array.isArray(exercisesResponse.data)) {
          setExercise(exercisesResponse.data);
        } else {
          console.warn("Invalid exercises data format");
          setExercise({} as ExerciseItem);
        }
      } catch (error) {
        // 5. Handle token refresh
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          try {
            // Attempt token refresh
            const refreshToken = await SecureStore.getItemAsync(
              "refresh_token"
            );
            if (!refreshToken) {
              throw new Error("No refresh token available");
            }

            const refreshUrl =
              process.env.API_URL || "http://192.168.68.111:8000";

            const refreshResponse = await axios.post(
              `${refreshUrl}/api/token/refresh/`,
              { refresh: refreshToken }
            );

            // Store new tokens
            const newToken = refreshResponse.data.access;
            const newRefreshToken = refreshResponse.data.refresh;

            await Promise.all([
              SecureStore.setItemAsync("access_token", newToken),
              SecureStore.setItemAsync("refresh_token", newRefreshToken),
            ]);

            // Retry both requests with new token
            const api = axios.create({
              baseURL: refreshUrl,
              timeout: 10000,
              headers: {
                Authorization: `Bearer ${newToken}`,
                "Content-Type": "application/json",
              },
            });

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
          } catch (refreshError: any) {
            console.error("Token refresh failed:", {
              error: refreshError,
              message: refreshError.message,
              response: refreshError.response?.data,
              status: refreshError.response?.status,
            });

            await Promise.all([
              SecureStore.deleteItemAsync("access_token"),
              SecureStore.deleteItemAsync("refresh_token"),
            ]);

            Alert.alert("Session Expired", "Please login again", [
              { text: "OK", onPress: () => navigation.navigate("login") },
            ]);
          }
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
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigation]);

  const onStateChange = useCallback((state: string) => {
    if (state === "ended") {
      setPlaying(false);
    }
  }, []);

  const numbers = Array.from({ length: 20 }, (_, i) => ({
    label: `${i + 1}`,
    value: i + 1,
  }));

  const painLevels = Array.from({ length: 11 }, (_, i) => ({
    label: `${i}`,
    value: i,
  }));

  const handleSave = async () => {
    // Save logic here
    let token = await SecureStore.getItemAsync("access_token");
    const api = axios.create({
      baseURL: process.env.API_URL || "http://192.168.68.111:8000",
      timeout: 10000,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    // 3. Use Promise.all for parallel requests
    try {
      await api.put(`/user-exercises/${userExerciseId}/`, {
        reps: reps,
        sets: sets,
        pain_level: painLevel,
        completed: true,
      });
      Alert.alert("Success", "Exercise completed successfully", [
        {
          text: "OK",
          onPress: () => {
            setShowCompletionForm(false);
            navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      console.error("Error saving exercise:", error);
      Alert.alert(
        "Error",
        "Failed to save exercise completion. Please try again."
      );
    }
  };

  if (!exercise) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Exercise not found</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-white px-4`}>
      {/* Header with back button and title */}
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

      <View style={[tw`w-full relative`, { aspectRatio: 16 / 9 }]}>
        <YoutubePlayer
          height={240}
          play={playing}
          videoId={"2pbHPfsC3-U"}
          onChangeState={onStateChange}
        />
      </View>

      {/* Exercise details - now closer to video */}
      <View style={tw`mt-4 px-4`}>
        <Text style={tw`text-lg text-center font-semibold`}>
          Reps: {userExercise?.reps}
          <Text style={[tw`text-4xl`, { color: "#14b8a6" }]}> • </Text>
          Sets: {userExercise?.sets}
          {userExercise?.hold ??
            (0 > 0 && (
              <>
                <Text style={[tw`text-4xl`, { color: "#14b8a6" }]}> • </Text>
                Hold: {userExercise?.hold}
              </>
            ))}
        </Text>

        <Text style={tw`text-lg text-center font-semibold mt-2`}>
          Difficulty: {exercise.difficulty_level}
        </Text>

        {exercise.additional_notes && (
          <Text style={tw`text-lg text-center mt-2`}>
            {exercise.additional_notes}
          </Text>
        )}
      </View>

      {/* Complete button */}
      <View style={tw`absolute bottom-10 w-full items-center`}>
        <Pressable
          style={({ pressed, hovered }) => [
            tw`items-center p-4 rounded-2xl w-28`,
            {
              backgroundColor: hovered ? "#0d9488" : "#14b8a6",
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          onPress={() => {
            setShowCompletionForm(true);
          }}
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

                  {/* Reps Input */}
                  <View style={tw`mb-4`}>
                    <Text style={tw`text-gray-700 mb-1`}>Reps Completed</Text>
                    <Dropdown
                      style={tw`border border-gray-300 rounded-lg p-3 mt-1`}
                      placeholderStyle={tw`text-gray-500`}
                      selectedTextStyle={tw`text-black`}
                      data={numbers}
                      labelField="label"
                      valueField="value"
                      placeholder="Select number"
                      value={reps}
                      onChange={(item) => setReps(item.value)}
                    />
                  </View>

                  {/* Sets Input */}
                  <View style={tw`mb-4`}>
                    <Text style={tw`text-gray-700 mb-1`}>Sets Completed</Text>
                    <Dropdown
                      style={tw`border border-gray-300 rounded-lg p-3 mt-1`}
                      placeholderStyle={tw`text-gray-500`}
                      selectedTextStyle={tw`text-black`}
                      data={numbers}
                      labelField="label"
                      valueField="value"
                      placeholder="Select number"
                      value={sets}
                      onChange={(item) => setSets(item.value)}
                    />
                  </View>

                  {/* Pain Level */}
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

                  {/* Save Button */}
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
