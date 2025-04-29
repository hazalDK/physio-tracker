import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import renderer from "react-test-renderer";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import Signup from "../signup";
import { useInjuryData } from "@/hooks/useInjuryData";

// Mock dependencies
jest.mock("axios");
jest.mock("expo-secure-store");
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
}));
jest.mock("react-native-element-dropdown", () => ({
  Dropdown: "Dropdown",
}));
jest.mock("@react-native-community/datetimepicker", () => "DateTimePicker");
jest.mock("tailwind-react-native-classnames", () => ({
  __esModule: true,
  default: () => ({}),
}));
jest.mock("@/hooks/useInjuryData", () => ({
  useInjuryData: jest.fn(),
}));

describe("Signup Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock the useInjuryData hook
    (useInjuryData as jest.Mock).mockReturnValue({
      injuryTypes: [
        { id: 1, name: "Fracture" },
        { id: 2, name: "Sprain" },
      ],
      loading: false,
    });
  });

  it("renders correctly with data", () => {
    const tree = renderer.create(<Signup />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it("renders correctly", () => {
    const { getByText, getByPlaceholderText } = render(<Signup />);

    expect(getByText("Registration")).toBeTruthy();
    expect(getByPlaceholderText("Enter first name here")).toBeTruthy();
    expect(getByPlaceholderText("Enter last name here")).toBeTruthy();
    expect(getByPlaceholderText("Enter username here")).toBeTruthy();
    expect(getByPlaceholderText("example@gmail.com")).toBeTruthy();
  });

  it("handles input changes", () => {
    const { getByPlaceholderText } = render(<Signup />);

    const firstNameInput = getByPlaceholderText("Enter first name here");
    const lastNameInput = getByPlaceholderText("Enter last name here");
    const usernameInput = getByPlaceholderText("Enter username here");
    const emailInput = getByPlaceholderText("example@gmail.com");

    fireEvent.changeText(firstNameInput, "John");
    fireEvent.changeText(lastNameInput, "Doe");
    fireEvent.changeText(usernameInput, "johndoe");
    fireEvent.changeText(emailInput, "john@example.com");

    expect(firstNameInput.props.value).toBe("John");
    expect(lastNameInput.props.value).toBe("Doe");
    expect(usernameInput.props.value).toBe("johndoe");
    expect(emailInput.props.value).toBe("john@example.com");
  });

  it("validates email format", () => {
    const { getByPlaceholderText } = render(<Signup />);

    const emailInput = getByPlaceholderText("example@gmail.com");

    // Invalid email
    fireEvent.changeText(emailInput, "invalid-email");

    // Valid email
    fireEvent.changeText(emailInput, "valid@example.com");
  });

  it("validates password requirements", () => {
    const { getByTestId } = render(<Signup />);

    const passwordInputs = getByTestId("password-input");

    // Invalid password (too short)
    fireEvent.changeText(passwordInputs, "short");

    // Valid password
    fireEvent.changeText(passwordInputs, "ValidP@ss1!");
  });

  it("shows an alert when passwords do not match", async () => {
    const alertSpy = jest.spyOn(Alert, "alert");

    const { getByPlaceholderText, getByText, getByTestId } = render(<Signup />);

    // Fill all required fields
    fireEvent.changeText(getByPlaceholderText("Enter first name here"), "John");
    fireEvent.changeText(getByPlaceholderText("Enter last name here"), "Doe");
    fireEvent.changeText(
      getByPlaceholderText("Enter username here"),
      "johndoe"
    );
    fireEvent.changeText(
      getByPlaceholderText("example@gmail.com"),
      "john@example.com"
    );

    // Set different passwords
    const passwordInputs = getByTestId("password-input");
    fireEvent.changeText(passwordInputs, "Password1!");

    // Find the other password input and set a different value
    const confirmPasswordInput = getByTestId("confirm-password-input");
    fireEvent.changeText(confirmPasswordInput, "DifferentPass1!");

    // Submit the form
    fireEvent.press(getByText("Sign Up"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Error", "Passwords do not match");
    });
  });

  it("handles successful registration", async () => {
    // Mock axios post to return successful response
    (axios.post as jest.Mock).mockResolvedValueOnce({
      data: {
        access: "fake-access-token",
        refresh: "fake-refresh-token",
      },
    });

    const { getByPlaceholderText, getByText, getByTestId } = render(<Signup />);

    // Fill out the form with valid data
    fireEvent.changeText(getByPlaceholderText("Enter first name here"), "John");
    fireEvent.changeText(getByPlaceholderText("Enter last name here"), "Doe");
    fireEvent.changeText(
      getByPlaceholderText("Enter username here"),
      "johndoe"
    );
    fireEvent.changeText(
      getByPlaceholderText("example@gmail.com"),
      "john@example.com"
    );

    // Set matching passwords
    const passwordInputs = getByTestId("password-input");
    fireEvent.changeText(passwordInputs, "Password1!");

    // Find the confirm password input
    const confirmPasswordInput = getByTestId("confirm-password-input");
    fireEvent.changeText(confirmPasswordInput, "Password1!");

    // Submit the form
    fireEvent.press(getByText("Sign Up"));

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

  it("handles registration failure with server errors", async () => {
    const alertSpy = jest.spyOn(Alert, "alert");

    // Mock axios post to return an error with field errors
    (axios.post as jest.Mock).mockRejectedValueOnce({
      response: {
        data: {
          username: ["This username is already taken."],
        },
      },
    });

    const { getByPlaceholderText, getByText, getByTestId } = render(<Signup />);

    // Fill out the form with valid data
    fireEvent.changeText(getByPlaceholderText("Enter first name here"), "John");
    fireEvent.changeText(getByPlaceholderText("Enter last name here"), "Doe");
    fireEvent.changeText(
      getByPlaceholderText("Enter username here"),
      "johndoe"
    );
    fireEvent.changeText(
      getByPlaceholderText("example@gmail.com"),
      "john@example.com"
    );

    // Set matching passwords
    const passwordInputs = getByTestId("password-input");
    fireEvent.changeText(passwordInputs, "Password1!");

    // Find the confirm password input
    const confirmPasswordInput = getByTestId("confirm-password-input");
    fireEvent.changeText(confirmPasswordInput, "Password1!");

    // Submit the form
    fireEvent.press(getByText("Sign Up"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Registration Failed",
        "Username: This username is already taken."
      );
    });
  });

  it("toggles password visibility", () => {
    const { getByTestId } = render(<Signup />);

    const passwordInput = getByTestId("password-input");
    const toggleButton = getByTestId("secure-password");

    // Initially, password should be hidden (secureTextEntry is true)
    expect(passwordInput.props.secureTextEntry).toBe(true);

    // Press toggle button to show password
    fireEvent.press(toggleButton);

    // Now password should be visible (secureTextEntry is false)
    expect(passwordInput.props.secureTextEntry).toBe(false);

    // The toggle button should now show the hide icon
    expect(getByTestId("secure-password").props.children).toBe("🙈");
  });
});
