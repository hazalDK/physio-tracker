import { View, Text, Pressable } from "react-native";
import tw from "tailwind-react-native-classnames";

export default function Profile() {
  return (
    <View style={tw`flex flex-1 items-center justify-center bg-white`}>
      <Text>Username</Text>
      <Text>Name</Text>
      <Text>Injury type: {}</Text>
      <Text>Date of birth:{}</Text>
      <Pressable
        style={({ pressed, hovered }) => [
          tw`items-center p-4 rounded-2xl w-60`,
          {
            backgroundColor: hovered ? "#0d9488" : "#14b8a6",
            opacity: pressed ? 0.8 : 1,
          },
        ]}
        onPress={() => {}}
      >
        <Text style={tw`text-white font-semibold`}>Edit Profile</Text>
      </Pressable>
    </View>
  );
}
