import { View, Text, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import tw from "tailwind-react-native-classnames";

export default function Chatbot() {
  const navigation = useNavigation();

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Pressable
        onPress={() => navigation.goBack()}
        style={({ pressed, hovered }) => [
          tw`absolute top-10 left-5 p-2 rounded-full`,
          {
            // When hovered, change to a darker teal; otherwise use the default teal
            backgroundColor: hovered ? "#0d9488" : "#14b8a6",
            // Slightly reduce the opacity when the button is pressed
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Ionicons name="arrow-back" size={24} color="white" />
      </Pressable>
      <Text> Chatbot Screen</Text>
    </View>
  );
}
