import { useState } from "react";
import { Link } from "@react-navigation/native";
import { View, Text, Pressable, Alert } from "react-native";
import * as SecureStore from "expo-secure-store";
import { TextInput, TouchableOpacity } from "react-native-gesture-handler";
import tw from "tailwind-react-native-classnames";

import axios from "axios";
import { router } from "expo-router";
import { useAuthStore } from "@/stores/authStore";

// React native component for the login screen
// This component allows users to enter their username and password to log in to the app
// and handles the login process, including storing tokens securely and navigating to the home screen.
export default function Login() {
  const [securePassword, setSecurePassword] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const setIsAuthenticated = useAuthStore((state) => state.setIsAuthenticated);

  const storeToken = async (key: string, value: string) => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error("SecureStore error:", error);
      throw error;
    }
  };

  async function handleLogin(): Promise<void> {
    if (isLoading) return;
    // Validate input fields
    if (!username || !password) {
      Alert.alert("Error", "Please enter both username and password");
      return;
    }

    setIsLoading(true);

    try {
      // Make API call to login endpoint
      const response = await axios.post(
        "http://192.168.68.111:8000/api/token/",
        {
          username,
          password,
        },
        {
          timeout: 30000,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // Store tokens using correct SecureStore methods
      await storeToken("access_token", response.data.access);
      await storeToken("refresh_token", response.data.refresh);
      setIsAuthenticated(true);
      // Navigate to home screen after successful login
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Login error:", error);
      // Handle error response from API
      Alert.alert(
        "Login Failed",
        (axios.isAxiosError(error) && error.response?.data?.detail) ||
          "Invalid credentials"
      );
    } finally {
      setIsLoading(false);
    }
  }

  // Input field style
  const inputStyle = tw`flex text-center bg-gray-200 w-64 h-10 border rounded justify-center mb-4`;
  const inputTextStyle = {
    color: "#8f8e8e",
    placeholderTextColor: "#8f8e8e",
    borderColor: "#e5e7eb",
    borderWidth: 1,
    textAlign: "center" as "center", // Explicitly cast to valid TextStyle value
    outlineColor: "#ccc",
  };
  return (
    <View style={tw`flex-1 justify-center items-center bg-white`}>
      <Text
        testID="login-title"
        style={[
          tw`text-3xl font-semibold mb-10`,
          {
            color: "#14b8a6",
          },
        ]}
      >
        Login
      </Text>
      <Text style={[tw`mb-2`, { color: "#8f8e8e" }]}>
        Username (case sensitive):
      </Text>
      <TextInput
        value={username}
        onChangeText={(text) => setUsername(text)}
        textContentType="username"
        autoComplete="username"
        style={[inputStyle, inputTextStyle]}
        placeholder="Enter username here"
      ></TextInput>
      <Text style={[tw`mb-2 mt-2`, { color: "#8f8e8e" }]}>Password:</Text>
      <View style={[tw`w-64 mb-4 flex-row`]}>
        <TextInput
          style={[
            tw`bg-gray-200 h-10 border rounded flex-1 text-left px-4`,
            inputTextStyle,
          ]}
          placeholder="****"
          testID="password-input"
          secureTextEntry={!securePassword}
          value={password}
          onChangeText={setPassword}
        />
        <View
          style={{
            position: "absolute",
            right: 10,
            height: 40,
            justifyContent: "center",
            alignItems: "center",
            zIndex: 10,
            width: 30,
          }}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            onPress={() => setSecurePassword(!securePassword)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text testID="secure-password" style={{ fontSize: 16 }}>
              {securePassword ? "🙈" : "👁️"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[tw`mt-2`, { color: "#8f8e8e" }]}>
        Don't have an account? Create an account{" "}
        <Link
          style={{ color: "#14b8a6", fontWeight: "bold" }}
          screen="signup"
          params={{}}
        >
          here
        </Link>
      </Text>
      <Pressable
        style={({ pressed, hovered }) => [
          tw`flex items-center p-4 rounded-xl mt-5 mb-2 w-60`,
          {
            // When hovered, change to a darker teal; otherwise use the default teal
            backgroundColor: hovered ? "#0d9488" : "#14b8a6",
            // Slightly reduce the opacity when the button is pressed
            opacity: pressed ? 0.8 : 1,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: 2,
          },
        ]}
        onPress={() => handleLogin()}
      >
        <Text testID="login-button" style={tw`text-white font-semibold`}>
          Login
        </Text>
      </Pressable>
    </View>
  );
}
