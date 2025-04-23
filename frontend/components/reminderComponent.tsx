import React, { useEffect, useState } from "react";
import { View, Text, Pressable, Alert, Linking } from "react-native";
import tw from "tailwind-react-native-classnames";
import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Device from "expo-device";
import { Platform } from "react-native";

// Set up notification handler first
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Improved permission request with better error handling
const requestPermissions = async () => {
  if (!Device.isDevice) {
    Alert.alert(
      "Simulator Detected",
      "Push notifications won't work in the simulator. Please test on a physical device."
    );
    return false;
  }

  let { status } = await Notifications.getPermissionsAsync();

  if (status !== "granted") {
    const { status: newStatus } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        provideAppNotificationSettings: true,
        allowCriticalAlerts: true,
      },
    });
    status = newStatus;
  }

  if (status !== "granted") {
    Alert.alert(
      "Permission Required",
      "Please enable notifications in Settings to receive reminders",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Open Settings", onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }

  // Android-specific channel setup with higher priority
  if (Platform.OS === "android") {
    try {
      await Notifications.deleteNotificationChannelAsync("daily-reminder");
      await Notifications.setNotificationChannelAsync("daily-reminder", {
        name: "Daily Reminder",
        importance: Notifications.AndroidImportance.MAX,
        sound: "default",
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
        lockscreenVisibility:
          Notifications.AndroidNotificationVisibility.PUBLIC,
        showBadge: true,
        bypassDnd: true,
      });
    } catch (error) {
      console.error("Error creating notification channel:", error);
    }
  }

  return true;
};

export default function ReminderComponent() {
  const [reminderTime, setReminderTime] = useState(new Date());
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved notification settings
  const loadSettings = async () => {
    try {
      setIsLoading(true);
      // Load reminder enabled state
      const enabledValue = await SecureStore.getItemAsync("reminderEnabled");
      const enabled = enabledValue === "true";

      // Load reminder time
      const timeValue = await SecureStore.getItemAsync("reminderTime");
      let time = new Date();
      if (timeValue) {
        time = new Date(JSON.parse(timeValue));
      }

      console.log("Loaded settings:", {
        enabled,
        time: time.toLocaleTimeString(),
      });

      setReminderEnabled(enabled);
      setReminderTime(time);
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Save notification settings
  const saveSettings = async () => {
    try {
      await SecureStore.setItemAsync(
        "reminderEnabled",
        reminderEnabled.toString()
      );
      await SecureStore.setItemAsync(
        "reminderTime",
        JSON.stringify(reminderTime)
      );

      // Update notification based on current settings
      await toggleReminder(reminderEnabled);

      Alert.alert("Success", "Notification settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      Alert.alert("Error", "Failed to save notification settings.");
    }
  };

  // Schedule notification function with improved logging
  const scheduleReminder = async () => {
    // Triple cancellation to ensure clean slate (Android workaround)
    await Notifications.cancelAllScheduledNotificationsAsync();
    await new Promise((resolve) => setTimeout(resolve, 300));
    await Notifications.cancelAllScheduledNotificationsAsync();

    const triggerTime = new Date(reminderTime);
    console.log(
      `Scheduling for ${triggerTime.getHours()}:${triggerTime.getMinutes()}`
    );

    try {
      // 1. First create the notification channel (Android only)
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("daily-reminder", {
          name: "Daily Reminder",
          importance: Notifications.AndroidImportance.MAX,
          sound: "default",
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
          lockscreenVisibility:
            Notifications.AndroidNotificationVisibility.PUBLIC,
        });
      }

      // 2. Schedule the notification with platform-specific options
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Physiotherapy Reminder",
          body: "It's time to do your physiotherapy exercises!",
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          ...(Platform.OS === "ios"
            ? {
                interruptionLevel: "critical",
                relevanceScore: 1,
              }
            : {}),
        },
        trigger: {
          type: "calendar",
          hour: triggerTime.getHours(),
          minute: triggerTime.getMinutes(),
          repeats: true,
          ...(Platform.OS === "android" ? { channelId: "daily-reminder" } : {}),
        },
      });

      console.log("Scheduled with ID:", identifier);

      // 3. Verify it was actually scheduled
      await new Promise((resolve) => setTimeout(resolve, 500));
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      console.log("Verified scheduled:", scheduled.length);

      if (scheduled.length === 0) {
        throw new Error("System failed to persist notification");
      }

      return true;
    } catch (error) {
      console.error("Scheduling failed:", error);
      return false;
    }
  };

  // Handle toggle of the reminder with proper feedback
  const toggleReminder = async (enabled) => {
    console.log(`Attempting to ${enabled ? "enable" : "disable"} reminder`);

    if (enabled) {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        setReminderEnabled(false);
        return false;
      }

      const success = await scheduleReminder();
      setReminderEnabled(success);
      return success;
    } else {
      try {
        await Notifications.cancelAllScheduledNotificationsAsync();
        console.log("All notifications cancelled");
        setReminderEnabled(false);
        return true;
      } catch (error) {
        console.error("Error cancelling notifications:", error);
        return false;
      }
    }
  };

  // Initialize component
  useEffect(() => {
    const setupComponent = async () => {
      await loadSettings();

      // Add this foreground listener
      const foregroundSubscription =
        Notifications.addNotificationReceivedListener((notification) => {
          console.log("Foreground notification:", notification);
          // You can choose to display it yourself when in foreground
          if (Platform.OS === "android") {
            Notifications.setNotificationChannelAsync("daily-reminder", {
              name: "Daily Reminder",
              importance: Notifications.AndroidImportance.HIGH,
              sound: "default",
            });
          }
        });

      // Also add response listener
      const responseSubscription =
        Notifications.addNotificationResponseReceivedListener((response) => {
          console.log("Notification response:", response);
        });

      return () => {
        foregroundSubscription.remove();
        responseSubscription.remove();
      };
    };

    setupComponent();
  }, []);

  // Apply settings once they're loaded
  useEffect(() => {
    if (!isLoading && reminderEnabled) {
      // Apply saved settings after loading
      toggleReminder(reminderEnabled);
    }
  }, [isLoading]);

  return (
    <View
      style={tw`items-center mt-2 p-4 border-2 border-gray-200 rounded-xl mb-4 w-80`}
    >
      <DateTimePicker
        value={reminderTime}
        mode="time"
        is24Hour={true}
        onChange={(_, selectedTime) => {
          if (selectedTime) {
            console.log("Selected time:", selectedTime.toLocaleTimeString());
            setReminderTime(selectedTime);
          }
        }}
      />

      <Pressable
        onPress={() => toggleReminder(!reminderEnabled)}
        style={({ pressed, hovered }) => [
          tw`flex items-center p-4 rounded-xl mt-4 w-60`,
          {
            backgroundColor: reminderEnabled
              ? hovered
                ? "#dc2626"
                : "#ef4444" // Red for disable
              : hovered
              ? "#0d9488"
              : "#14b8a6", // Teal for enable
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Text style={tw`text-white font-semibold`}>
          {reminderEnabled ? "Disable Reminder" : "Enable Reminder"}
        </Text>
      </Pressable>

      <Pressable
        onPress={saveSettings}
        style={({ pressed, hovered }) => [
          tw`flex items-center p-4 rounded-xl mt-4 w-60`,
          {
            backgroundColor: hovered ? "#0d9488" : "#14b8a6",
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Text style={tw`text-white font-semibold`}>Save Setting</Text>
      </Pressable>
    </View>
  );
}
