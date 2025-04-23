import { useState, useEffect } from "react";
import { Alert } from "react-native";
import * as SecureStore from "expo-secure-store";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamsList } from "@/types/navigation";
import { injuryTypesData } from "@/types/Injury";
import { userProfileType } from "@/types/user";
import { useAuth } from "./useAuth";
import { useInjuryData } from "./useInjuryData";

export function useProfileData() {
  const [userProfile, setUserProfile] = useState<userProfileType | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newDateOfBirth, setNewDateOfBirth] = useState<Date | undefined>(
    undefined
  );
  const { injuryTypes, loading: injuryLoading } = useInjuryData();
  const [open, setOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [loading, setLoading] = useState(true);
  const { createApiInstance, refreshToken } = useAuth();
  const navigation =
    useNavigation<StackNavigationProp<RootStackParamsList, "login">>();

  const fetchUserProfile = async () => {
    try {
      const api = await createApiInstance();
      if (!api) return;
      try {
        const response = await api.get(`/users/me/`);

        setUserProfile(response.data);
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          // Attempt token refresh
          const newToken = await refreshToken();
          if (!newToken) throw new Error("No refresh token available");

          const api = await createApiInstance();
          if (!api) return;

          const response = await axios.get(`${api}/users/me/`, {});
          setUserProfile(response.data);
        } else {
          // Handle other errors
          console.error("API request failed:", error);
          Alert.alert(
            "Error",
            "Failed to load your profile. Please check your connection and try again."
          );
          setUserProfile(null);
        }
      }
    } catch (error) {
      console.error("Failed to load exercise data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    useInjuryData();
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
