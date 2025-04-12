import React, { useEffect, useState } from "react";
import * as Progress from "react-native-progress";

import { StyleSheet, Text, View, Image, Button, FlatList } from "react-native";

import axios from "axios";

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
    <View style={styles.container}>
      <Text className="mt-3">Completed {30}%</Text>
      <Progress.Bar progress={0.3} width={200} />
      <FlatList
        data={items}
        numColumns={2}
        renderItem={({ item }) => {
          return (
            <View>
              <Image
                source={{ uri: item.image }}
                style={{ width: 100, height: 100 }}
              />
              <Text>{item.text}</Text>
            </View>
          );
        }}
      />
      <Button title="hi" onPress={() => {}} />
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
