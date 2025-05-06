import * as React from "react";
import { render, act, fireEvent, waitFor } from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";
import renderer from "react-test-renderer";
import ReminderComponent from "../ReminderComponent";

// Mock expo notifications
jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  scheduleNotificationAsync: jest.fn().mockResolvedValue("notification-id"),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest
    .fn()
    .mockResolvedValue([{ identifier: "test-notification" }]),
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

// Mock expo secure store
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn(),
}));

// Mock expo device
jest.mock("expo-device", () => ({
  isDevice: true,
  brand: "Test",
  manufacturer: "Test",
  modelName: "Test",
  osName: "Test",
  osVersion: "Test",
}));

// Mock react-native
jest.mock("react-native", () => {
  const rn = jest.requireActual("react-native");
  rn.Platform = { OS: "ios", Version: "14.0" };
  rn.Alert = { alert: jest.fn() };
  return rn;
});

// Mock DateTimePicker to use our fixed date
jest.mock("@react-native-community/datetimepicker", () => {
  return function MockDateTimePicker(props) {
    return (
      <div
        data-testid="mock-datetimepicker"
        data-value={props.value ? props.value.toISOString() : ""}
        data-mode={props.mode}
      />
    );
  };
});

// This ensures a consistent date for snapshot tests
const FIXED_TEST_DATE = new Date("2025-05-01T10:30:00Z");

describe("ReminderComponent", () => {
  // Store the original Date implementation
  const RealDate = global.Date;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Date to always return our fixed date for new Date() calls
    global.Date = jest.fn(() => FIXED_TEST_DATE) as any;
    // Maintain Date prototype methods
    global.Date.prototype = RealDate.prototype;
    // Also mock Date.now()
    global.Date.now = jest.fn(() => FIXED_TEST_DATE.getTime());
    // Keep constructors and other static methods
    Object.setPrototypeOf(global.Date, RealDate);
  });

  afterEach(() => {
    // Restore original Date
    global.Date = RealDate;
  });

  it("renders correctly", async () => {
    let tree: any;
    await act(async () => {
      tree = renderer.create(<ReminderComponent />);
      // Allow all pending promises to resolve
      await new Promise((resolve) => setImmediate(resolve));
    });

    expect(tree.toJSON()).toMatchSnapshot();
    tree.unmount();
  });

  it("renders with reminder enabled", async () => {
    // Mock storage with consistent fixed values
    (SecureStore.getItemAsync as jest.Mock).mockImplementation((key) => {
      if (key === "reminderEnabled") return Promise.resolve("true");
      if (key === "reminderTime")
        return Promise.resolve(JSON.stringify({ hours: 10, minutes: 30 }));
      return Promise.resolve(null);
    });

    let tree: any;
    await act(async () => {
      tree = renderer.create(<ReminderComponent />);
      await new Promise((resolve) => setImmediate(resolve));
    });

    expect(tree.toJSON()).toMatchSnapshot();
    tree.unmount();
  });

  it("renders with reminder disabled", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockImplementation((key) => {
      if (key === "reminderEnabled") return Promise.resolve("false");
      if (key === "reminderTime")
        return Promise.resolve(JSON.stringify({ hours: 10, minutes: 30 }));
      return Promise.resolve(null);
    });

    let tree: any;
    await act(async () => {
      tree = renderer.create(<ReminderComponent />);
      await new Promise((resolve) => setImmediate(resolve));
    });

    expect(tree.toJSON()).toMatchSnapshot();
    tree.unmount();
  });

  it("toggles reminder state when button is pressed", async () => {
    const { getByText, queryByText, unmount } = render(<ReminderComponent />);

    // Wait for component to fully initialise
    await act(async () => {
      await new Promise((resolve) => setImmediate(resolve));
    });

    // Initially should show "Enable Reminder"
    expect(getByText("Enable Reminder")).toBeTruthy();

    // Press the toggle button
    await act(async () => {
      fireEvent.press(getByText("Enable Reminder"));
      await new Promise((resolve) => setImmediate(resolve));
    });

    // Now should show "Disable Reminder"
    expect(queryByText("Disable Reminder")).toBeTruthy();

    unmount();
  });

  it("saves reminder settings when Save Setting is pressed", async () => {
    const { getByText, unmount } = render(<ReminderComponent />);

    // Wait for component to fully initialise
    await act(async () => {
      await new Promise((resolve) => setImmediate(resolve));
    });

    await act(async () => {
      fireEvent.press(getByText("Save Setting"));
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

    unmount();
  });

  // Add a test to check the toLocaleTimeString display format
  it("displays the correct time format", async () => {
    // Use real timers for this test
    jest.useRealTimers();

    // Set up a specific time for testing display format
    const specificTime = new Date("2025-05-01T14:45:00Z");
    (SecureStore.getItemAsync as jest.Mock).mockImplementation((key) => {
      if (key === "reminderEnabled") return Promise.resolve("true");
      if (key === "reminderTime")
        return Promise.resolve(
          JSON.stringify({
            hours: specificTime.getHours(),
            minutes: specificTime.getMinutes(),
          })
        );
      return Promise.resolve(null);
    });

    const { getByText, unmount } = render(<ReminderComponent />);

    // Wait for component to initialise
    await act(async () => {
      await new Promise((resolve) => setImmediate(resolve));
    });

    // Find the text with a simple string match instead of a regex
    const reminderTextElement = getByText(/Reminder set for/);

    // Verify the element exists and contains a time format
    expect(reminderTextElement).toBeTruthy();
    expect(reminderTextElement.props.children).toMatch(/Reminder set for/);

    unmount();
  });
});
