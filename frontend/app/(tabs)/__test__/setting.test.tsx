import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import Settings from "../settings";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "@/hooks/useAuth";
import * as SecureStore from "expo-secure-store";
import axios from "axios";

// Mock the hooks and modules
jest.mock("@react-navigation/native");
jest.mock("@/hooks/useAuth");
jest.mock("expo-secure-store");
jest.mock("axios");
jest.mock("../../../components/ReminderComponent", () => "ReminderComponent");

// Mock Alert
jest.spyOn(Alert, "alert").mockImplementation(() => {});

describe("Settings Component", () => {
  // Setup mock data and functions
  const mockNavigation = {
    navigate: jest.fn(),
  };

  const mockApi = {
    put: jest.fn(),
  };

  const mockCreateApiInstance = jest.fn().mockResolvedValue(mockApi);

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup default mocks
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
    (useAuth as jest.Mock).mockReturnValue({
      createApiInstance: mockCreateApiInstance,
    });
  });

  it("renders component correctly", () => {
    const { getByText } = render(<Settings />);

    expect(getByText("Customisable Reminder:")).toBeTruthy();
    expect(getByText("Privacy")).toBeTruthy();
    expect(getByText("Update password")).toBeTruthy();
    expect(getByText("Sign Out")).toBeTruthy();
  });

  it("opens password modal when update password button is pressed", () => {
    const { getByText, queryByText } = render(<Settings />);

    // Modal should not be visible initially
    expect(queryByText("Update Password")).toBeNull();

    // Press the button to open modal
    fireEvent.press(getByText("Update password"));

    // Modal should now be visible
    expect(getByText("Update Password")).toBeTruthy();
    expect(getByText("Current Password:")).toBeTruthy();
    expect(getByText("New Password:")).toBeTruthy();
    expect(getByText("Confirm New Password:")).toBeTruthy();
  });

  it("handles sign out correctly", async () => {
    // Mock SecureStore.deleteItemAsync to resolve successfully
    (SecureStore.deleteItemAsync as jest.Mock)
      .mockResolvedValueOnce(undefined) // for access_token
      .mockResolvedValueOnce(undefined); // for refresh_token

    const { getByText } = render(<Settings />);

    fireEvent.press(getByText("Sign Out"));

    await waitFor(() => {
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("access_token");
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("refresh_token");
      expect(mockNavigation.navigate).toHaveBeenCalledWith("login");
      expect(Alert.alert).toHaveBeenCalledWith(
        "Signed out",
        "You have been successfully signed out."
      );
    });
  });

  it("handles sign out error correctly", async () => {
    // Mock SecureStore.deleteItemAsync to reject with an error
    (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValue(
      new Error("Failed to delete")
    );

    const { getByText } = render(<Settings />);

    fireEvent.press(getByText("Sign Out"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Failed to sign out. Please try again."
      );
    });
  });

  it("toggles password visibility when show/hide button is pressed", () => {
    const { getByText, getAllByPlaceholderText } = render(<Settings />);

    // First open the modal
    fireEvent.press(getByText("Update password"));

    // All password fields should start with secureTextEntry=true
    const passwordFields = getAllByPlaceholderText(/password/i);
    passwordFields.forEach((field) => {
      expect(field.props.secureTextEntry).toBe(true);
    });

    // Toggle password visibility
    fireEvent.press(getByText("👁️ Show Passwords"));

    // All password fields should now have secureTextEntry=false
    passwordFields.forEach((field) => {
      expect(field.props.secureTextEntry).toBe(false);
    });

    // Toggle back
    fireEvent.press(getByText("🙈 Hide Passwords"));

    // All password fields should be secure again
    passwordFields.forEach((field) => {
      expect(field.props.secureTextEntry).toBe(true);
    });
  });

  it("validates all fields are required when updating password", async () => {
    const { getByText } = render(<Settings />);

    // Open the modal
    fireEvent.press(getByText("Update password"));

    // Try to update without filling in any fields
    fireEvent.press(getByText("Update"));

    expect(Alert.alert).toHaveBeenCalledWith(
      "Error",
      "All fields are required."
    );
    expect(mockCreateApiInstance).not.toHaveBeenCalled();
  });

  it("validates passwords match when updating password", async () => {
    const { getByText, getByPlaceholderText } = render(<Settings />);

    // Open the modal
    fireEvent.press(getByText("Update password"));

    // Fill in fields but with mismatched new passwords
    fireEvent.changeText(
      getByPlaceholderText("Enter current password"),
      "oldpassword"
    );
    fireEvent.changeText(
      getByPlaceholderText("Enter new password"),
      "Newpassword1!"
    );
    fireEvent.changeText(
      getByPlaceholderText("Confirm new password"),
      "DifferentPassword1!"
    );

    // Try to update
    fireEvent.press(getByText("Update"));

    expect(Alert.alert).toHaveBeenCalledWith(
      "Error",
      "New passwords do not match."
    );
    expect(mockCreateApiInstance).not.toHaveBeenCalled();
  });

  it("validates new password differs from current password", async () => {
    const { getByText, getByPlaceholderText } = render(<Settings />);

    // Open the modal
    fireEvent.press(getByText("Update password"));

    // Fill in fields with same current and new password
    fireEvent.changeText(
      getByPlaceholderText("Enter current password"),
      "Password123!"
    );
    fireEvent.changeText(
      getByPlaceholderText("Enter new password"),
      "Password123!"
    );
    fireEvent.changeText(
      getByPlaceholderText("Confirm new password"),
      "Password123!"
    );

    // Try to update
    fireEvent.press(getByText("Update"));

    expect(Alert.alert).toHaveBeenCalledWith(
      "Error",
      "New password cannot be the same as current password."
    );
    expect(mockCreateApiInstance).not.toHaveBeenCalled();
  });

  it("validates password complexity requirements", async () => {
    const { getByText, getByPlaceholderText } = render(<Settings />);

    // Open the modal
    fireEvent.press(getByText("Update password"));

    // Fill in fields with weak password
    fireEvent.changeText(
      getByPlaceholderText("Enter current password"),
      "oldpassword"
    );
    fireEvent.changeText(getByPlaceholderText("Enter new password"), "simple");
    fireEvent.changeText(
      getByPlaceholderText("Confirm new password"),
      "simple"
    );

    // Try to update
    fireEvent.press(getByText("Update"));

    expect(Alert.alert).toHaveBeenCalledWith(
      "Error",
      "Password must contain:\n- 8+ characters\n- 1 uppercase\n- 1 lowercase\n- 1 number\n- 1 special character"
    );
    expect(mockCreateApiInstance).not.toHaveBeenCalled();
  });

  it("successfully updates password", async () => {
    // Mock successful API response
    mockApi.put.mockResolvedValue({ status: 200 });

    const { getByText, getByPlaceholderText } = render(<Settings />);

    // Open the modal
    fireEvent.press(getByText("Update password"));

    // Fill in fields with valid data
    fireEvent.changeText(
      getByPlaceholderText("Enter current password"),
      "OldPassword123!"
    );
    fireEvent.changeText(
      getByPlaceholderText("Enter new password"),
      "NewPassword456@"
    );
    fireEvent.changeText(
      getByPlaceholderText("Confirm new password"),
      "NewPassword456@"
    );

    // Update password
    fireEvent.press(getByText("Update"));

    await waitFor(() => {
      expect(mockCreateApiInstance).toHaveBeenCalled();
      expect(mockApi.put).toHaveBeenCalledWith(
        "http://192.168.68.111:8000/users/update_password/",
        {
          current_password: "OldPassword123!",
          new_password: "NewPassword456@",
        }
      );
      expect(Alert.alert).toHaveBeenCalledWith(
        "Success",
        "Password updated successfully!"
      );
    });
  });

  it("handles incorrect current password error", async () => {
    // Mock API error response for incorrect password
    const error = {
      response: {
        status: 400,
        data: { error: "Current password is incorrect" },
      },
      isAxiosError: true,
    };
    mockApi.put.mockRejectedValue(error);
    axios.isAxiosError.mockReturnValue(true);

    const { getByText, getByPlaceholderText } = render(<Settings />);

    // Open the modal
    fireEvent.press(getByText("Update password"));

    // Fill in fields
    fireEvent.changeText(
      getByPlaceholderText("Enter current password"),
      "WrongPassword123!"
    );
    fireEvent.changeText(
      getByPlaceholderText("Enter new password"),
      "NewPassword456@"
    );
    fireEvent.changeText(
      getByPlaceholderText("Confirm new password"),
      "NewPassword456@"
    );

    // Try to update
    fireEvent.press(getByText("Update"));

    await waitFor(() => {
      expect(mockCreateApiInstance).toHaveBeenCalled();
      expect(mockApi.put).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith(
        "Incorrect Password",
        "The password you entered doesn't match your current password. Please try again."
      );
    });
  });

  it("handles generic API error", async () => {
    // Mock API error response
    const error = {
      response: {
        status: 500,
        data: { error: "Server error" },
      },
      isAxiosError: true,
    };
    mockApi.put.mockRejectedValue(error);
    axios.isAxiosError.mockReturnValue(true);

    const { getByText, getByPlaceholderText } = render(<Settings />);

    // Open the modal
    fireEvent.press(getByText("Update password"));

    // Fill in fields
    fireEvent.changeText(
      getByPlaceholderText("Enter current password"),
      "OldPassword123!"
    );
    fireEvent.changeText(
      getByPlaceholderText("Enter new password"),
      "NewPassword456@"
    );
    fireEvent.changeText(
      getByPlaceholderText("Confirm new password"),
      "NewPassword456@"
    );

    // Try to update
    fireEvent.press(getByText("Update"));

    await waitFor(() => {
      expect(mockCreateApiInstance).toHaveBeenCalled();
      expect(mockApi.put).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith("Error", "Server error");
    });
  });

  it("handles network error", async () => {
    // Mock network error
    mockApi.put.mockRejectedValue(new Error("Network Error"));
    axios.isAxiosError.mockReturnValue(false);

    const { getByText, getByPlaceholderText } = render(<Settings />);

    // Open the modal
    fireEvent.press(getByText("Update password"));

    // Fill in fields
    fireEvent.changeText(
      getByPlaceholderText("Enter current password"),
      "OldPassword123!"
    );
    fireEvent.changeText(
      getByPlaceholderText("Enter new password"),
      "NewPassword456@"
    );
    fireEvent.changeText(
      getByPlaceholderText("Confirm new password"),
      "NewPassword456@"
    );

    // Try to update
    fireEvent.press(getByText("Update"));

    await waitFor(() => {
      expect(mockCreateApiInstance).toHaveBeenCalled();
      expect(mockApi.put).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Network error. Please check your connection and try again."
      );
    });
  });

  it("disables inputs and buttons when updating is in progress", async () => {
    // Use a promise that we control to keep the updating state active
    let resolveApiCall: (arg0: { status: number }) => void;
    const apiPromise = new Promise((resolve) => {
      resolveApiCall = resolve;
    });
    mockApi.put.mockReturnValue(apiPromise);

    const { getByText, getByPlaceholderText } = render(<Settings />);

    // Open the modal
    fireEvent.press(getByText("Update password"));

    // Fill in fields
    fireEvent.changeText(
      getByPlaceholderText("Enter current password"),
      "OldPassword123!"
    );
    fireEvent.changeText(
      getByPlaceholderText("Enter new password"),
      "NewPassword456@"
    );
    fireEvent.changeText(
      getByPlaceholderText("Confirm new password"),
      "NewPassword456@"
    );

    // Start update (but don't resolve yet)
    fireEvent.press(getByText("Update"));

    // While updating, elements should be disabled
    await waitFor(() => {
      expect(getByText("Updating...")).toBeTruthy();
      expect(
        getByPlaceholderText("Enter current password").props.editable
      ).toBe(false);
      expect(getByPlaceholderText("Enter new password").props.editable).toBe(
        false
      );
      expect(getByPlaceholderText("Confirm new password").props.editable).toBe(
        false
      );
      expect(getByText("Updating...")).toBeTruthy();

      // Now resolve the API call
      resolveApiCall({ status: 200 });
    });
  });
});
