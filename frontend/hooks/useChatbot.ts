import { useState, useEffect, useCallback } from "react";
import { Alert } from "react-native";
import Toast from "react-native-root-toast";
import { messageType } from "@/types/chatbot";
import { createChatApi, apiRequestWithRefresh } from "../api";
import { useAuth } from "./useAuth";

export default function useChatbot() {
  const auth = useAuth();
  const [messages, setMessages] = useState<messageType[]>([]);
  const [userExercises, setUserExercises] = useState([]);
  const [recentPain, setRecentPain] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [api, setApi] = useState<any>(null);

  // Initialize API and chat
  useEffect(() => {
    const initializeApi = async () => {
      const apiInstance = await auth.createApiInstance();
      setApi(apiInstance);
    };

    initializeApi();

    // Set initial messages
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
  }, []);

  // Fetch user data when API is available
  useEffect(() => {
    if (api) {
      fetchUserData();
    }
  }, [api]);

  const fetchUserData = async () => {
    if (!api) return;

    setIsInitialLoading(true);
    const chatApi = createChatApi(api);

    try {
      // Use the wrapper function for API calls with refresh
      const fetchData = async () => {
        const [reportsData, exercisesData] = await Promise.all([
          chatApi.fetchReports(),
          chatApi.fetchUserExercises(),
        ]);

        return { reportsData, exercisesData };
      };

      const { reportsData, exercisesData } = await apiRequestWithRefresh(
        fetchData,
        auth
      );

      setUserExercises(exercisesData);

      if (reportsData.length > 0) {
        setRecentPain(reportsData[0].pain_level);
      }
    } catch (error) {
      console.error("Failed to fetch user data:", error);

      Alert.alert(
        "Error",
        "Failed to load your exercises. Please check your connection and try again."
      );
    } finally {
      setIsInitialLoading(false);
    }
  };

  const sendMessage = async (inputText: string) => {
    if (!inputText.trim() || !api) return;

    // Add user message to chat
    const userMessageId = Date.now().toString();
    setMessages((prev) => [
      ...prev,
      { id: userMessageId, text: inputText, sender: "user" },
    ]);

    setIsLoading(true);
    const chatApi = createChatApi(api);

    try {
      // Create context object with user's exercise data
      const exerciseContext = {
        exercises: userExercises,
        recentPain: recentPain,
      };

      // Use the wrapper function for API calls with refresh
      const sendMessageCall = async () => {
        return await chatApi.sendChatMessage(inputText, exerciseContext);
      };

      // Send message to API with refresh handling
      const response = await apiRequestWithRefresh(sendMessageCall, auth);

      // Add bot response to chat
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          text: response.message,
          sender: "bot",
        },
      ]);
    } catch (error) {
      console.error("Error sending message:", error);

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          text: "Sorry, I encountered an error. Please try again.",
          sender: "bot",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const resetChat = async () => {
    if (!api) return;

    const chatApi = createChatApi(api);

    try {
      // Use the wrapper function for API calls with refresh
      const resetCall = async () => {
        await chatApi.resetChat();
      };

      await apiRequestWithRefresh(resetCall, auth);

      // Reset messages
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

      // Refresh user data
      fetchUserData();

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
  };

  return {
    messages,
    isLoading,
    isInitialLoading,
    sendMessage,
    resetChat,
  };
}
