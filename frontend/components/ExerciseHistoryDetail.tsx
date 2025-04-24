import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import tw from "tailwind-react-native-classnames";
import { useExerciseHistory } from "@/hooks/useExerciseHistory";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";

// Component to show detailed exercise history
export default function ExerciseHistoryDetail() {
  const { loading, history, error, refreshHistory } = useExerciseHistory();
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Function to toggle expanded view for a date
  const toggleExpand = (date: string) => {
    if (expandedDate === date) {
      setExpandedDate(null);
    } else {
      setExpandedDate(date);
    }
  };

  // Refresh data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshHistory();
      return () => {
        // Cleanup if needed
      };
    }, [])
  );

  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshHistory();
    setRefreshing(false);
  }, [refreshHistory]);

  // Loading state
  if (loading && !refreshing) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-white`}>
        <ActivityIndicator size="large" color="#14b8a6" />
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-white px-4`}>
        <Text style={tw`text-red-500 text-lg`}>{error}</Text>
        <TouchableOpacity
          style={tw`mt-4 bg-teal-500 py-2 px-4 rounded`}
          onPress={refreshHistory}
        >
          <Text style={tw`text-white`}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Empty state
  if (history.length === 0) {
    return (
      <ScrollView
        style={tw`flex-1 bg-white px-4 pt-2`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={tw`flex-1 items-center justify-center h-full py-20`}>
          <Text style={tw`text-gray-500 text-lg text-center`}>
            No exercise history found. Complete some exercises to see your
            history here.
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={tw`flex-1 bg-white px-4 pt-2`}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={tw`text-xl mt-32 font-bold mb-4`}>Exercise History</Text>

      {history.map((item) => (
        <View
          key={item.date}
          style={tw`border-2 border-gray-200 rounded-lg p-4 mb-3`}
        >
          <TouchableOpacity
            style={tw`flex-row justify-between items-center`}
            onPress={() => toggleExpand(item.date)}
          >
            <View>
              <Text style={tw`font-bold text-lg`}>{item.formatted_date}</Text>
              <Text style={tw`text-gray-500`}>
                {item.exercises.length} exercise
                {item.exercises.length !== 1 ? "s" : ""} reported
              </Text>
              <Text style={tw`text-red-500`}>
                Overall Pain: {item.pain_level}/10
              </Text>
            </View>
            <Ionicons
              name={expandedDate === item.date ? "chevron-up" : "chevron-down"}
              size={24}
              color="#14b8a6"
            />
          </TouchableOpacity>

          {expandedDate === item.date && (
            <View style={tw`mt-3 pt-3 border-t border-gray-200`}>
              {item.exercises.map((exercise, exIndex) => (
                <View
                  key={`${item.date}-${exIndex}`}
                  style={tw`mb-3 pb-3 ${
                    exIndex < item.exercises.length - 1
                      ? "border-b border-gray-200"
                      : ""
                  }`}
                >
                  <Text style={tw`font-bold`}>{exercise.name}</Text>
                  <View style={tw`flex-row justify-between mt-1`}>
                    <Text>Sets: {exercise.sets}</Text>
                    <Text>Reps: {exercise.reps}</Text>
                    <Text
                      style={tw`${
                        exercise.pain > 3 ? "text-red-500" : "text-gray-600"
                      }`}
                    >
                      Pain: {exercise.pain}/10
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}
