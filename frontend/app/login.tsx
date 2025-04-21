import { useState } from "react";
import { Link } from "@react-navigation/native";
import { View, Text, Pressable, Alert } from "react-native";
import * as SecureStore from "expo-secure-store";
import { TextInput, TouchableOpacity } from "react-native-gesture-handler";
import tw from "tailwind-react-native-classnames";
import axios from "axios";
import { router } from "expo-router";

export default function Login() {
  const [securePassword, setSecurePassword] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const storeToken = async (key: string, value: string) => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error("SecureStore error:", error);
      throw error;
    }
  };

  async function handleLogin(): Promise<void> {
    if (!username || !password) {
      Alert.alert("Error", "Please enter both username and password");
      return;
    }

    setIsLoading(true);

    try {
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
            adapter: require("axios/lib/adapters/http"), // Force HTTP adapter
          },
        }
      );

      // Store tokens using correct SecureStore methods
      console.log("Access Token:", response.data.access);
      console.log("Refresh Token:", response.data.refresh);
      await storeToken("access_token", response.data.access);
      await storeToken("refresh_token", response.data.refresh);

      // Navigate to main app screen
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert(
        "Login Failed",

        (axios.isAxiosError(error) && error.response?.data?.detail) ||
          "Invalid credentials"
      );
    } finally {
      setIsLoading(false);
    }
  }
  return (
    <View style={tw`flex-1 justify-center items-center bg-white`}>
      <Text
        style={[
          tw`text-3xl font-semibold mb-10`,
          {
            color: "#14b8a6",
          },
        ]}
      >
        Login
      </Text>
      <Text style={[tw`mb-2`, { color: "#8f8e8e" }]}>Username:</Text>
      <TextInput
        value={username}
        onChangeText={(text) => setUsername(text)}
        textContentType="username"
        autoComplete="username"
        style={[
          tw`flex text-center bg-gray-200 w-56 h-8 border rounded justify-center`,
          {
            color: "#8f8e8e",
            borderColor: "#e5e7eb",
            borderWidth: 1,
            outlineColor: "#ccc",
          },
        ]}
        placeholder="Enter username here"
      ></TextInput>
      <Text style={[tw`mb-2 mt-4`, { color: "#8f8e8e" }]}>Password:</Text>
      <View style={tw`flex-row items-center mb-4`}>
        <TextInput
          style={[
            tw`flex text-center bg-gray-200 w-48 h-8 border rounded justify-center`,
            {
              color: "#8f8e8e",
              borderColor: "#e5e7eb",
              borderWidth: 1,
              outlineColor: "#ccc",
            },
          ]}
          placeholder="****"
          secureTextEntry={!securePassword}
          value={password}
          onChangeText={(text) => {
            setPassword(text);
          }}
        />
        <TouchableOpacity
          style={tw`ml-2`}
          onPress={() => setSecurePassword(!securePassword)}
        >
          <Text>{securePassword ? "🙈" : "👁️"}</Text>
        </TouchableOpacity>
      </View>
      <Text style={[tw`mt-2`, { color: "#8f8e8e" }]}>
        Don't have an account? Create an account{" "}
        <Link screen="signup" params={{}}>
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
          },
        ]}
        onPress={() => handleLogin()}
      >
        <Text style={tw`text-white font-semibold`}>Login</Text>
      </Pressable>
    </View>
  );
}
