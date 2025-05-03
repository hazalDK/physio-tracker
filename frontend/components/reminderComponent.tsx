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
  handleNotification: async () => {
    return {
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
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

  try {
    let { status } = await Notifications.getPermissionsAsync();

    if (status !== "granted") {
      const { status: newStatus } = await Notifications.requestPermissionsAsync(
        {
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            provideAppNotificationSettings: true,
            allowCriticalAlerts: true,
          },
        }
      );
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
  } catch (error) {
    console.error("Error requesting permissions:", error);
    return false;
  }
};

export default function ReminderComponent() {
  const [reminderTime, setReminderTime] = useState(new Date());
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved notification settings with improved time handling
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
        // Parse the saved time - now could be either the old format (full date) or new format (hours/minutes object)
        const parsedValue = JSON.parse(timeValue);

        // Create a new date object using local hour/minute components
        const localTime = new Date();

        // Handle both the new format (hours/minutes object) and legacy format (full date string)
        if (
          typeof parsedValue === "object" &&
          parsedValue !== null &&
          "hours" in parsedValue
        ) {
          // New format - just use the hours and minutes directly
          localTime.setHours(parsedValue.hours);
          localTime.setMinutes(parsedValue.minutes);
        } else {
          // Legacy format - parse as date
          const parsedTime = new Date(parsedValue);
          localTime.setHours(parsedTime.getHours());
          localTime.setMinutes(parsedTime.getMinutes());
        }

        localTime.setSeconds(0);
        time = localTime;
      } else {
        console.log("No saved time found, using default");
      }

      setReminderEnabled(enabled);
      setReminderTime(time);
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Save notification settings with improved time handling
  const saveSettings = async () => {
    // Create a time object with only the hour and minute information to avoid timezone issues
    const timeToSave = {
      hours: reminderTime.getHours(),
      minutes: reminderTime.getMinutes(),
    };

    try {
      await SecureStore.setItemAsync(
        "reminderEnabled",
        reminderEnabled.toString()
      );

      // Save only the hour and minute information to avoid timezone issues
      await SecureStore.setItemAsync(
        "reminderTime",
        JSON.stringify(timeToSave)
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
    await new Promise((resolve) => setTimeout(resolve, 300));
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Debug timezone information
    const now = new Date();
    const tzOffset = now.getTimezoneOffset();

    const triggerTime = new Date(reminderTime);

    try {
      // Create the notification channel (Android only)
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

      // Fix for the one-hour ahead issue
      // Use direct hour and minute values, ensuring we're using local time values
      // not subject to any automatic timezone conversions
      const localHour = triggerTime.getHours();
      const localMinute = triggerTime.getMinutes();

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
          hour: localHour,
          minute: localMinute,
          repeats: true,
          ...(Platform.OS === "android" ? { channelId: "daily-reminder" } : {}),
        },
      });

      // Verifies it was actually scheduled
      await new Promise((resolve) => setTimeout(resolve, 500));
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();

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
  const toggleReminder = async (enabled: boolean) => {
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

        // Verify cancellation
        const remaining =
          await Notifications.getAllScheduledNotificationsAsync();

        setReminderEnabled(false);
        return true;
      } catch (error) {
        console.error("Error cancelling notifications:", error);
        return false;
      }
    }
  };

  // Load settings on component mount and set up listeners
  useEffect(() => {
    const setupComponent = async () => {
      await loadSettings();

      // Foreground listener for when the notification is received
      const foregroundSubscription =
        Notifications.addNotificationReceivedListener((notification) => {
          if (Platform.OS === "android") {
            Notifications.setNotificationChannelAsync("daily-reminder", {
              name: "Daily Reminder",
              importance: Notifications.AndroidImportance.HIGH,
              sound: "default",
            });
          }
        });

      const responseSubscription =
        Notifications.addNotificationResponseReceivedListener((response) => {});

      return () => {
        foregroundSubscription.remove();
        responseSubscription.remove();
      };
    };

    setupComponent();
  }, []);

  // Applies settings once they're loaded
  useEffect(() => {
    if (!isLoading && reminderEnabled) {
      toggleReminder(reminderEnabled);
    }
  }, [isLoading]);

  // Check Expo API versions - this might help identify compatibility issues
  useEffect(() => {
    const checkVersions = async () => {
      try {
        // const notificationsVersion = Notifications.getExperienceVersionAsync
        //   ? await Notifications.getExperienceVersionAsync()
        //   : "API not available";

        const deviceInfo = {
          brand: Device.brand,
          manufacturer: Device.manufacturer,
          modelName: Device.modelName,
          osName: Device.osName,
          osVersion: Device.osVersion,
          platform: Platform.OS,
          platformApiLevel: Platform.Version,
        };

        // Check if SecureStore is working
        await SecureStore.setItemAsync("test-key", "test-value");
      } catch (error) {
        console.error("Debug", "Error checking versions", error);
      }
    };

    checkVersions();
  }, []);

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
            setReminderTime(selectedTime);
          }
        }}
      />

      <Pressable
        onPress={() => {
          toggleReminder(!reminderEnabled);
        }}
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
        onPress={() => {
          saveSettings();
        }}
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

      <Text style={tw`text-xs text-gray-500 mt-4`}>
        {reminderEnabled
          ? `Reminder set for ${reminderTime.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}`
          : "No reminder set"}
      </Text>
    </View>
  );
}
