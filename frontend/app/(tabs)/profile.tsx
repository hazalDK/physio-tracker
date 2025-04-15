import { View, Text } from "react-native";
import tw from "tailwind-react-native-classnames";

export default function Profile() {
  return (
    <View style={tw`flex flex-1 items-center justify-center bg-white`}>
      <Text>Username</Text>
      <Text>Name</Text>
      <Text>Injury type: {}</Text>
      <Text>Date of birth:{}</Text>
    </View>
  );
}
