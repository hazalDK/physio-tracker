import { View, Text, Button, Pressable } from "react-native";
import tw from "tailwind-react-native-classnames";

export default function Settings() {
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
      >
        <Text style={tw`font-semibold `}>Sign Out</Text>
      </Pressable>
    </View>
  );
}
