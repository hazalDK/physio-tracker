import React, { useEffect, useState } from "react";
import * as Progress from "react-native-progress";

import {
  StyleSheet,
  Text,
  View,
  Image,
  Button,
  FlatList,
  Pressable,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import axios from "axios";
import tw from "tailwind-react-native-classnames";
import { Ionicons } from "@expo/vector-icons";

export default function Index() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    axios
      .get("http://localhost:8000")

      .then((response) => {
        setMessage(response.data.message);
      })

      .catch((error) => {
        console.log(error);
      });
  }, []);

  const items = [
    { id: 1, text: "Exercise 1", image: "https://example.com/image1.png" },
    { id: 2, text: "Exercise 2", image: "https://example.com/image2.png" },
    { id: 3, text: "Exercise 3", image: "https://example.com/image3.png" },
    { id: 4, text: "Exercise 4", image: "https://example.com/image4.png" },
  ];

  return (
    <View style={tw`flex-1 bg-white justify-center items-center`}>
      <Text style={tw`mt-10 text-lg`}>Completed {30}%</Text>
      <Progress.Bar progress={0.3} width={200} color="#14b8a6" />
      <FlatList
        style={tw`mx-auto`}
        data={items}
        numColumns={2}
        renderItem={({ item }) => {
          return (
            <View>
              <Image
                source={{ uri: item.image }}
                style={tw`w-32 h-32 rounded-full mx-auto`}
              />
              <Text style={tw`text-center`}>{item.text}</Text>
            </View>
          );
        }}
      />
      <Pressable
        style={[tw`p-4 rounded-full mt-5 mb-2`, { backgroundColor: "#14b8a6" }]}
      >
        <MaterialCommunityIcons
          name="robot-happy-outline"
          size={24}
          color="white"
          style={tw`mx-auto`}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,

    backgroundColor: "#fff",

    alignItems: "center",

    justifyContent: "center",
  },
});
