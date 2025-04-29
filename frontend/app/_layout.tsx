import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useFonts } from "expo-font";
import { Redirect, Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/useColorScheme";
import { useNavigation } from "@react-navigation/native";
import { RootStackParamsList } from "@/types/navigation";
import { useAuthStore, hydrateAuthStore } from "@/stores/authStore";
import { View } from "react-native";

// Prevent the splash screen from auto-hiding until the app is ready
SplashScreen.preventAutoHideAsync();

/**
 * Root layout component for the app.
 * This component sets up the navigation stack and handles authentication state.
 * It also loads custom fonts and manages the app's theme based on the user's color scheme preference.
 */
export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setIsAuthenticated = useAuthStore((state) => state.setIsAuthenticated);
  const [authChecked, setAuthChecked] = useState(false);

  // Check if the app is loaded and the authentication state is set
  useEffect(() => {
    const checkAuthentication = async () => {
      const token = await SecureStore.getItemAsync("userToken");
      setIsAuthenticated(!!token);
      setAuthChecked(true);
      SplashScreen.hideAsync();
    };
    checkAuthentication();
  }, []);

  useEffect(() => {
    hydrateAuthStore();
  }, []);

  if (!loaded || !authChecked) {
    return null;
  }

  // If the app is loaded and the authentication state is set, render the app's navigation stack
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === "light" ? DarkTheme : DefaultTheme}>
        <Stack initialRouteName={isAuthenticated ? "(tabs)" : "login"}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="signup" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="exercise" options={{ headerShown: false }} />
          <Stack.Screen name="chatbot" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
