import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import renderer from "react-test-renderer";
import { NavigationContainer } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";

// Import Login component
import Login from "../login";

// Mock the router
jest.mock("expo-router", () => ({
  router: {
    replace: jest.fn(),
  },
}));

// mock SecureStore with both methods
jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
}));

// Mock existing useAuth hook
jest.mock("@/hooks/useAuth", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    login: jest.fn(),
    setIsAuthenticated: jest.fn(),
    isAuthenticated: false,
  })),
}));

// Mock axios
jest.mock("axios", () => ({
  post: jest.fn(),
  isAxiosError: jest.fn(() => true),
}));

// Creates a wrapper component with NavigationContainer
const LoginWithNavigation = () => (
  <NavigationContainer>
    <Login />
  </NavigationContainer>
);

describe("Login Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders correctly with data", async () => {
    let tree: any;
    await act(async () => {
      tree = renderer.create(<LoginWithNavigation />);
    });

    // Allow any pending state updates and async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Then call toJSON() outside of act
    const treeJSON = tree.toJSON();
    expect(treeJSON).not.toBeNull();
    expect(treeJSON).toMatchSnapshot();
  });

  it("renders correctly", () => {
    const { getByTestId, getByPlaceholderText } = render(
      <LoginWithNavigation />
    );

    expect(getByTestId("login-title")).toBeTruthy();
    expect(getByPlaceholderText("Enter username here")).toBeTruthy();
    expect(getByPlaceholderText("****")).toBeTruthy();
    expect(getByTestId("login-button")).toBeTruthy();
  });

  it("handles input changes", () => {
    const { getByPlaceholderText } = render(<LoginWithNavigation />);

    const usernameInput = getByPlaceholderText("Enter username here");
    const passwordInput = getByPlaceholderText("****");

    fireEvent.changeText(usernameInput, "testuser");
    fireEvent.changeText(passwordInput, "password123");

    expect(usernameInput.props.value).toBe("testuser");
    expect(passwordInput.props.value).toBe("password123");
  });

  it("shows an alert when submitting with empty fields", () => {
    const { getByTestId } = render(<LoginWithNavigation />);
    const alertSpy = jest.spyOn(Alert, "alert");

    const loginButton = getByTestId("login-button");
    fireEvent.press(loginButton);

    expect(alertSpy).toHaveBeenCalledWith(
      "Error",
      "Please enter both username and password"
    );
  });

  it("handles successful login", async () => {
    const axios = require("axios");
    const router = require("expo-router").router;

    // Mock axios successful response
    axios.post.mockResolvedValueOnce({
      data: {
        access: "fake-access-token",
        refresh: "fake-refresh-token",
      },
    });

    const { getByPlaceholderText, getByTestId } = render(
      <LoginWithNavigation />
    );

    // Fill out the form
    fireEvent.changeText(
      getByPlaceholderText("Enter username here"),
      "testuser"
    );
    fireEvent.changeText(getByPlaceholderText("****"), "password123");

    // Submit the form
    fireEvent.press(getByTestId("login-button"));

    // Wait for the async login process
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "http://localhost:8000/api/token/",
        { username: "testuser", password: "password123" },
        expect.any(Object)
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        "access_token",
        "fake-access-token"
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        "refresh_token",
        "fake-refresh-token"
      );
      expect(router.replace).toHaveBeenCalledWith("/(tabs)");
    });
  });

  it("handles login failure", async () => {
    const axios = require("axios");
    const router = require("expo-router").router;

    // Mock axios rejected response
    axios.post.mockRejectedValueOnce({
      response: {
        data: {
          detail: "Invalid credentials",
        },
      },
    });

    const { getByPlaceholderText, getByTestId } = render(
      <LoginWithNavigation />
    );

    // Fill out the form
    fireEvent.changeText(
      getByPlaceholderText("Enter username here"),
      "wronguser"
    );
    fireEvent.changeText(getByPlaceholderText("****"), "wrongpass");

    const alertSpy = jest.spyOn(Alert, "alert");

    // Submit the form
    fireEvent.press(getByTestId("login-button"));

    // Wait for the async login process
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "http://localhost:8000/api/token/",
        { username: "wronguser", password: "wrongpass" },
        expect.any(Object)
      );
      expect(alertSpy).toHaveBeenCalledWith(
        "Login Failed",
        "Invalid credentials"
      );
      expect(router.replace).not.toHaveBeenCalled();
    });
  });

  it("toggles password visibility", () => {
    const { getByPlaceholderText, getByTestId, getByText } = render(
      <LoginWithNavigation />
    );

    const passwordInput = getByPlaceholderText("****");
    const toggleButton = getByTestId("secure-password");

    // Check initial state - Update this based on your actual implementation
    // It seems in your component, secureTextEntry might start as false
    expect(passwordInput.props.secureTextEntry).toBe(false);

    // Toggle visibility
    fireEvent.press(toggleButton);

    // Now secureTextEntry should be true
    expect(passwordInput.props.secureTextEntry).toBe(true);

    // Toggle again
    fireEvent.press(toggleButton);

    // Back to original state
    expect(passwordInput.props.secureTextEntry).toBe(false);
    expect(getByText("🙈")).toBeTruthy();
  });
});
