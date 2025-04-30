import { useState, useEffect } from "react";
import { Alert } from "react-native";
import * as SecureStore from "expo-secure-store";
import axios from "axios";
import { userProfileType } from "@/types/user";
import { useAuth } from "./useAuth";
import { useInjuryData } from "./useInjuryData";

/**
 * Custom hook to manage user profile data and related operations.
 * returns an object containing user profile data, loading state, modal visibility, and functions to handle profile updates.
 */
export function useProfileData() {
  const [userProfile, setUserProfile] = useState<userProfileType | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newDateOfBirth, setNewDateOfBirth] = useState<Date | undefined>(
    undefined
  );
  const { injuryTypes, loading: injuryLoading } = useInjuryData();
  const [open, setOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [loading, setLoading] = useState(true);
  const { createApiInstance, refreshToken } = useAuth();

  // Function to fetch user profile data and handle token refresh if needed
  const fetchUserProfile = async () => {
    try {
      // Set loading state to true
      setLoading(true);
      // Create API instance
      const api = await createApiInstance();
      if (!api) return;
      try {
        // Fetch user profile data
        const response = await api.get(`/users/me/`);

        // set user profile data
        setUserProfile(response.data);
      } catch (error) {
        // Handle 401 error by refreshing the token and retrying the request
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          // Attempt token refresh
          const newToken = await refreshToken();
          if (!newToken) throw new Error("No refresh token available");

          // Create a new API instance with the refreshed token
          const api = await createApiInstance();
          if (!api) return;

          // Retry fetching user profile data
          const response = await axios.get(`${api}/users/me/`, {});

          if (response.status === 200 || response.status === 201) {
            // Set user profile data
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

  // Fetch user profile data on component mount
  useEffect(() => {
    fetchUserProfile();
  }, []);

  // Function to handle profile update
  // This function is called when the user submits the profile update form
  const handleEditProfile = async () => {
    // The button is disabled while the profile is being updated
    setIsUpdating(true);

    // Validate input fields to ensure at least one field is filled
    if (
      !newUsername &&
      !newFirstName &&
      !newLastName &&
      !newEmail &&
      !newDateOfBirth
    ) {
      Alert.alert("Error", "Please fill in at least one field");
      setIsUpdating(false);
      return;
    }

    // Basic email validation if email is provided
    if (newEmail && !validateEmail(newEmail)) {
      Alert.alert("Error", "Please enter a valid email address");
      setIsUpdating(false);
      return;
    }

    try {
      // Get the api instance
      const api = await createApiInstance();
      if (!api) return;

      // Build the updated data object with only the fields that are filled
      // This ensures that only the fields that the user wants to update are sent to the server
      const updatedData = {
        ...(newUsername && { username: newUsername }),
        ...(newFirstName && { first_name: newFirstName }),
        ...(newLastName && { last_name: newLastName }),
        ...(newEmail && { email: newEmail }),
        ...(newDateOfBirth && {
          date_of_birth: newDateOfBirth.toISOString().split("T")[0],
        }),
      };

      const response = await api.put(
        "http://192.168.68.111:8000/users/update_profile/",
        updatedData
      );

      if (response.status === 200 || response.status === 201) {
        // Handle success response from the API
        // This includes updating the user profile state and closing the modal
        Alert.alert("Success", "Profile updated successfully!");
        setIsModalVisible(false);
        setNewUsername("");
        setNewFirstName("");
        setNewLastName("");
        setNewEmail("");
        setNewDateOfBirth(undefined);
        fetchUserProfile();
      } else {
        Alert.alert("Error", "Unexpected response from the server");
      }
    } catch (error) {
      // Handle error response from the API
      // This includes logging the error and showing an alert to the user
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setIsUpdating(false);
    }
  };

  // Function to validate email format
  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // Function to toggle the visibility of the modal
  // This function is called when the user clicks the button to open or close the modal
  const toggleModal = () => {
    setIsModalVisible(!isModalVisible);

    // If opening the modal, initialize form fields with current profile values
    if (!isModalVisible && userProfile) {
      setNewUsername(userProfile.username || "");
      setNewFirstName(userProfile.first_name || "");
      setNewLastName(userProfile.last_name || "");
      setNewEmail(userProfile.email || "");
      // Date of birth is handled separately since it needs to be converted to a Date object
    }
  };

  return {
    userProfile,
    injuryTypes,
    loading,
    isModalVisible,
    newUsername,
    newFirstName,
    newLastName,
    newEmail,
    newDateOfBirth,
    open,
    isUpdating,
    setNewUsername,
    setNewFirstName,
    setNewLastName,
    setNewEmail,
    setNewDateOfBirth,
    setOpen,
    handleEditProfile,
    toggleModal,
  };
}
