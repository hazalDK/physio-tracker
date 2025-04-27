import { Tabs, Redirect, SplashScreen } from "expo-router";
import React, { useEffect, useState } from "react";
import { TabBarIcon } from "@/components/navigation/TabBarIcon";
import * as SecureStore from "expo-secure-store";
import { useAuthStore } from "@/stores/authStore";

export default function TabLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // This is just a safety check in case the root layout check didn't run
    setAuthChecked(true);
  }, []);

  if (!authChecked) {
    return null;
  }

  if (!isAuthenticated) {
    SplashScreen.hideAsync();
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#2db5ae",
        tabBarInactiveTintColor: "gray",
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#eaeaea",
          height: 60,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon
              name={focused ? "home" : "home-outline"}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon
              name={focused ? "analytics" : "analytics-outline"}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon
              name={focused ? "person-circle" : "person-circle-outline"}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon
              name={focused ? "settings" : "settings-outline"}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
