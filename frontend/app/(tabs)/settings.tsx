import React, { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { View, Text, Pressable, Alert, Modal, TextInput } from "react-native";
import tw from "tailwind-react-native-classnames";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import ReminderComponent from "../reminderComponent";

export default function Settings() {
  const navigation = useNavigation();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [secureEntry, setSecureEntry] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Password requirements validation
  const validatePassword = (password: string) => {
    const regex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(password);
  };

  const signOut = async () => {
    try {
      await SecureStore.deleteItemAsync("access_token");
      await SecureStore.deleteItemAsync("refresh_token");
      navigation.navigate("login" as never);
      Alert.alert("Signed out", "You have been successfully signed out.");
    } catch (error) {
      Alert.alert("Error", "Failed to sign out. Please try again.");
    }
  };

  const handleUpdatePassword = async () => {
    // Validate inputs
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "All fields are required.");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert(
        "Error",
        "New password cannot be the same as current password."
      );
      return;
    }

    if (!validatePassword(newPassword)) {
      Alert.alert(
        "Error",
        "Password must contain:\n- 8+ characters\n- 1 uppercase\n- 1 lowercase\n- 1 number\n- 1 special character"
      );
      return;
    }

    setIsUpdating(true);

    try {
      const token = await SecureStore.getItemAsync("access_token");

      const response = await axios.put(
        "http://192.168.68.111:8000/users/update_password/",
        {
          current_password: currentPassword,
          new_password: newPassword,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      Alert.alert("Success", "Password updated successfully!");
      setIsModalVisible(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.error;

        if (status === 400 && message === "Current password is incorrect") {
          Alert.alert(
            "Incorrect Password",
            "The password you entered doesn't match your current password. Please try again."
          );
        } else {
          Alert.alert("Error", message || "Failed to update password");
        }
      } else {
        console.error("Update password error:", error);
        Alert.alert(
          "Error",
          "Network error. Please check your connection and try again."
        );
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <View style={tw`flex flex-1 items-center bg-white`}>
      <Text style={tw`text-lg font-semibold mt-10`}>
        Customisable Reminder:
      </Text>

      <ReminderComponent />

      <Text style={tw`text-lg font-semibold`}>Privacy</Text>
      <Pressable
        style={({ pressed, hovered }) => [
          tw`flex items-center p-4 rounded-2xl mt-4 mb-2 border-2 w-60`,
          {
            backgroundColor: hovered ? "#eeeee4" : "#FFFFFF",
            opacity: pressed ? 0.8 : 1,
            borderColor: "#14b8a6",
          },
        ]}
        onPress={() => setIsModalVisible(true)}
      >
        <Text style={tw`font-semibold`}>Update password</Text>
      </Pressable>
      <Pressable
        style={({ pressed, hovered }) => [
          tw`flex items-center p-4 rounded-2xl mb-2 border-2 w-60`,
          {
            backgroundColor: hovered ? "#eeeee4" : "#FFFFFF",
            opacity: pressed ? 0.8 : 1,
            borderColor: "#14b8a6",
          },
        ]}
        onPress={signOut}
      >
        <Text style={tw`font-semibold `}>Sign Out</Text>
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
            <Text style={tw`text-xl font-bold mb-4`}>Update Password</Text>

            <Text style={tw`mb-1`}>Current Password:</Text>
            <TextInput
              style={tw`border border-gray-300 text-black p-2 mb-3 rounded`}
              secureTextEntry={secureEntry}
              placeholder="Enter current password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              editable={!isUpdating}
            />

            <Text style={tw`mb-1`}>New Password:</Text>
            <TextInput
              style={tw`border border-gray-300 p-2 mb-3 rounded`}
              secureTextEntry={secureEntry}
              placeholder="Enter new password"
              value={newPassword}
              onChangeText={setNewPassword}
              editable={!isUpdating}
            />
            <Text style={tw`mb-1`}>Confirm New Password:</Text>
            <TextInput
              style={tw`border border-gray-300 p-2 mb-4 rounded`}
              secureTextEntry={secureEntry}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!isUpdating}
            />

            <Pressable
              onPress={() => !isUpdating && setSecureEntry(!secureEntry)}
              style={tw`mb-4`}
              disabled={isUpdating}
            >
              <Text style={isUpdating ? tw`text-gray-500` : tw``}>
                {secureEntry ? "👁️ Show Passwords" : "🙈 Hide Passwords"}
              </Text>
            </Pressable>

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
                onPress={handleUpdatePassword}
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
