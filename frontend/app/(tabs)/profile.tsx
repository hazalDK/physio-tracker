import {
  View,
  Text,
  Pressable,
  Alert,
  Modal,
  TextInput,
  TouchableOpacity,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as SecureStore from "expo-secure-store";
import tw from "tailwind-react-native-classnames";
import axios from "axios";
import { useState, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";

// User Profile Interface
interface Profile {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  date_of_birth: Date;
  injury_type: number;
  last_reset: string;
  exercises: string;
}

// Interface for the injury types data
interface injuryTypesData {
  id: number;
  name: string;
  description: string;
  treatment: [number];
}

export default function Profile() {
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
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
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const fetchUserProfile = async () => {
    try {
      const token = await SecureStore.getItemAsync("access_token");

      if (!token) {
        Alert.alert("Login Required", "Please sign in to continue", [
          { text: "OK", onPress: () => navigation.navigate("login" as never) },
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

          // Retry both requests with new token
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
              onPress: () => navigation.navigate("login" as never),
            },
          ]);
        }
      } else {
        // Handle other errors
        console.error("API request failed:", error);
        Alert.alert(
          "Error",
          "Failed to load your exercises. Please check your connection and try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
      // ... error handling ...
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={tw`flex-1 bg-white justify-center items-center`}>
        <Text style={tw`text-lg`}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={tw`flex flex-1 items-center justify-center bg-white`}>
      <Text style={tw`text-lg`}>{userProfile?.username}</Text>
      <Text style={tw`text-lg`}>
        {userProfile?.first_name} {userProfile?.last_name}
      </Text>
      <Text style={tw`text-lg`}>
        Injury type:{" "}
        {injuryTypes.find((type) => type.id === userProfile?.injury_type)
          ?.name || "Unknown"}
      </Text>
      <Text style={tw`text-lg`}>
        Date of birth:{" "}
        {userProfile?.date_of_birth
          ? new Date(userProfile.date_of_birth).toLocaleDateString()
          : "N/A"}
      </Text>
      <Pressable
        style={({ pressed, hovered }) => [
          tw`absolute bottom-4 items-center p-4 rounded-2xl w-80`,
          {
            backgroundColor: hovered ? "#0d9488" : "#14b8a6",
            opacity: pressed ? 0.8 : 1,
          },
        ]}
        onPress={() => {
          setIsModalVisible(true);
        }}
      >
        <Text style={tw`text-lg text-white font-semibold`}>Edit Profile</Text>
      </Pressable>
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !isUpdating && setIsModalVisible(false)}
      >
        <View
          style={tw`flex-1 justify-center items-center bg-black bg-opacity-50`}
        >
          <View style={tw`bg-white p-6 rounded-lg w-80`}>
            <Text style={tw`text-xl font-bold mb-4`}>Update Profile</Text>
            <Text style={tw`mb-1`}>Update Username:</Text>
            <TextInput
              style={tw`border border-gray-300 p-2 mb-4 rounded`}
              placeholder="username"
              value={newUsername}
              onChangeText={setNewUsername}
              editable={!isUpdating}
            />
            <Text style={tw`mb-1`}>Update First Name:</Text>
            <TextInput
              style={tw`border border-gray-300 p-2 mb-3 rounded`}
              placeholder="first name"
              value={newFirstName}
              onChangeText={setNewFirstName}
              editable={!isUpdating}
            />
            <Text style={tw`mb-1`}>Update Last Name:</Text>
            <TextInput
              style={tw`border border-gray-300 p-2 mb-4 rounded`}
              placeholder="last name"
              value={newLastName}
              onChangeText={setNewLastName}
              editable={!isUpdating}
            />
            <Text style={[tw`mb-2`, { color: "#8f8e8e" }]}>Date of birth:</Text>
            <View style={tw`flex-row items-center mb-4`}>
              <TouchableOpacity
                style={[
                  tw`flex-1 text-center bg-gray-200 h-8 border rounded justify-center`,
                ]}
                onPress={() => setOpen(true)}
              >
                <Text style={{ color: "#8f8e8e" }}>
                  {newDateOfBirth
                    ? newDateOfBirth.toLocaleDateString()
                    : userProfile?.date_of_birth
                    ? new Date(userProfile.date_of_birth).toLocaleDateString()
                    : "Select Date of Birth"}
                </Text>
              </TouchableOpacity>

              {/* Add a clear button */}
              {(newDateOfBirth || userProfile?.date_of_birth) && (
                <TouchableOpacity
                  style={tw`ml-2 p-2`}
                  onPress={() => setNewDateOfBirth(undefined)} // Clear to null
                >
                  <Text style={tw`text-red-500`}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            {open && (
              <DateTimePicker
                value={
                  newDateOfBirth ||
                  new Date(userProfile?.date_of_birth || Date.now())
                }
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setOpen(false);
                  if (event.type === "set") {
                    setNewDateOfBirth(selectedDate);
                  }
                }}
                maximumDate={new Date()}
              />
            )}

            <View style={tw`flex-row justify-between`}>
              <Pressable
                style={[tw`px-4 py-2 rounded`, { backgroundColor: "#e5e7eb" }]}
                onPress={() => setIsModalVisible(false)}
                disabled={isUpdating}
              >
                <Text style={isUpdating ? tw`text-gray-500` : tw``}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                style={[tw`px-4 py-2 rounded`, { backgroundColor: "#14b8a6" }]}
                onPress={handleEditProfile}
                disabled={isUpdating}
              >
                <Text style={tw`text-white`}>
                  {isUpdating ? "Updating..." : "Update"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
