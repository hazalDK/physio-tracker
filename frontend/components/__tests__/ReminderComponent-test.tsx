import * as React from "react";
import { render, act, fireEvent, waitFor } from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";
import renderer from "react-test-renderer";
import ReminderComponent from "../ReminderComponent";

// Mock dependencies
jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  scheduleNotificationAsync: jest.fn().mockResolvedValue("notification-id"),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
  setNotificationChannelAsync: jest.fn(),
  addNotificationReceivedListener: jest
    .fn()
    .mockReturnValue({ remove: jest.fn() }),
  addNotificationResponseReceivedListener: jest
    .fn()
    .mockReturnValue({ remove: jest.fn() }),
  AndroidImportance: { MAX: 5, HIGH: 4 },
  AndroidNotificationPriority: { MAX: 5 },
  AndroidNotificationVisibility: { PUBLIC: 1 },
}));

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn(),
}));

jest.mock("expo-device", () => ({
  isDevice: true,
  brand: "Test",
  manufacturer: "Test",
  modelName: "Test",
  osName: "Test",
  osVersion: "Test",
}));

jest.mock("react-native", () => {
  const rn = jest.requireActual("react-native");
  rn.Platform = { OS: "ios", Version: "14.0" };
  return rn;
});

jest.mock("@react-native-community/datetimepicker", () => "DateTimePicker");

// Mock the current date
const mockDate = new Date(2025, 4, 3, 10, 30, 0); // May 3, 2025, 10:30:00
const originalDate = global.Date;
jest.spyOn(global, "Date").mockImplementation((args) => {
  return args ? new originalDate(args) : mockDate;
});

describe("ReminderComponent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers(); // Use real timers as a base
  });

  afterEach(() => {
    // Clean up timers
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("renders correctly", async () => {
    let tree: any;
    await act(async () => {
      tree = renderer.create(<ReminderComponent />);
      // Allow all pending promises to resolve
      await new Promise((resolve) => setImmediate(resolve));
    });

    expect(tree.toJSON()).toMatchSnapshot();
    // Clean up the renderer
    tree.unmount();
  });

  it("renders with reminder enabled", async () => {
    (SecureStore.getItemAsync as jest.Mock)
      .mockResolvedValueOnce("true") // reminderEnabled
      .mockResolvedValueOnce(JSON.stringify({ hours: 10, minutes: 30 })); // reminderTime

    let tree: any;
    await act(async () => {
      tree = renderer.create(<ReminderComponent />);
      await new Promise((resolve) => setImmediate(resolve));
    });

    expect(tree.toJSON()).toMatchSnapshot();
    tree.unmount();
  });

  it("renders with reminder disabled", async () => {
    (SecureStore.getItemAsync as jest.Mock)
      .mockResolvedValueOnce("false") // reminderEnabled
      .mockResolvedValueOnce(JSON.stringify({ hours: 10, minutes: 30 })); // reminderTime

    let tree: any;
    await act(async () => {
      tree = renderer.create(<ReminderComponent />);
      await new Promise((resolve) => setImmediate(resolve));
    });

    expect(tree.toJSON()).toMatchSnapshot();
    tree.unmount();
  });

  it("renders with no permissions", async () => {
    const notifications = require("expo-notifications");
    notifications.getPermissionsAsync.mockResolvedValue({ status: "denied" });
    notifications.requestPermissionsAsync.mockResolvedValue({
      status: "denied",
    });

    let tree: any;
    await act(async () => {
      tree = renderer.create(<ReminderComponent />);
      await new Promise((resolve) => setImmediate(resolve));
    });

    expect(tree.toJSON()).toMatchSnapshot();
    tree.unmount();
  });

  it("renders with permissions granted", async () => {
    const notifications = require("expo-notifications");
    notifications.getPermissionsAsync.mockResolvedValue({ status: "granted" });
    notifications.requestPermissionsAsync.mockResolvedValue({
      status: "granted",
    });

    let tree: any;
    await act(async () => {
      tree = renderer.create(<ReminderComponent />);
      await new Promise((resolve) => setImmediate(resolve));
    });

    expect(tree.toJSON()).toMatchSnapshot();
    tree.unmount();
  });

  it("saves reminder settings when Save Setting is pressed", async () => {
    const { getByText, unmount } = render(<ReminderComponent />);

    // Wait for component to fully initialize
    await act(async () => {
      await new Promise((resolve) => setImmediate(resolve));
    });

    await act(async () => {
      fireEvent.press(getByText("Save Setting"));
      // Allow all pending promises to resolve
      await new Promise((resolve) => setImmediate(resolve));
    });

    await waitFor(() => {
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        "reminderEnabled",
        expect.any(String)
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        "reminderTime",
        expect.any(String)
      );
    });

    // Clean up rendered component
    unmount();
  });
});
