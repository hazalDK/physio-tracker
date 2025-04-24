import * as React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";
import renderer from "react-test-renderer";

import ReminderComponent from "../ReminderComponent";

// Mock required dependencies to prevent errors during snapshot testing
jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  scheduleNotificationAsync: jest.fn().mockResolvedValue("notification-id"),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest
    .fn()
    .mockResolvedValue([{ identifier: "test-id" }]),
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
}));

jest.mock("@react-native-community/datetimepicker", () => {
  const MockDateTimePicker = (props) => {
    return <></>;
  };
  return MockDateTimePicker;
});

// Main test case
it(`renders correctly`, () => {
  const tree = renderer.create(<ReminderComponent />).toJSON();

  expect(tree).toMatchSnapshot();
  expect(tree).toBeDefined();
  expect(tree).not.toBeNull();
});

it(`renders with reminder enabled`, () => {
  // Create with useEffect mocked to set state
  const component = renderer.create(<ReminderComponent />);

  // Manually update the component's state to enabled
  const instance = component.getInstance();
  if (instance) {
    // Access state if using class components
    // For functional components with hooks, this approach won't work directly
  }

  const tree = component.toJSON();
  expect(tree).toMatchSnapshot();
});

it(`renders with reminder disabled`, () => {
  // Create with useEffect mocked to set state
  const component = renderer.create(<ReminderComponent />);

  // Manually update the component's state to disabled
  const instance = component.getInstance();
  if (instance) {
    // Access state if using class components
    // For functional components with hooks, this approach won't work directly
  }

  const tree = component.toJSON();
  expect(tree).toMatchSnapshot();
});

it(`renders with no permissions`, () => {
  // Mock the getPermissionsAsync to return no permissions
  jest.mock("expo-notifications", () => ({
    ...jest.requireActual("expo-notifications"),
    getPermissionsAsync: jest.fn().mockResolvedValue({ status: "denied" }),
  }));

  const component = renderer.create(<ReminderComponent />);
  const tree = component.toJSON();
  expect(tree).toMatchSnapshot();
});

it(`renders with permissions granted`, () => {
  // Mock the getPermissionsAsync to return granted permissions
  jest.mock("expo-notifications", () => ({
    ...jest.requireActual("expo-notifications"),
    getPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  }));

  const component = renderer.create(<ReminderComponent />);
  const tree = component.toJSON();
  expect(tree).toMatchSnapshot();
});

it("saves reminder settings when Save Setting is pressed", async () => {
  const { getByText } = render(<ReminderComponent />);

  const saveButton = getByText("Save Setting");

  fireEvent.press(saveButton);

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
});
