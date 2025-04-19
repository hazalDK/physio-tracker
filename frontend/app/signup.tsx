import { View, Text, Pressable } from "react-native";
import { TextInput } from "react-native-gesture-handler";
import tw from "tailwind-react-native-classnames";

export default function Signup() {
  return (
    <View style={tw`flex-1 justify-center items-center bg-white`}>
      <Text
        style={[
          tw`text-3xl font-semibold mb-2`,
          {
            color: "#14b8a6",
          },
        ]}
      >
        Registration
      </Text>
      <Text style={[tw`mb-10`, { color: "#8f8e8e" }]}>
        Already Registered? Log in here
      </Text>
      <Text style={[tw`mb-2`, { color: "#8f8e8e" }]}>Name:</Text>
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
        placeholder="Enter name here"
      ></TextInput>
      <Text style={[tw`mb-2`, { color: "#8f8e8e" }]}>Username:</Text>
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
        placeholder="Enter username here"
      ></TextInput>
      <Text style={[tw`mb-2`, { color: "#8f8e8e" }]}>Email:</Text>
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
        placeholder="example@gmail.com"
      ></TextInput>
      <Text style={[tw`mb-2`, { color: "#8f8e8e" }]}>Password:</Text>
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
      ></TextInput>
      <Text style={[tw`mb-2`, { color: "#8f8e8e" }]}>Confirm password:</Text>
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
      ></TextInput>
      <Text style={[tw`mb-2`, { color: "#8f8e8e" }]}>Date of birth:</Text>
      <TextInput></TextInput>
      <Text style={[tw`mb-2`, { color: "#8f8e8e" }]}>Injury type:</Text>
      <TextInput></TextInput>
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
      >
        <Text style={tw`text-white font-semibold`}>Sign Up</Text>
      </Pressable>
    </View>
  );
}
