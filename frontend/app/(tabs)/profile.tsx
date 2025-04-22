import { View, Text, Pressable } from "react-native";
import tw from "tailwind-react-native-classnames";

export default function Profile() {
  return (
    <View style={tw`flex flex-1 items-center justify-center bg-white`}>
      <Text style={tw`text-lg`}>Username</Text>
      <Text style={tw`text-lg`}>Name</Text>
      <Text style={tw`text-lg`}>Injury type: {}</Text>
      <Text style={tw`text-lg`}>Date of birth:{}</Text>
      <Pressable
        style={({ pressed, hovered }) => [
          tw`absolute bottom-4 items-center p-4 rounded-2xl h-15 w-80`,
          {
            backgroundColor: hovered ? "#0d9488" : "#14b8a6",
            opacity: pressed ? 0.8 : 1,
          },
        ]}
        onPress={() => {}}
      >
        <Text style={tw`text-lg text-white font-semibold`}>Edit Profile</Text>
      </Pressable>
    </View>
  );
}
