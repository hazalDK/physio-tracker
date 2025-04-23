import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import tw from "tailwind-react-native-classnames";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";
import Entypo from "@expo/vector-icons/Entypo";
import { LineChart, BarChart } from "react-native-chart-kit";
import axios from "axios";

// Import your API_URL from a config file
const API_URL = "http://192.168.68.111:8000"; // Replace with your actual API URL

// Get screen width for responsive charts
const screenWidth = Dimensions.get("window").width - 40;

// Component for the Adherence tab
function AdherenceGraph() {
  const [loading, setLoading] = useState(true);
  const [adherenceData, setAdherenceData] = useState({
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        data: [0, 0, 0, 0, 0, 0, 0],
      },
    ],
  });
  const [averageAdherence, setAverageAdherence] = useState(0);
  const [exerciseHistory, setExerciseHistory] = useState([]);
  const [error, setError] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    // Get the stored token from AsyncStorage or another storage method
    const getToken = async () => {
      try {
        // Replace with your token retrieval method
        const token = await SecureStore.getItemAsync("access_token");

        if (!token) {
          Alert.alert("Login Required", "Please sign in to continue", [
            {
              text: "OK",
              onPress: () => navigation.navigate("login" as never),
            },
          ]);
          return;
        }

        // Fetch adherence stats from the API
        const response = await axios.get(
          `${API_URL}/reports/adherence_stats/`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.data) {
          setAdherenceData(response.data.chart_data);
          setAverageAdherence(response.data.average_adherence);
          setExerciseHistory(response.data.history);
          setLoading(false);
        }
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          try {
            // Attempt token refresh
            const refreshToken = await SecureStore.getItemAsync(
              "refresh_token"
            );
            if (!refreshToken) throw new Error("No refresh token available");

            const refreshUrl =
              process.env.API_URL || "http://192.168.68.111:8000";
            const refreshResponse = await axios.post(
              `${refreshUrl}/api/token/refresh/`,
              { refresh: refreshToken }
            );

            // Store new tokens
            const newToken = refreshResponse.data.access;
            const newRefreshToken = refreshResponse.data.refresh;

            await Promise.all([
              SecureStore.setItemAsync("access_token", newToken),
              SecureStore.setItemAsync("refresh_token", newRefreshToken),
            ]);

            // Retry both requests with new token
            const api = axios.create({
              baseURL: process.env.API_URL || "http://192.168.68.111:8000",
              timeout: 10000,
              headers: { Authorization: `Bearer ${newToken}` },
            });

            const response = await axios.get(
              `${api}/reports/adherence_stats/`,
              {}
            );
            if (response.data) {
              setAdherenceData(response.data.chart_data);
              setAverageAdherence(response.data.average_adherence);
              setExerciseHistory(response.data.history);
              setLoading(false);
            }
          } catch (refreshError) {
            console.error("Token refresh failed:", refreshError);

            // Clear tokens and redirect
            await Promise.all([
              SecureStore.deleteItemAsync("access_token"),
              SecureStore.deleteItemAsync("refresh_token"),
            ]);

            Alert.alert("Session Expired", "Please login again", [
              {
                text: "OK",
                onPress: () => navigation.navigate("login" as never),
              },
            ]);
          }
        } else {
          // Handle other errors
          console.error("API request failed:", error);
          Alert.alert(
            "Error",
            "Failed to load your exercises. Please check your connection and try again."
          );
        }
      } finally {
        setLoading(false);
      }
    };
    getToken();
  }, []);

  if (loading) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-white`}>
        <ActivityIndicator size="large" color="#14b8a6" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-white px-4`}>
        <Text style={tw`text-red-500 text-lg`}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={tw`flex-1 bg-white px-4`}>
      {/* Average Adherence Card */}
      <View style={tw`items-center mt-32`}>
        <View style={tw`border-2 border-gray-300 rounded-lg w-full p-4`}>
          <Text style={tw`text-center text-lg font-bold`}>
            Average Adherence : {averageAdherence}%
          </Text>
        </View>
      </View>

      {/* Adherence Chart */}
      <View style={tw`items-center mt-6`}>
        <Text style={tw`text-lg font-bold mb-2`}>Weekly Adherence</Text>
        <LineChart
          data={adherenceData}
          width={screenWidth}
          height={220}
          chartConfig={{
            backgroundColor: "#ffffff",
            backgroundGradientFrom: "#ffffff",
            backgroundGradientTo: "#ffffff",
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(20, 184, 166, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: "6",
              strokeWidth: "2",
              stroke: "#14b8a6",
            },
          }}
          bezier
          style={{
            marginVertical: 8,
            borderRadius: 16,
          }}
          yAxisSuffix="%"
          yAxisLabel=""
        />
      </View>

      {/* Exercise History */}
      <View style={tw`mt-6 mb-8`}>
        <Text style={tw`text-lg font-bold mb-2`}>Exercise History</Text>
        {exerciseHistory.map((item, index) => (
          <View
            key={index}
            style={tw`border-2 border-gray-300 rounded-lg p-4 mb-3`}
          >
            <Text style={tw`font-bold`}>{item.date}</Text>
            <Text>{item.completed} exercises completed</Text>
            <Text style={tw`text-teal-500`}>Adherence: {item.adherence}%</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// Component for the Pain Level tab
function PainLevelGraph() {
  const [loading, setLoading] = useState(true);
  const [painData, setPainData] = useState({
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        data: [0, 0, 0, 0, 0, 0, 0],
      },
    ],
  });
  const [averagePain, setAveragePain] = useState(0);
  const [painHistory, setPainHistory] = useState([]);
  const [error, setError] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    // Get the stored token from AsyncStorage or another storage method
    const getToken = async () => {
      try {
        // Replace with your token retrieval method
        const token = await SecureStore.getItemAsync("access_token");

        if (!token) {
          Alert.alert("Login Required", "Please sign in to continue", [
            {
              text: "OK",
              onPress: () => navigation.navigate("login" as never),
            },
          ]);
          return;
        }

        // Fetch pain stats from the API
        const response = await axios.get(`${API_URL}/reports/pain_stats/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.data) {
          setPainData(response.data.chart_data);
          setAveragePain(response.data.average_pain);
          setPainHistory(response.data.history);
          setLoading(false);
        }
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          try {
            // Attempt token refresh
            const refreshToken = await SecureStore.getItemAsync(
              "refresh_token"
            );
            if (!refreshToken) throw new Error("No refresh token available");

            const refreshUrl =
              process.env.API_URL || "http://192.168.68.111:8000";
            const refreshResponse = await axios.post(
              `${refreshUrl}/api/token/refresh/`,
              { refresh: refreshToken }
            );

            // Store new tokens
            const newToken = refreshResponse.data.access;
            const newRefreshToken = refreshResponse.data.refresh;

            await Promise.all([
              SecureStore.setItemAsync("access_token", newToken),
              SecureStore.setItemAsync("refresh_token", newRefreshToken),
            ]);

            // Retry both requests with new token
            const api = axios.create({
              baseURL: process.env.API_URL || "http://192.168.68.111:8000",
              timeout: 10000,
              headers: { Authorization: `Bearer ${newToken}` },
            });

            const response = await axios.get(`${api}/reports/pain_stats/`, {});
            if (response.data) {
              setPainData(response.data.chart_data);
              setAveragePain(response.data.average_pain);
              setPainHistory(response.data.history);
              setLoading(false);
            }
          } catch (refreshError) {
            console.error("Token refresh failed:", refreshError);

            // Clear tokens and redirect
            await Promise.all([
              SecureStore.deleteItemAsync("access_token"),
              SecureStore.deleteItemAsync("refresh_token"),
            ]);

            Alert.alert("Session Expired", "Please login again", [
              {
                text: "OK",
                onPress: () => navigation.navigate("login" as never),
              },
            ]);
          }
        } else {
          // Handle other errors
          console.error("API request failed:", error);
          Alert.alert(
            "Error",
            "Failed to load your exercises. Please check your connection and try again."
          );
        }
      } finally {
        setLoading(false);
      }
    };
    getToken();
  }, []);

  if (loading) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-white`}>
        <ActivityIndicator size="large" color="#14b8a6" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-white px-4`}>
        <Text style={tw`text-red-500 text-lg`}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={tw`flex-1 bg-white px-4`}>
      {/* Average Pain Level Card */}
      <View style={tw`items-center mt-32`}>
        <View style={tw`border-2 border-gray-300 rounded-lg w-full p-4`}>
          <Text style={tw`text-center text-lg font-bold`}>
            Average Pain Level : {averagePain}/10
          </Text>
        </View>
      </View>

      {/* Pain Level Chart */}
      <View style={tw`items-center mt-6`}>
        <Text style={tw`text-lg font-bold mb-2`}>Weekly Pain Levels</Text>
        <BarChart
          data={painData}
          width={screenWidth}
          height={220}
          chartConfig={{
            backgroundColor: "#ffffff",
            backgroundGradientFrom: "#ffffff",
            backgroundGradientTo: "#ffffff",
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(220, 38, 38, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: {
              borderRadius: 16,
            },
          }}
          style={{
            marginVertical: 8,
            borderRadius: 16,
          }}
          yAxisSuffix=""
          yAxisLabel=""
          fromZero
        />
      </View>

      {/* Pain History */}
      <View style={tw`mt-6 mb-8`}>
        <Text style={tw`text-lg font-bold mb-2`}>Pain History</Text>
        {painHistory.map((item, index) => (
          <View
            key={index}
            style={tw`border-2 border-gray-300 rounded-lg p-4 mb-3`}
          >
            <Text style={tw`font-bold`}>{item.date}</Text>
            <Text>{item.exercises} exercises completed</Text>
            <Text style={tw`text-red-500`}>
              Pain Level: {item.painLevel}/10
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// Main Analytics Component
export default function Analytics() {
  const Tab = createMaterialTopTabNavigator();

  return (
    <View style={tw`flex-1 bg-white`}>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: "#14b8a6",
          tabBarStyle: {
            backgroundColor: "#fff",
            borderWidth: 1,
            borderColor: "#eaeaea",
            borderTopWidth: 1,
            height: 70,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            position: "absolute",
            left: 20,
            right: 20,
            shadowColor: "rgba(0, 0, 0, 0.1)",
            shadowOffset: { width: 0, height: -3 },
            shadowRadius: 6,
            shadowOpacity: 0.2,
            marginTop: 40,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "bold",
          },
          tabBarIndicatorStyle: {
            backgroundColor: "#14b8a6",
            height: 3,
            borderRadius: 5,
          },
        }}
      >
        <Tab.Screen
          name="Adherence"
          component={AdherenceGraph}
          options={{
            title: "Adherence",
            tabBarIcon: ({ color }) => (
              <Entypo name="bar-graph" size={24} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Pain Level"
          component={PainLevelGraph}
          options={{
            title: "Pain Level",
            tabBarIcon: ({ color }) => (
              <Ionicons name="heart" size={24} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </View>
  );
}
