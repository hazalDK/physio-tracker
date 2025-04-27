import React, { useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import tw from "tailwind-react-native-classnames";
import { Ionicons } from "@expo/vector-icons";
import Entypo from "@expo/vector-icons/Entypo";
import { LineChart, BarChart } from "react-native-chart-kit";
import {
  adherenceExerciseHistory,
  painLevelExerciseHistory,
} from "@/types/report";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import ExerciseHistoryDetail from "@/components/ExerciseHistoryDetail";

// Get screen width for responsive charts
const screenWidth = Dimensions.get("window").width - 40;

// Component for the Adherence tab
function AdherenceGraph() {
  const {
    loading,
    chartData,
    average,
    history,
    error,
    weekTitle,
    goToPreviousWeek,
    goToNextWeek,
    refreshData,
  } = useAnalyticsData<adherenceExerciseHistory>(
    "/reports/adherence_stats/",
    "adherence"
  );

  useFocusEffect(
    useCallback(() => {
      refreshData();
    }, [refreshData])
  );

  if (loading) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-white`}>
        <ActivityIndicator
          testID="loading-indicator"
          size="large"
          color="#14b8a6"
        />
      </View>
    );
  }

  if (error) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-white px-4`}>
        <Text testID="adherence-error-message" style={tw`text-red-500 text-lg`}>
          {error}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={tw`flex-1 bg-white px-4`}>
      <View style={tw`flex-row justify-between items-center mt-32 mb-4`}>
        <TouchableOpacity testID="prev-week-button" onPress={goToPreviousWeek}>
          <Ionicons name="chevron-back" size={24} color="#14b8a6" />
        </TouchableOpacity>
        <Text testID="week-title" style={tw`text-lg font-bold`}>
          {weekTitle}
        </Text>
        <TouchableOpacity testID="next-week-button" onPress={goToNextWeek}>
          <Ionicons name="chevron-forward" size={24} color="#14b8a6" />
        </TouchableOpacity>
      </View>

      <View style={tw`items-center mt-4`}>
        <View style={tw`border-2 border-gray-300 rounded-lg w-full p-4`}>
          <Text style={tw`text-center text-lg font-bold`}>
            Average Adherence: {average}%
          </Text>
        </View>
      </View>

      <View style={tw`items-center mt-6`}>
        <Text style={tw`text-lg font-bold mb-2`}>Weekly Adherence</Text>
        <LineChart
          data={chartData}
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

      <View style={tw`mt-6 mb-8`}>
        <Text style={tw`text-lg font-bold mb-2`}>Exercise History</Text>
        {history.map((item, index) => (
          <View
            key={index}
            style={tw`border-2 border-gray-300 rounded-lg p-4 mb-3`}
          >
            <Text
              testID={`adherence-history-date-${index}`}
              style={tw`font-bold`}
            >
              {item.date}
            </Text>
            <Text>{item.completed} active exercises completed</Text>
            <Text style={{ color: "#14b8a6" }}>
              Adherence: {item.adherence}%
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// Component for the Pain Level tab
function PainLevelGraph() {
  const {
    loading,
    chartData,
    average,
    history,
    error,
    weekTitle,
    goToPreviousWeek,
    goToNextWeek,
    refreshData,
  } = useAnalyticsData<painLevelExerciseHistory>(
    "/reports/pain_stats/",
    "pain"
  );

  useFocusEffect(
    useCallback(() => {
      refreshData();
    }, [refreshData])
  );

  if (loading) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-white`}>
        <ActivityIndicator
          testID="pain_level_loading-indicator"
          size="large"
          color="#14b8a6"
        />
      </View>
    );
  }

  if (error) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-white px-4`}>
        <Text testID="pain-error-message" style={tw`text-red-500 text-lg`}>
          {error}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={tw`flex-1 bg-white px-4`}>
      <View style={tw`flex-row justify-between items-center mt-32 mb-4`}>
        <TouchableOpacity
          testID="pain_level_prev_week_button"
          onPress={goToPreviousWeek}
        >
          <Ionicons name="chevron-back" size={24} color="#14b8a6" />
        </TouchableOpacity>
        <Text testID="pain-week-title" style={tw`text-lg font-bold`}>
          {weekTitle}
        </Text>
        <TouchableOpacity
          testID="pain_level_next_week_button"
          onPress={goToNextWeek}
        >
          <Ionicons name="chevron-forward" size={24} color="#14b8a6" />
        </TouchableOpacity>
      </View>

      <View style={tw`items-center mt-4`}>
        <View style={tw`border-2 border-gray-300 rounded-lg w-full p-4`}>
          <Text style={tw`text-center text-lg font-bold`}>
            Average Pain Level: {average}/10
          </Text>
        </View>
      </View>

      <View style={tw`mt-6`}>
        <Text style={tw`text-lg text-center font-bold mb-2`}>
          Weekly Pain Levels
        </Text>
        <BarChart
          data={chartData}
          width={screenWidth}
          height={220}
          withHorizontalLabels={true}
          fromZero
          yAxisSuffix=""
          yAxisLabel=""
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
            propsForLabels: {
              dx: -5, // Adjust label positioning if needed
            },
          }}
          style={{
            marginLeft: -10, // Negative margin to pull chart left
            marginRight: 10, // Compensate for the negative left margin
            borderRadius: 16,
          }}
        />
      </View>

      <View style={tw`mt-6 mb-8`}>
        <Text style={tw`text-lg font-bold mb-2`}>Pain History</Text>
        {history.map((item, index) => (
          <View
            key={index}
            style={tw`border-2 border-gray-300 rounded-lg p-4 mb-3`}
          >
            <Text testID={`pain-history-date-${index}`} style={tw`font-bold`}>
              {item.date}
            </Text>
            <Text>{item.exercises} exercises completed</Text>
            <Text style={tw`text-red-500`}>
              Pain Level: {item.pain_level}/10
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
        <Tab.Screen
          name="History"
          component={ExerciseHistoryDetail}
          options={{
            title: "Exercise Log",
            tabBarIcon: ({ color }) => (
              <Ionicons name="list" size={24} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </View>
  );
}
