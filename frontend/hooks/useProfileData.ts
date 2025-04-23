import { useState, useEffect } from "react";
import { Alert } from "react-native";
import * as SecureStore from "expo-secure-store";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamsList } from "@/types/navigation";
import { injuryTypesData } from "@/types/Injury";
import { userProfileType } from "@/types/user";

export function useProfileData() {
  const [userProfile, setUserProfile] = useState<userProfileType | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newDateOfBirth, setNewDateOfBirth] = useState<Date | undefined>(
    undefined
  );
  const [injuryTypes, setInjuryTypes] = useState([] as injuryTypesData[]);
  const [open, setOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigation =
    useNavigation<StackNavigationProp<RootStackParamsList, "login">>();

  const fetchUserProfile = async () => {
    try {
      const token = await SecureStore.getItemAsync("access_token");

      if (!token) {
        Alert.alert("Login Required", "Please sign in to continue", [
          { text: "OK", onPress: () => navigation.navigate("login") },
        ]);
        return;
      }

      const response = await axios.get("http://192.168.68.111:8000/users/me/", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      setUserProfile(response.data);
    } catch (error) {
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

          // Retry with new token
          const api = axios.create({
            baseURL: process.env.API_URL || "http://192.168.68.111:8000",
            timeout: 10000,
            headers: { Authorization: `Bearer ${newToken}` },
          });

          const response = await axios.get(`${api}/users/me/`, {});
          setUserProfile(response.data);
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);

          // Clear tokens and redirect
          await Promise.all([
            SecureStore.deleteItemAsync("access_token"),
            SecureStore.deleteItemAsync("refresh_token"),
          ]);

          Alert.alert("Session Expired", "Please login again", [
            {
              text: "OK",
              onPress: () => navigation.navigate("login"),
            },
          ]);
        }
      } else {
        // Handle other errors
        console.error("API request failed:", error);
        Alert.alert(
          "Error",
          "Failed to load your profile. Please check your connection and try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchInjuryTypes = async () => {
    try {
      const apiUrl = process.env.API_URL || "http://192.168.68.111:8000";
      const response = await axios.get<injuryTypesData[]>(
        `${apiUrl}/injury-types/`
      );
      setInjuryTypes(response.data);
    } catch (error) {
      console.error("Error fetching injury types:", error);
    }
  };

  useEffect(() => {
    fetchInjuryTypes();
    fetchUserProfile();
  }, []);

  const handleEditProfile = async () => {
    setIsUpdating(true);

    if (!newUsername && !newFirstName && !newLastName && !newDateOfBirth) {
      Alert.alert("Error", "Please fill in at least one field");
      setIsUpdating(false);
      return;
    }

    try {
      const token = await SecureStore.getItemAsync("access_token");

      // Build the updated data object
      const updatedData = {
        ...(newUsername && { username: newUsername }),
        ...(newFirstName && { first_name: newFirstName }),
        ...(newLastName && { last_name: newLastName }),
        ...(newDateOfBirth && {
          date_of_birth: newDateOfBirth.toISOString().split("T")[0],
        }),
      };

      const response = await axios.put(
        "http://192.168.68.111:8000/users/update_profile/",
        updatedData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 200 || response.status === 201) {
        Alert.alert("Success", "Profile updated successfully!");
        setIsModalVisible(false);
        setNewUsername("");
        setNewFirstName("");
        setNewLastName("");
        setNewDateOfBirth(undefined);
        fetchUserProfile();
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleModal = () => {
    setIsModalVisible(!isModalVisible);
  };

  return {
    userProfile,
    injuryTypes,
    loading,
    isModalVisible,
    newUsername,
    newFirstName,
    newLastName,
    newDateOfBirth,
    open,
    isUpdating,
    setNewUsername,
    setNewFirstName,
    setNewLastName,
    setNewDateOfBirth,
    setOpen,
    handleEditProfile,
    toggleModal,
  };
}
