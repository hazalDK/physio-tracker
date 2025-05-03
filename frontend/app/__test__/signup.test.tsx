import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import renderer from "react-test-renderer";
import axios from "axios";
import { NavigationContainer } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import Signup from "../signup";
import { useInjuryData } from "@/hooks/useInjuryData";
import { useAuthStore } from "@/stores/authStore";

// Mock dependencies
jest.mock("axios");
jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("expo-router", () => ({
  router: {
    replace: jest.fn(),
  },
}));
jest.mock("@react-navigation/native", () => ({
  Link: ({ children }) => children,
  NavigationContainer: ({ children }) => children,
}));
jest.mock("react-native", () => {
  const RN = jest.requireActual("react-native");
  RN.Alert.alert = jest.fn();
  return RN;
});
jest.mock("react-native-gesture-handler", () => ({
  TextInput: "TextInput",
  TouchableOpacity: "TouchableOpacity",
  ScrollView: "ScrollView",
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
jest.mock("@/stores/authStore", () => ({
  useAuthStore: jest.fn(),
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }) => children,
}));

// Use the actual Signup component instead of mocking it
jest.unmock("../signup");

// Create a wrapper component with NavigationContainer
const SignupWithNavigation = (props) => (
  <NavigationContainer>
    <Signup {...props} />
  </NavigationContainer>
);

describe("Signup Component", () => {
  const mockSetIsAuthenticated = jest.fn();
  let alertMock: jest.SpyInstance;
  const mockSetInjuryType = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    alertMock = jest.spyOn(Alert, "alert");

    // Mock the useInjuryData hook
    (useInjuryData as jest.Mock).mockReturnValue({
      injuryTypes: [
        { id: 1, name: "Fracture" },
        { id: 2, name: "Sprain" },
      ],
      loading: false,
    });

    // Mock the authStore
    (useAuthStore as unknown as jest.Mock).mockImplementation((callback) => {
      return callback({ setIsAuthenticated: mockSetIsAuthenticated });
    });

    // Set default environment variable
    process.env.API_URL = "http://test-api.com";

    // Mock console.error to suppress expected error logs
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders correctly with data", () => {
    const tree = renderer.create(<SignupWithNavigation />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it("renders all form fields correctly", () => {
    const { getByText, getByPlaceholderText } = render(
      <SignupWithNavigation
        testInjuryType={undefined}
        setInjuryTypeForTest={undefined}
      />
    );

    expect(getByText("Registration")).toBeTruthy();
    expect(getByPlaceholderText("Enter first name here")).toBeTruthy();
    expect(getByPlaceholderText("Enter last name here")).toBeTruthy();
    expect(getByPlaceholderText("Enter username here")).toBeTruthy();
    expect(getByPlaceholderText("example@gmail.com")).toBeTruthy();
    expect(getByText("Date of Birth")).toBeTruthy();
    expect(getByText("Injury Type")).toBeTruthy();
  });

  it("handles input changes for all fields", () => {
    const { getByPlaceholderText } = render(<SignupWithNavigation />);

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

  it("validates email format and shows error message for invalid email", () => {
    const { getByPlaceholderText, getByText } = render(
      <SignupWithNavigation />
    );

    const emailInput = getByPlaceholderText("example@gmail.com");

    // Input invalid email
    fireEvent.changeText(emailInput, "invalid-email");

    // Check for error message
    expect(
      getByText("Please enter a valid email (e.g., user@example.com).")
    ).toBeTruthy();

    // Input valid email should clear error
    fireEvent.changeText(emailInput, "valid@example.com");
    expect(() =>
      getByText("Please enter a valid email (e.g., user@example.com).")
    ).toThrow();
  });

  it("validates password requirements and shows error message", () => {
    const { getByTestId, getByText } = render(<SignupWithNavigation />);

    const passwordInput = getByTestId("password-input");

    // Input invalid password (too short)
    fireEvent.changeText(passwordInput, "short");

    // Check for error message
    expect(
      getByText(
        "Password must be 8+ chars with uppercase, lowercase, number, and special char."
      )
    ).toBeTruthy();

    // Input valid password should clear error
    fireEvent.changeText(passwordInput, "ValidP@ss1");
    expect(() =>
      getByText(
        "Password must be 8+ chars with uppercase, lowercase, number, and special char."
      )
    ).toThrow();
  });

  it("shows an alert when form is submitted with missing fields", async () => {
    const { getByText } = render(
      <SignupWithNavigation
        testInjuryType={1}
        setInjuryTypeForTest={mockSetInjuryType}
      />
    );

    // Submit without filling any fields
    fireEvent.press(getByText("Sign Up"));

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith(
        "Error",
        "Please fill all required fields"
      );
    });
  });

  it("shows an alert when passwords do not match", async () => {
    // Render with the test injury type prop
    const { getByPlaceholderText, getByText, getByTestId } = render(
      <SignupWithNavigation
        testInjuryType={1}
        setInjuryTypeForTest={undefined}
      />
    );

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

    // Fill passwords with different values
    const passwordInput = getByTestId("password-input");
    fireEvent.changeText(passwordInput, "Password1!");

    const confirmPasswordInput = getByTestId("confirm-password-input");
    fireEvent.changeText(confirmPasswordInput, "DifferentPass1!");

    // Submit the form
    fireEvent.press(getByText("Sign Up"));

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith("Error", "Passwords do not match");
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

    // Render with the test injury type prop
    const { getByPlaceholderText, getByText, getByTestId } = render(
      <SignupWithNavigation
        testInjuryType={1}
        setInjuryTypeForTest={undefined}
      />
    );

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
    const passwordInput = getByTestId("password-input");
    fireEvent.changeText(passwordInput, "Password1!");

    const confirmPasswordInput = getByTestId("confirm-password-input");
    fireEvent.changeText(confirmPasswordInput, "Password1!");

    // Submit the form
    fireEvent.press(getByText("Sign Up"));

    await waitFor(() => {
      // Verify API was called with correct data
      expect(axios.post).toHaveBeenCalledWith(
        "http://test-api.com/users/register/",
        expect.objectContaining({
          username: "johndoe",
          email: "john@example.com",
          password: "Password1!",
          first_name: "John",
          last_name: "Doe",
          injury_type: 1,
        }),
        expect.any(Object)
      );

      // Verify that SecureStore was called to store tokens
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        "access_token",
        "fake-access-token"
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        "refresh_token",
        "fake-refresh-token"
      );

      // Verify auth state was updated
      expect(mockSetIsAuthenticated).toHaveBeenCalledWith(true);

      // Verify that router was called to navigate to home
      expect(router.replace).toHaveBeenCalledWith("/(tabs)");
    });
  });

  it("handles registration failure with server errors - username", async () => {
    // Mock axios post to return an error with field errors
    (axios.post as jest.Mock).mockRejectedValueOnce({
      response: {
        data: {
          username: ["This username is already taken."],
        },
      },
    });

    // Render with the test injury type prop
    const { getByPlaceholderText, getByText, getByTestId } = render(
      <SignupWithNavigation
        testInjuryType={1}
        setInjuryTypeForTest={undefined}
      />
    );

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
    const passwordInput = getByTestId("password-input");
    fireEvent.changeText(passwordInput, "Password1!");

    const confirmPasswordInput = getByTestId("confirm-password-input");
    fireEvent.changeText(confirmPasswordInput, "Password1!");

    // Submit the form
    fireEvent.press(getByText("Sign Up"));

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith(
        "Registration Failed",
        "Username: This username is already taken."
      );
    });
  });

  it("handles registration failure with server errors - email", async () => {
    // Mock axios post to return an error with email field errors
    (axios.post as jest.Mock).mockRejectedValueOnce({
      response: {
        data: {
          email: ["A user with this email already exists."],
        },
      },
    });

    // Render with the test injury type prop
    const { getByPlaceholderText, getByText, getByTestId } = render(
      <SignupWithNavigation
        testInjuryType={1}
        setInjuryTypeForTest={undefined}
      />
    );

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
    const passwordInput = getByTestId("password-input");
    fireEvent.changeText(passwordInput, "Password1!");

    const confirmPasswordInput = getByTestId("confirm-password-input");
    fireEvent.changeText(confirmPasswordInput, "Password1!");

    // Submit the form
    fireEvent.press(getByText("Sign Up"));

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith(
        "Registration Failed",
        "Email: A user with this email already exists."
      );
    });
  });
});
