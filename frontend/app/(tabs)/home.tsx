import React, { useEffect, useState } from "react";

import { StyleSheet, Text, View } from "react-native";

import axios from "axios";

export default function App() {
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

  return (
    <View style={styles.container}>
      <Text>{message}</Text>
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
