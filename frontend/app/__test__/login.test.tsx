import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import renderer from "react-test-renderer";
import { Alert } from "react-native";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import Login from "../login";

// Mock dependencies
jest.mock("axios");
jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(),
}));
jest.mock("expo-router", () => ({
  router: {
    replace: jest.fn(),
  },
}));

jest.mock("@react-navigation/native", () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("react-native/Libraries/Alert/Alert", () => ({
  alert: jest.fn(),
}));
jest.mock("react-native-gesture-handler", () => ({
  TextInput: "TextInput",
  TouchableOpacity: "TouchableOpacity",
}));
jest.mock("tailwind-react-native-classnames", () => ({
  __esModule: true,
  default: () => ({}),
}));

describe("Login Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders correctly with data", () => {
    const tree = renderer.create(<Login />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it("renders correctly", () => {
    const { getByText, getByTestId, getByPlaceholderText } = render(<Login />);

    expect(getByTestId("login-title")).toBeTruthy();
    expect(getByPlaceholderText("Enter username here")).toBeTruthy();
    expect(getByPlaceholderText("****")).toBeTruthy();
    expect(getByText(/Don't have an account\?/)).toBeTruthy();
  });

  it("handles input changes", () => {
    const { getByPlaceholderText } = render(<Login />);

    const usernameInput = getByPlaceholderText("Enter username here");
    const passwordInput = getByPlaceholderText("****");

    fireEvent.changeText(usernameInput, "testuser");
    fireEvent.changeText(passwordInput, "password123");

    expect(usernameInput.props.value).toBe("testuser");
    expect(passwordInput.props.value).toBe("password123");
  });

  it("shows an alert when submitting with empty fields", () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    const { getByTestId } = render(<Login />);

    const loginButton = getByTestId("login-button");
    fireEvent.press(loginButton);

    expect(alertSpy).toHaveBeenCalledWith(
      "Error",
      "Please enter both username and password"
    );
  });

  it("handles successful login", async () => {
    // Mock axios post to return successful response
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
    (axios.post as jest.Mock).mockResolvedValueOnce({
      data: {
        access: "fake-access-token", // Note I changed this to match your component
        refresh: "fake-refresh-token",
      },
    });

    const { getByPlaceholderText, getByTestId } = render(<Login />);

    // Fill out the form
    fireEvent.changeText(
      getByPlaceholderText("Enter username here"),
      "testuser"
    );
    fireEvent.changeText(getByPlaceholderText("****"), "Password123!");

    // Debug log before pressing button
    console.log("About to press login button");

    // Submit the form
    fireEvent.press(getByTestId("login-button"));

    console.log("Login button pressed");

    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log("After delay, checking if SecureStore was called");
    console.log(
      "SecureStore mock calls:",
      (SecureStore.setItemAsync as jest.Mock).mock.calls
    );

    await waitFor(() => {
      // Verify that SecureStore was called to store tokens
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        "access_token",
        "fake-access-token"
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        "refresh_token",
        "fake-refresh-token"
      );

      // Verify that router was called to navigate to home
      expect(router.replace).toHaveBeenCalledWith("/(tabs)");
    });
  });

  it("handles login failure", async () => {
    const alertSpy = jest.spyOn(Alert, "alert");

    // Mock axios post to return an error
    (axios.post as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        data: {
          detail: "Invalid credentials",
        },
      },
    });

    const { getByPlaceholderText, getByTestId } = render(<Login />);

    // Fill out the form
    fireEvent.changeText(
      getByPlaceholderText("Enter username here"),
      "testuser"
    );
    fireEvent.changeText(getByPlaceholderText("****"), "wrongpassword");

    // Submit the form
    fireEvent.press(getByTestId("login-button"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Login Failed",
        "Invalid credentials"
      );
    });
  });

  it("toggles password visibility", () => {
    const { getByPlaceholderText, getByText } = render(<Login />);

    const passwordInput = getByPlaceholderText("****");
    const toggleButton = getByText("🙈");

    // Initially, password should be hidden (secureTextEntry is true)
    expect(passwordInput.props.secureTextEntry).toBe(false);

    // Press toggle button to show password
    fireEvent.press(toggleButton);

    // Now password should be visible (secureTextEntry is false)
    expect(passwordInput.props.secureTextEntry).toBe(true);

    // The toggle button should now show the hide icon
    expect(getByText("👁️")).toBeTruthy();
  });
});
