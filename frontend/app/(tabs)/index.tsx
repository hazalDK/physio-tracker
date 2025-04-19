import React, { useEffect, useState } from "react";
import * as Progress from "react-native-progress";
import { Text, View, Image, FlatList, Pressable, Alert } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import axios from "axios";
import tw from "tailwind-react-native-classnames";
import * as SecureStore from "expo-secure-store";
import { useNavigation } from "@react-navigation/native";

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        let token = await SecureStore.getItemAsync("access_token");

        if (!token) {
          Alert.alert("Login Required", "Please sign in to continue", [
            {
              text: "OK",
              onPress: () => navigation.navigate("Login" as never),
            },
          ]);
          return;
        }
        const userExercisesResponse = await axios.get(
          "http://192.168.68.111:8000/user-exercises/",
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000,
          }
        );
        if (
          userExercisesResponse.data &&
          Array.isArray(userExercisesResponse.data)
        ) {
          setUserExercises(userExercisesResponse.data);
        } else {
          throw new Error("Invalid response format");
        }

        const response = await axios.get(
          "http://192.168.68.111:8000/users/active_exercises/",
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000,
          }
        );

        if (response.data && Array.isArray(response.data)) {
          setExercises(response.data);
        } else {
          throw new Error("Invalid response format");
        }
      } catch (initialError) {
        if (
          axios.isAxiosError(initialError) &&
          initialError.response?.status === 401
        ) {
          try {
            const refreshToken = await SecureStore.getItemAsync(
              "refresh_token"
            );
            if (!refreshToken) throw new Error("No refresh token available");

            const refreshResponse = await axios.post(
              "http://192.168.68.111:8000/api/token/refresh/",
              { refresh: refreshToken }
            );

            // 5. Store new tokens
            await SecureStore.setItemAsync(
              "access_token",
              refreshResponse.data.access
            );
            await SecureStore.setItemAsync(
              "refresh_token",
              refreshResponse.data.refresh
            );

            const retryResponse = await axios.get(
              "http://192.168.68.111:8000/users/active_exercises/",
              {
                headers: {
                  Authorization: `Bearer ${refreshResponse.data.access}`,
                },
              }
            );

            const userExercisesResponse = await axios.get(
              "http://192.168.68.111:8000/user-exercises/",
              {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 10000,
              }
            );

            setUserExercises(userExercisesResponse.data);
            setExercises(retryResponse.data || []);
            setMessage(retryResponse.data.message || "");
          } catch (refreshError) {
            console.error("Token refresh failed:", refreshError);

            // 7. Complete cleanup and redirect
            await SecureStore.deleteItemAsync("access_token");
            await SecureStore.deleteItemAsync("refresh_token");

            Alert.alert("Session Expired", "Please login again", [
              { text: "OK", onPress: () => navigation.navigate("Login") },
            ]);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigation]);

  useEffect(() => {
    const completedExercises = userExercises.filter(
      (exercise) => exercise.completed
    );
    const totalExercises = userExercises.length;
    if (totalExercises > 0) {
      setProgress(completedExercises.length / totalExercises / 100);
    }
  }, [userExercises]);

  function redirectToExercise(exercise: UserExerciseItem) {
    navigation.navigate("exercise", {
      exerciseId: exercise.exercise,
      userExerciseId: exercise.id,
    } as never);
  }

  function handlePress() {
    navigation.navigate("chatbot" as never);
  }

  return (
    <View style={tw`flex-1 bg-white justify-center items-center`}>
      <Text style={tw`mt-10 text-lg`}>Completed {progress * 100}%</Text>
      <Progress.Bar progress={progress} width={200} color="#14b8a6" />
      <FlatList
        style={tw`mx-auto`}
        data={exercises}
        numColumns={2}
        renderItem={({ item }) => {
          return (
            <View>
              <Pressable
                onPress={() => redirectToExercise(item)}
                style={tw`border-2 border-gray-300 rounded-lg w-32 h-32 m-2`}
              >
                <Image
                  source={{ uri: item.image }}
                  style={tw`w-32 h-32 rounded-full mx-auto`}
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
