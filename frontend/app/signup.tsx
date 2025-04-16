import { View, Text, Pressable } from "react-native";
import { TextInput } from "react-native-gesture-handler";
import tw from "tailwind-react-native-classnames";

export default function Signup() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Registration</Text>
      <Text>Already Registered? Log in here</Text>
      <Text>Name:</Text>
      <TextInput></TextInput>
      <Text>Username:</Text>
      <TextInput></TextInput>
      <Text>Email:</Text>
      <TextInput></TextInput>
      <Text>Password:</Text>
      <TextInput></TextInput>
      <Text>Confirm password:</Text>
      <TextInput></TextInput>
      <Text>Date of birth:</Text>
      <TextInput></TextInput>
      <Text>Injury type:</Text>
      <TextInput></TextInput>
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
        <Text style={tw`text-white font-semibold`}>Sign up</Text>
      </Pressable>
    </View>
  );
}
