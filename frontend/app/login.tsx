import { View, Text, Pressable } from "react-native";
import { TextInput } from "react-native-gesture-handler";
import tw from "tailwind-react-native-classnames";

export default function Login() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Login</Text>
      <Text>Username:</Text>
      <TextInput></TextInput>
      <Text>Password:</Text>
      <TextInput></TextInput>
      <Text>Don't have an account? Create an account here</Text>
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
        <Text style={tw`text-white font-semibold`}>Login</Text>
      </Pressable>
    </View>
  );
}
