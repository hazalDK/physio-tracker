import React, { useEffect, useState, useCallback } from "react";
import * as Progress from "react-native-progress";
import {
  Text,
  View,
  Image,
  FlatList,
  Pressable,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import tw from "tailwind-react-native-classnames";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamsList } from "@/types/navigation";
import { ExerciseItem } from "@/types/exercise";
import { useFetchDashboardExercises } from "@/hooks/useFetchDashBoardExercises";
import { useReactivateExercise } from "@/hooks/useReactivateExercise";

// Main screen component
export default function Index() {
  const {
    loading,
    userExercises,
    exercises,
    inActiveExercises,
    fetchData,
    refreshData,
  } = useFetchDashboardExercises();

  const { reactivateExercise } = useReactivateExercise();

  const [progress, setProgress] = useState(0);
  const [showModal, setShowModal] = useState(false);

  const exerciseNavigation =
    useNavigation<StackNavigationProp<RootStackParamsList, "exercise">>();
  const chatbotNavigation =
    useNavigation<StackNavigationProp<RootStackParamsList, "login">>();

  useEffect(() => {
    fetchData();
  }, []);

  const setProgressValue = () => {
    const completedExercises = userExercises.filter(
      (exercise) => exercise.completed
    );
    const totalExercises = userExercises.length;
    if (totalExercises > 0) {
      setProgress(Math.round(completedExercises.length / totalExercises));
    }
  };

  useEffect(() => {
    setProgressValue();
  }, [userExercises]);

  useFocusEffect(
    useCallback(() => {
      refreshData();
      setProgressValue();
    }, [refreshData])
  );

  const redirectToExercise = (exercise: ExerciseItem) => {
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
  };

  const handlePress = () => {
    chatbotNavigation.navigate("chatbot");
  };

  if (loading) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-white`}>
        <ActivityIndicator size="large" color="#14b8a6" />
      </View>
    );
  }

  const handleReactiveExercise = (exerciseId: number) => {
    const userExercise = userExercises.find(
      (userExercise) => userExercise.exercise === exerciseId
    );
    if (!userExercise) {
      console.warn(`No user exercise found for exercise ID ${exerciseId}`);
      return;
    }
    reactivateExercise(userExercise?.id)
      .then(() => {
        setShowModal(false);
        refreshData();
      })
      .catch((error) => {
        console.error("Error reactivating exercise:", error);
        setShowModal(false);
      });
  };

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
        renderItem={({ item }) => (
          <View>
            <Pressable
              onPress={() => redirectToExercise(item)}
              style={({ pressed, hovered }) => [
                tw`border rounded-lg h-52 w-40 m-2 p-2 shadow-md`,
                {
                  borderColor: "#14b8a6",
                  borderWidth: 1,
                  backgroundColor: hovered ? "#8f8e8e" : "#ffffff",
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
        )}
      />

      {/* Chatbot Button */}
      <Pressable
        style={({ pressed, hovered }) => [
          tw`absolute bottom-4 right-4 p-4 rounded-full`,
          {
            backgroundColor: hovered ? "#0d9488" : "#14b8a6",
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

      {/* Add Inactive Exercise Button */}
      <Pressable
        style={({ pressed, hovered }) => [
          tw`absolute bottom-4 left-4 p-4 rounded-full`,
          {
            backgroundColor: hovered ? "#0d9488" : "#14b8a6",
            opacity: pressed ? 0.8 : 1,
          },
        ]}
        onPress={() => setShowModal(true)}
      >
        <MaterialCommunityIcons
          name="plus"
          size={24}
          color="white"
          style={tw`mx-auto`}
        />
      </Pressable>

      {/* Modal for adding inactive exercises */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View
          style={tw`flex-1 justify-center items-center bg-black bg-opacity-50`}
        >
          <View style={tw`bg-white p-4 rounded-lg w-3/4 max-h-96`}>
            <Text style={tw`text-lg font-bold mb-2`}>Add an Exercise</Text>
            <FlatList
              data={inActiveExercises}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={tw`p-4 border-b border-gray-200`}
                  onPress={() => {
                    handleReactiveExercise(item.id);
                  }}
                >
                  <Text>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <Pressable
              style={tw`mt-4 bg-red-500 py-4 rounded`}
              onPress={() => setShowModal(false)}
            >
              <Text style={tw`text-white text-center`}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
