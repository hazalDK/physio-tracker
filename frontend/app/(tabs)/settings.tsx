import { useNavigation } from "@react-navigation/native";
import { View, Text, Button, Pressable, Alert } from "react-native";
import tw from "tailwind-react-native-classnames";
import * as SecureStore from "expo-secure-store";

export default function Settings() {
  const navigation = useNavigation();

  const signOut = async () => {
    try {
      // 1. Remove the access token from SecureStore
      await SecureStore.deleteItemAsync("access_token");
      await SecureStore.deleteItemAsync("refresh_token");

      // 3. Navigate to the auth screen (replace 'Auth' with your auth screen name)
      navigation.navigate("login" as never);

      // Optional: Show success message
      Alert.alert("Signed out", "You have been successfully signed out.");
    } catch (error) {
      console.error("Sign out error:", error);
      Alert.alert("Error", "Failed to sign out. Please try again.");
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
            // When hovered, change to a darker teal; otherwise use the default teal
            backgroundColor: hovered ? "#eeeee4" : "#FFFFFF",
            // Slightly reduce the opacity when the button is pressed
            opacity: pressed ? 0.8 : 1,
            borderColor: "#14b8a6",
          },
        ]}
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
    </View>
  );
}
