import { useState, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Alert } from "react-native";
import * as SecureStore from "expo-secure-store";
import axios from "axios";
import { RootStackParamsList } from "@/types/navigation";
import { useAuth } from "./useAuth";

// API URL from config
const API_URL = "http://192.168.68.111:8000";

// Helper function to format date
const formatDate = (date: Date) => {
  return date.toISOString().split("T")[0];
};

// Type for analytics data (can be either adherence or pain data)
interface ChartData {
  labels: string[];
  datasets: {
    data: number[];
  }[];
}

// Generic hook for fetching and managing analytics data
export function useAnalyticsData<T>(
  endpoint: string,
  dataType: "adherence" | "pain"
) {
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<ChartData>({
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [{ data: [0, 0, 0, 0, 0, 0, 0] }],
  });
  const [average, setAverage] = useState(0);
  const [history, setHistory] = useState<T[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Add week navigation state
  const [currentEndDate, setCurrentEndDate] = useState(new Date());
  const [weekTitle, setWeekTitle] = useState("Current Week");

  const navigation =
    useNavigation<StackNavigationProp<RootStackParamsList, "login">>();
  const { createApiInstance, refreshToken } = useAuth();

  // Function to go to previous week
  const goToPreviousWeek = () => {
    const newEndDate = new Date(currentEndDate);
    newEndDate.setDate(newEndDate.getDate() - 7);
    setCurrentEndDate(newEndDate);
    fetchData(newEndDate);
    updateWeekTitle(newEndDate);
  };

  // Function to go to next week (but not beyond current date)
  const goToNextWeek = () => {
    const today = new Date();
    const newEndDate = new Date(currentEndDate);
    newEndDate.setDate(newEndDate.getDate() + 7);

    // Don't go beyond current date
    if (newEndDate > today) {
      newEndDate.setTime(today.getTime());
    }

    setCurrentEndDate(newEndDate);
    fetchData(newEndDate);
    updateWeekTitle(newEndDate);
  };

  // Update week title based on date range
  const updateWeekTitle = (endDate: Date) => {
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 6);

    const today = new Date();
    const isCurrentWeek =
      today.getDate() === endDate.getDate() &&
      today.getMonth() === endDate.getMonth() &&
      today.getFullYear() === endDate.getFullYear();

    if (isCurrentWeek) {
      setWeekTitle("Current Week");
    } else {
      const startMonth = startDate.toLocaleString("default", {
        month: "short",
      });
      const endMonth = endDate.toLocaleString("default", { month: "short" });

      if (startMonth === endMonth) {
        setWeekTitle(
          `${startMonth} ${startDate.getDate()} - ${endDate.getDate()}`
        );
      } else {
        setWeekTitle(
          `${startMonth} ${startDate.getDate()} - ${endMonth} ${endDate.getDate()}`
        );
      }
    }
  };

  // Function to fetch data for a specific end date
  const fetchData = async (endDate: Date) => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync("access_token");

      if (!token) {
        Alert.alert("Login Required", "Please sign in to continue", [
          { text: "OK", onPress: () => navigation.navigate("login") },
        ]);
        return;
      }

      // Fetch stats from the API with date parameter
      const response = await axios.get(
        `${API_URL}${endpoint}?end_date=${formatDate(endDate)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data) {
        setChartData(response.data.chart_data);

        if (dataType === "adherence") {
          setAverage(response.data.average_adherence);
        } else {
          setAverage(response.data.average_pain);
        }

        setHistory(response.data.history);
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        try {
          // Attempt token refresh
          const refreshToken = await SecureStore.getItemAsync("refresh_token");
          if (!refreshToken) throw new Error("No refresh token available");

          const refreshResponse = await axios.post(
            `${API_URL}/api/token/refresh/`,
            { refresh: refreshToken }
          );

          // Store new tokens
          const newToken = refreshResponse.data.access;
          const newRefreshToken = refreshResponse.data.refresh;

          await Promise.all([
            SecureStore.setItemAsync("access_token", newToken),
            SecureStore.setItemAsync("refresh_token", newRefreshToken),
          ]);

          // Retry with new token
          const response = await axios.get(
            `${API_URL}${endpoint}?end_date=${formatDate(endDate)}`,
            {
              headers: {
                Authorization: `Bearer ${newToken}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (response.data) {
            setChartData(response.data.chart_data);

            if (dataType === "adherence") {
              setAverage(response.data.average_adherence);
            } else {
              setAverage(response.data.average_pain);
            }

            setHistory(response.data.history);
          }
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
        setError(
          `Failed to load your ${
            dataType === "adherence" ? "exercises" : "pain data"
          }. Please check your connection and try again.`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial data fetch for current week
    fetchData(currentEndDate);
    updateWeekTitle(currentEndDate);
  }, []);

  return {
    loading,
    chartData,
    average,
    history,
    error,
    weekTitle,
    goToPreviousWeek,
    goToNextWeek,
  };
}
