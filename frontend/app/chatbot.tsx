import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import Toast from "react-native-root-toast";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import tw from "tailwind-react-native-classnames";
import axios from "axios";
import { useAuth } from "@/hooks/useAuth";
import { RootStackParamsList } from "@/types/navigation";
import { messageType } from "@/types/chatbot";
import {
  UserMessage,
  BotMessage,
  DisclaimerMessage,
  LoadingMessage,
} from "../components/ChatMessages";

export default function Chatbot() {
  const navigation =
    useNavigation<StackNavigationProp<RootStackParamsList, "login">>();
  const [messages, setMessages] = useState([] as messageType[]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [userExercises, setUserExercises] = useState([]);
  const [recentPain, setRecentPain] = useState(0);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const { createApiInstance, refreshToken } = useAuth();

  // Fetch user exercise data when component mounts
  useEffect(() => {
    // Add initial bot message
    setMessages([
      {
        id: "disclaimer",
        text: "DISCLAIMER",
        sender: "disclaimer",
      },
      {
        id: "welcome",
        text: "Welcome to your physiotherapy assistant! How can I help you today?",
        sender: "bot",
      },
    ]);

    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const api = await createApiInstance();
      if (!api) return;
      try {
        // 3. Use Promise.all for parallel requests
        const [reportsResponse, exercisesResponse] = await Promise.all([
          api.get("/user-exercises/"),
          api.get("/reports/"),
        ]);

        setUserExercises(exercisesResponse.data);

        if (reportsResponse.data.length > 0) {
          setRecentPain(reportsResponse.data[0].pain_level);
        }
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          // Attempt token refresh
          const newToken = await refreshToken();
          if (!newToken) throw new Error("No refresh token available");

          const api = await createApiInstance();
          if (!api) return;

          const [retryUserExercises, retryReports] = await Promise.all([
            api.get("/user-exercises/"),
            api.get("/users/active_exercises/"),
          ]);

          setRecentPain(retryReports.data[0]?.pain_level || 0);
          setUserExercises(retryUserExercises.data);
        } else {
          // Handle other errors
          console.error("API request failed:", error);
          Alert.alert(
            "Error",
            "Failed to load your report and exercises. Please check your connection and try again."
          );
          setRecentPain(0);
          setUserExercises([]);
        }
      }
    } catch (error) {
      console.error("Failed to load your report and exercises data:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    // Add user message to the chat
    const userMessageId = Date.now().toString();
    setMessages((prevMessages) => [
      ...prevMessages,
      { id: userMessageId, text: inputText, sender: "user" },
    ]);

    // Clear input and show loading
    setInputText("");
    setIsLoading(true);

    try {
      const api = await createApiInstance();
      if (!api) return;
      try {
        // Create context object with user's exercise data
        const exerciseContext = {
          exercises: userExercises,
          recentPain: recentPain,
          // Add any other relevant context from your models
        };

        // Call your API endpoint that will communicate with OpenAI
        const response = await api.post("/api/chatbot/", {
          message: inputText,
          exerciseContext: JSON.stringify(exerciseContext),
        });

        // Add bot response to chat
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            id: Date.now().toString(),
            text: response.data.message,
            sender: "bot",
          },
        ]);
      } catch (error) {
        console.error("Error sending message:", error);
        // Add error message
        // 5. Handle token refresh
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          // Attempt token refresh
          const newToken = await refreshToken();
          if (!newToken) throw new Error("No refresh token available");

          // Create context object with user's exercise data
          const exerciseContext = {
            exercises: userExercises,
            recentPain: recentPain,
            // Add any other relevant context from your models
          };

          // Retry both requests with new token
          const api = await createApiInstance();
          if (!api) return;

          // Call your API endpoint that will communicate with OpenAI
          const response = await api.post("/api/chatbot/", {
            message: inputText,
            exerciseContext: JSON.stringify(exerciseContext),
          });

          setMessages((prevMessages) => [
            ...prevMessages,
            {
              id: Date.now().toString(),
              text: response.data.message,
              sender: "bot",
            },
          ]);
        } else {
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              id: Date.now().toString(),
              text: "Sorry, I encountered an error. Please try again.",
              sender: "bot",
            },
          ]);
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      const api = await createApiInstance();
      if (!api) return;

      try {
        await api.post("/api/reset-chat/", {});

        // Reset messages
        setMessages([
          {
            id: "welcome",
            text: "Welcome to your physiotherapy assistant! How can I help you today?",
            sender: "bot",
          },
          {
            id: "disclaimer",
            text: "DISCLAIMER",
            sender: "disclaimer",
          },
        ]);

        fetchUserData();

        // 🎉 Show toast
        Toast.show("Chat reset!", {
          duration: Toast.durations.SHORT,
          position: Toast.positions.BOTTOM,
          backgroundColor: "#14b8a6",
          textColor: "white",
          shadow: true,
        });
      } catch (error) {
        console.error("Failed to reset chat:", error);
        Alert.alert("Error", "Could not reset chat.");
      }
    } catch (err) {
      console.error("Failed to reset chat:", err);
    }
  };

  if (loading) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-white`}>
        <ActivityIndicator size="large" color="#14b8a6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <KeyboardAvoidingView
        style={tw`flex-1`}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View
          style={tw`flex-row items-center justify-between px-4 py-3 border-b border-gray-200`}
        >
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [
              tw`p-2 rounded-full`,
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Ionicons name="arrow-back" size={24} color="#14b8a6" />
          </Pressable>

          <Text style={tw`text-lg font-semibold text-gray-800`}>
            Physio Assistant
          </Text>

          <Pressable
            onPress={handleReset}
            style={({ pressed }) => [
              tw`p-2 rounded-full`,
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Ionicons name="refresh" size={24} color="#14b8a6" />
          </Pressable>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={tw`flex-1 px-4 pt-4`}
          contentContainerStyle={tw`pb-4`}
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }
        >
          {messages.map((message) =>
            message.sender === "user" ? (
              <UserMessage key={message.id} message={message.text} />
            ) : message.sender === "disclaimer" ? (
              <DisclaimerMessage key={message.id} />
            ) : (
              <BotMessage key={message.id} message={message.text} />
            )
          )}

          {isLoading && <LoadingMessage />}
        </ScrollView>

        <View
          style={tw`flex-row items-center border-t border-gray-200 px-4 py-2`}
        >
          <TextInput
            style={tw`flex-1 bg-gray-100 text-black rounded-full px-4 py-2 mr-2`}
            placeholder="Type your message..."
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <Pressable
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading}
            style={({ pressed }) => [
              tw`p-2 rounded-full`,
              {
                backgroundColor:
                  !inputText.trim() || isLoading ? "#94a3b8" : "#14b8a6",
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Ionicons name="send" size={22} color="white" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
