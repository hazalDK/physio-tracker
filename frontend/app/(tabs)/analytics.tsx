import { View, Text } from "react-native";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import tw from "tailwind-react-native-classnames";
import { Ionicons } from "@expo/vector-icons";
import Entypo from "@expo/vector-icons/Entypo";

// Create the components for the graphs
function GraphOne() {
  return (
    <View style={tw`flex flex-1 items-center bg-white px-4`}>
      <View
        style={tw`flex items-center border-2 border-gray-300 rounded-lg w-full mt-32 p-4 mx-6`}
      >
        <Text>Average Adherence: {}%</Text>
      </View>
      <Text style={tw`text-lg mt-10`}>Exercise History</Text>
      <View style={tw`flex flex-1 items-center justify-center w-full mt-4`}>
        <View>
          <Text>Monday 1st March</Text>
          <Text>4/4 exercises completed</Text>
        </View>
      </View>
    </View>
  );
}

function GraphTwo() {
  return (
    <View style={tw`flex flex-1 items-center justify-center bg-white`}>
      <Text>Graph Two</Text>
      {/* Your graph rendering code goes here */}
    </View>
  );
}

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
          component={GraphOne}
          options={{
            title: "Adherence",
            tabBarIcon: ({ color }) => (
              <Entypo name="bar-graph" size={24} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Pain Level"
          component={GraphTwo}
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
