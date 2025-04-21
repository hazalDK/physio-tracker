import React, { useEffect, useState, useCallback } from "react";
import * as Progress from "react-native-progress";
import { Text, View, Image, FlatList, Pressable, Alert } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import axios from "axios";
import tw from "tailwind-react-native-classnames";
import * as SecureStore from "expo-secure-store";
import { useNavigation, useFocusEffect } from "@react-navigation/native";

// Define the interface for the exercise item
interface ExerciseItem {
  id: number;
  name: string;
  slug: string;
  image: string;
  video_link: string;
  video_id: string;
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
  pain_level: number;
  completed: boolean;
}

export default function Index() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [userExercises, setUserExercises] = useState<UserExerciseItem[]>([]);
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [progress, setProgress] = useState(0);
  const navigation = useNavigation();
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchData = async () => {
    setLoading(true);

    try {
      // 1. Get token or redirect to login
      let token = await SecureStore.getItemAsync("access_token");
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
        headers: { Authorization: `Bearer ${token}` },
      });

      // 3. Use Promise.all for parallel requests
      const [userExercisesResponse, exercisesResponse] = await Promise.all([
        api.get("/user-exercises/"),
        api.get("/users/active_exercises/"),
      ]);

      // 4. Process successful responses
      if (Array.isArray(userExercisesResponse.data)) {
        setUserExercises(userExercisesResponse.data);
      } else {
        console.warn("Invalid user exercises data format");
        setUserExercises([]);
      }

      if (Array.isArray(exercisesResponse.data)) {
        setExercises(exercisesResponse.data);
      } else {
        console.warn("Invalid exercises data format");
        setExercises([]);
      }
    } catch (error) {
      // 5. Handle token refresh
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        try {
          // Attempt token refresh
          const refreshToken = await SecureStore.getItemAsync("refresh_token");
          if (!refreshToken) throw new Error("No refresh token available");

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
            baseURL: process.env.API_URL || "http://192.168.68.111:8000",
            timeout: 10000,
            headers: { Authorization: `Bearer ${newToken}` },
          });

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
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);

          // Clear tokens and redirect
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
        setExercises([]);
        setUserExercises([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      // This will run every time the screen comes into focus
      fetchData(); // Your data fetching function
      setRefreshKey((prev) => prev + 1); // Force re-render if needed
    }, [])
  );

  // Construct thumbnail URL

  useEffect(() => {
    const completedExercises = userExercises.filter(
      (exercise) => exercise.completed
    );
    const totalExercises = userExercises.length;
    if (totalExercises > 0) {
      setProgress(completedExercises.length / totalExercises);
    }
  }, [userExercises]);

  function redirectToExercise(exercise: ExerciseItem) {
    const userExercise = userExercises.find(
      (userExercise) => userExercise.exercise === exercise.id
    );

    if (!userExercise) {
      console.warn(`No user exercise found for exercise ID ${exercise.id}`);
    }

    navigation.navigate("exercise", {
      exerciseId: exercise.id,
      userExerciseId: userExercise?.id || null,
    });
  }

  function handlePress() {
    navigation.navigate("chatbot" as never);
  }

  if (loading) {
    return (
      <View style={tw`flex-1 bg-white justify-center items-center`}>
        <Text style={tw`text-lg`}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-white justify-center items-center`}>
      <Text style={tw`mt-10 text-lg`}>Completed {progress * 100}%</Text>
      <Progress.Bar
        progress={progress}
        width={200}
        color="#14b8a6"
        style={tw`mb-5`}
      />
      <FlatList
        style={tw`mx-auto`}
        data={exercises}
        numColumns={2}
        renderItem={({ item }) => {
          return (
            <View>
              <Pressable
                onPress={() => redirectToExercise(item)}
                style={({ pressed, hovered }) => [
                  tw`border rounded-lg h-52 w-40 m-2 p-2 shadow-md`,
                  {
                    borderColor: "#14b8a6",
                    borderWidth: 1,
                    // When hovered, change to a darker teal; otherwise use the default teal
                    backgroundColor: hovered ? "#8f8e8e" : "#ffffff",
                    // Slightly reduce the opacity when the button is pressed
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Image
                  source={{
                    uri: `https://img.youtube.com/vi/${item.video_id}/maxresdefault.jpg`,
                  }}
                  style={tw`w-28 h-28 rounded-lg mx-auto mb-2`}
                />
                <Text style={tw`text-center`}>{item.name}</Text>
                <Text style={tw`text-center`}>
                  Difficulty level: {item.difficulty_level}
                </Text>
              </Pressable>
            </View>
          );
        }}
      />
      <Pressable
        style={({ pressed, hovered }) => [
          tw`absolute bottom-4 right-4 p-4 rounded-full`,
          {
            // When hovered, change to a darker teal; otherwise use the default teal
            backgroundColor: hovered ? "#0d9488" : "#14b8a6",
            // Slightly reduce the opacity when the button is pressed
            opacity: pressed ? 0.8 : 1,
          },
        ]}
        onPress={handlePress}
      >
        <MaterialCommunityIcons
          name="robot-happy-outline"
          size={24}
          color="white"
          style={tw`mx-auto`}
        />
      </Pressable>
    </View>
  );
}
