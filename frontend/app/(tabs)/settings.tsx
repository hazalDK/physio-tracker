import { useNavigation } from "@react-navigation/native";
import { View, Text, Pressable, Alert, Modal, TextInput } from "react-native";
import tw from "tailwind-react-native-classnames";
import * as SecureStore from "expo-secure-store";
import { useState } from "react";

export default function Settings() {
  const navigation = useNavigation();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [secureEntry, setSecureEntry] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false); // New loading state

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
      const response = await fetch(
        "http://192.168.68.111:8000/users/update_password/",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
          }),
        }
      );

      const data = await response.json(); // Always parse the response
      if (response.ok) {
        Alert.alert("Success", "Password updated successfully!");
        setIsModalVisible(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        // SPECIFIC ALERT FOR INCORRECT PASSWORD
        if (
          response.status === 400 &&
          data.error === "Current password is incorrect"
        ) {
          Alert.alert(
            "Incorrect Password",
            "The password you entered doesn't match your current password. Please try again."
          );
        } else {
          // Generic error for other cases
          Alert.alert("Error", data.error || "Failed to update password");
        }
      }
    } catch (error) {
      console.error("Update password error:", error);
      Alert.alert(
        "Error",
        "Network error. Please check your connection and try again."
      );
    } finally {
      setIsUpdating(false); // Hide loading state
    }
  };

  return (
    <View style={tw`flex flex-1 items-center bg-white`}>
      <Text style={tw`text-lg mt-10`}>Customisable Reminder:</Text>

      <Pressable
        style={({ pressed, hovered }) => [
          tw`flex items-center p-4 rounded-2xl mt-5 mb-2 w-28`,
          {
            // When hovered, change to a darker teal; otherwise use the default teal
            backgroundColor: hovered ? "#0d9488" : "#14b8a6",
            // Slightly reduce the opacity when the button is pressed
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Text style={tw`text-white font-semibold`}>Save</Text>
      </Pressable>
      <Text style={tw`text-lg`}>Privacy</Text>
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
            // When hovered, change to a darker teal; otherwise use the default teal
            backgroundColor: hovered ? "#eeeee4" : "#FFFFFF",
            // Slightly reduce the opacity when the button is pressed
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

            {/* Current Password */}
            <Text style={tw`mb-1`}>Current Password:</Text>
            <TextInput
              style={tw`border border-gray-300 text-black p-2 mb-3 rounded`}
              secureTextEntry={secureEntry}
              placeholder="Enter current password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              editable={!isUpdating}
            />

            {/* New Password */}
            <Text style={tw`mb-1`}>New Password:</Text>
            <TextInput
              style={tw`border border-gray-300 p-2 mb-3 rounded`}
              secureTextEntry={secureEntry}
              placeholder="Enter new password"
              value={newPassword}
              onChangeText={setNewPassword}
              editable={!isUpdating}
            />

            {/* Confirm Password */}
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

            {/* Action Buttons */}
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
