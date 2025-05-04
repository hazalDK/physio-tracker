import * as SecureStore from "expo-secure-store";
import axios, { AxiosInstance } from "axios";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamsList } from "@/types/navigation";
import { Alert } from "react-native";
import { getEnv } from "@/config";

/**
 * Custom hook to manage authentication and API instance creation.
 * @returns {Object} - An object containing functions to get token, refresh token, and create API instance.
 * */
export function useAuth(): {
  getToken: () => Promise<string | null>;
  refreshToken: () => Promise<string | null>;
  createApiInstance: () => Promise<AxiosInstance | null>;
} {
  const navigation =
    useNavigation<StackNavigationProp<RootStackParamsList, "login">>();

  // Get the API URL from environment configuration
  const apiUrl = getEnv("API_URL") || "http://192.168.68.111:8000";

  // Function to get the access token from secure storage
  const getToken = async () => {
    return await SecureStore.getItemAsync("access_token");
  };

  // Function to refresh the access token using the refresh token
  // If the refresh token is invalid or expired, delete both tokens and navigate to login screen
  const refreshToken = async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync("refresh_token");
      if (!refreshToken) {
        throw new Error("No refresh token available");
      }

      const refreshResponse = await axios.post(`${apiUrl}/api/token/refresh/`, {
        refresh: refreshToken,
      });

      const newToken = refreshResponse.data.access;
      const newRefreshToken = refreshResponse.data.refresh;

      await Promise.all([
        SecureStore.setItemAsync("access_token", newToken),
        SecureStore.setItemAsync("refresh_token", newRefreshToken),
      ]);

      return newToken;
    } catch (error) {
      await Promise.all([
        SecureStore.deleteItemAsync("access_token"),
        SecureStore.deleteItemAsync("refresh_token"),
      ]);

      Alert.alert("Session Expired", "Please login again", [
        { text: "OK", onPress: () => navigation.navigate("login") },
      ]);

      return null;
    }
  };

  // Function to create an Axios instance with the access token in the headers
  // If the token is not available, it shows an alert and navigates to the login screen
  const createApiInstance = async () => {
    let token = await getToken();

    if (!token) {
      Alert.alert("Login Required", "Please sign in to continue", [
        { text: "OK", onPress: () => navigation.navigate("login") },
      ]);
      return null;
    }

    return axios.create({
      baseURL: apiUrl,
      timeout: 10000,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  };

  return { getToken, refreshToken, createApiInstance };
}
