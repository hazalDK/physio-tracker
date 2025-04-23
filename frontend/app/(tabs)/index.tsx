import React, { useEffect, useState, useCallback } from "react";
import * as Progress from "react-native-progress";
import {
  Text,
  View,
  Image,
  FlatList,
  Pressable,
  ActivityIndicator,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import tw from "tailwind-react-native-classnames";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamsList } from "@/types/navigation";
import { ExerciseItem } from "@/types/exercise";
import { useFetchActiveExercises } from "@/hooks/useFetchActiveExercises";

export default function Index() {
  const { loading, userExercises, exercises, fetchData, refreshData } =
    useFetchActiveExercises();
  const [progress, setProgress] = useState(0);
  const exerciseNavigation =
    useNavigation<StackNavigationProp<RootStackParamsList, "exercise">>();
  const loginNavigation =
    useNavigation<StackNavigationProp<RootStackParamsList, "login">>();
  const chatbotNavigation =
    useNavigation<StackNavigationProp<RootStackParamsList, "login">>();

  // Fetch data on initial load
  useEffect(() => {
    fetchData();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshData();
    }, [refreshData])
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

    exerciseNavigation.navigate("exercise", {
      exerciseId: exercise.id,
      userExerciseId: userExercise?.id || null,
    });
  }

  function handlePress() {
    chatbotNavigation.navigate("chatbot");
  }

  if (loading) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-white`}>
        <ActivityIndicator size="large" color="#14b8a6" />
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
                <Text style={tw`text-center font-semibold`}>{item.name}</Text>
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
