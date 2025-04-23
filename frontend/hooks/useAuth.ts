import * as SecureStore from "expo-secure-store";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamsList } from "@/types/navigation";
import { Alert } from "react-native";

export function useAuth() {
  const navigation =
    useNavigation<StackNavigationProp<RootStackParamsList, "login">>();

  const getToken = async () => {
    return await SecureStore.getItemAsync("access_token");
  };

  const refreshToken = async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync("refresh_token");
      if (!refreshToken) {
        throw new Error("No refresh token available");
      }

      const refreshUrl = process.env.API_URL || "http://192.168.68.111:8000";
      const refreshResponse = await axios.post(
        `${refreshUrl}/api/token/refresh/`,
        { refresh: refreshToken }
      );

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

  const createApiInstance = async () => {
    let token = await getToken();

    if (!token) {
      Alert.alert("Login Required", "Please sign in to continue", [
        { text: "OK", onPress: () => navigation.navigate("login") },
      ]);
      return null;
    }

    return axios.create({
      baseURL: process.env.API_URL || "http://192.168.68.111:8000",
      timeout: 10000,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  };

  return { getToken, refreshToken, createApiInstance };
}
