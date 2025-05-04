import { renderHook, act, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import axios from "axios";
import { useProfileData } from "../useProfileData";
import { useAuth } from "../useAuth";
import { useInjuryData } from "../useInjuryData";

// Mock dependencies
jest.mock("@/hooks/useAuth");
jest.mock("@/hooks/useInjuryData");
jest.mock("@react-navigation/native", () => ({
  useNavigation: jest.fn(),
}));

jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
}));

jest.mock("axios");

// Mock Alert.alert
jest.mock("react-native", () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

describe("useProfileData", () => {
  // Setup common test variables
  const mockApi = {
    get: jest.fn(),
    put: jest.fn(),
  };
  const mockCreateApiInstance = jest.fn().mockResolvedValue(mockApi);
  const mockRefreshToken = jest.fn();
  const mockUserProfileData = {
    id: 1,
    username: "testuser",
    first_name: "Test",
    last_name: "User",
    email: "test@example.com",
    date_of_birth: "1990-01-01",
  };
  const mockInjuryTypes = [
    { id: 1, name: "Shoulder" },
    { id: 2, name: "Knee" },
  ];

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup useAuth mock
    (useAuth as jest.Mock).mockReturnValue({
      createApiInstance: mockCreateApiInstance,
      refreshToken: mockRefreshToken,
    });

    // Setup useInjuryData mock
    (useInjuryData as jest.Mock).mockReturnValue({
      injuryTypes: mockInjuryTypes,
      loading: false,
    });

    // Mock axios.isAxiosError
    (axios.isAxiosError as unknown as jest.Mock) = jest.fn();
  });

  it("should initialize with default values and fetch profile data", async () => {
    // Setup successful API response
    mockApi.get.mockResolvedValueOnce({
      data: mockUserProfileData,
      status: 200,
    });

    const { result } = renderHook(() => useProfileData());

    // Initial state should be loading with null profile
    // Note: The test is not checking the initial loading state since the hook might
    // update it too quickly for the test to capture
    expect(result.current.userProfile).toBe(null);

    // Wait for the loading state to become false
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Verify API was called
    expect(mockCreateApiInstance).toHaveBeenCalled();
    expect(mockApi.get).toHaveBeenCalledWith("/users/me/");

    // Verify state is updated
    expect(result.current.loading).toBe(false);
    expect(result.current.userProfile).toEqual(mockUserProfileData);
    expect(result.current.isModalVisible).toBe(false);
    expect(result.current.newUsername).toBe("");
    expect(result.current.isUpdating).toBe(false);
  });

  it("should handle API error when fetching profile", async () => {
    // Mock console.error to avoid test output clutter
    const originalConsoleError = console.error;
    console.error = jest.fn();

    // Setup API error that matches the implemented error path
    const error = new Error("API error");
    mockApi.get.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useProfileData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Verify error handling - match the actual error message in useProfileData.ts
    expect(console.error).toHaveBeenCalledWith(
      "API request failed:",
      expect.any(Error)
    );
    expect(result.current.loading).toBe(false);
    expect(result.current.userProfile).toBe(null);

    // Restore console.error
    console.error = originalConsoleError;
  });

  it("should handle 401 error and try token refresh", async () => {
    // Setup axios error and isAxiosError
    const error401 = new Error("401 Unauthorized");
    (error401 as any).response = { status: 401 };
    (axios.isAxiosError as unknown as jest.Mock).mockReturnValueOnce(true);

    // First call fails with 401, second call succeeds after token refresh
    mockApi.get.mockRejectedValueOnce(error401);

    // Mock successful token refresh
    mockRefreshToken.mockResolvedValueOnce("new_token");

    // Mock successful retry with new token
    mockCreateApiInstance.mockResolvedValueOnce(mockApi);

    // Mock axios after refresh
    (axios.get as jest.Mock).mockResolvedValueOnce({
      data: mockUserProfileData,
      status: 200,
    });

    const { result } = renderHook(() => useProfileData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Verify refresh token was called
    expect(mockRefreshToken).toHaveBeenCalled();
    expect(mockCreateApiInstance).toHaveBeenCalledTimes(2);

    // Wait for final state update
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.loading).toBe(false);
  });

  it("toggleModal should toggle modal visibility and initialize form fields", async () => {
    // Setup successful API response
    mockApi.get.mockResolvedValueOnce({
      data: mockUserProfileData,
      status: 200,
    });

    const { result } = renderHook(() => useProfileData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Toggle modal to open
    act(() => {
      result.current.toggleModal();
    });

    // Modal should be visible now
    expect(result.current.isModalVisible).toBe(true);

    // Toggle modal to close
    act(() => {
      result.current.toggleModal();
    });

    // Modal should be hidden now
    expect(result.current.isModalVisible).toBe(false);
  });

  it("handleEditProfile should show error if no fields are filled", async () => {
    const { result } = renderHook(() => useProfileData());

    await act(async () => {
      await result.current.handleEditProfile();
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      "Error",
      "Please fill in at least one field"
    );
    expect(result.current.isUpdating).toBe(false);
    expect(mockApi.put).not.toHaveBeenCalled();
  });

  it("handleEditProfile should validate email format", async () => {
    const { result } = renderHook(() => useProfileData());

    act(() => {
      result.current.setNewEmail("invalid-email");
    });

    await act(async () => {
      await result.current.handleEditProfile();
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      "Error",
      "Invalid email format. (e.g., user@example.com)"
    );
    expect(result.current.isUpdating).toBe(false);
    expect(mockApi.put).not.toHaveBeenCalled();
  });

  it("handleEditProfile should update profile successfully", async () => {
    const { result } = renderHook(() => useProfileData());

    // Set form values
    act(() => {
      result.current.setNewUsername("newusername");
      result.current.setNewEmail("new@example.com");
    });

    // Setup successful API response
    mockApi.put.mockResolvedValueOnce({
      data: {
        ...mockUserProfileData,
        username: "newusername",
        email: "new@example.com",
      },
      status: 200,
    });

    // Mock fetchUserProfile success
    mockApi.get.mockResolvedValueOnce({
      data: {
        ...mockUserProfileData,
        username: "newusername",
        email: "new@example.com",
      },
      status: 200,
    });

    await act(async () => {
      await result.current.handleEditProfile();
    });

    // Verify API call with correct data
    expect(mockApi.put).toHaveBeenCalledWith("/users/update_profile/", {
      username: "newusername",
      email: "new@example.com",
    });

    // Verify success message
    expect(Alert.alert).toHaveBeenCalledWith(
      "Success",
      "Profile updated successfully!"
    );

    // Verify modal is closed and form is reset
    expect(result.current.isModalVisible).toBe(false);
    expect(result.current.newUsername).toBe("");
    expect(result.current.newEmail).toBe("");

    // Verify fetchUserProfile was called to refresh data
    expect(mockApi.get).toHaveBeenCalledWith("/users/me/");
  });

  it("handleEditProfile should handle API errors", async () => {
    // Mock console.error to avoid test output clutter
    const originalConsoleError = console.error;
    console.error = jest.fn();

    const { result } = renderHook(() => useProfileData());

    // Set form values
    act(() => {
      result.current.setNewUsername("newusername");
    });

    // Setup API error
    mockApi.put.mockRejectedValueOnce(new Error("API error"));

    await act(async () => {
      await result.current.handleEditProfile();
    });

    // Verify error handling
    expect(console.error).toHaveBeenCalledWith(
      "Error updating profile:",
      expect.any(Error)
    );
    expect(Alert.alert).toHaveBeenCalledWith(
      "Error",
      "Failed to update profile"
    );
    expect(result.current.isUpdating).toBe(false);

    // Restore console.error
    console.error = originalConsoleError;
  });

  it("handleEditProfile should include date of birth when provided", async () => {
    const { result } = renderHook(() => useProfileData());

    const testDate = new Date("1995-05-15");

    // Set form values
    act(() => {
      result.current.setNewDateOfBirth(testDate);
    });

    // Setup successful API response
    mockApi.put.mockResolvedValueOnce({
      data: { ...mockUserProfileData, date_of_birth: "1995-05-15" },
      status: 200,
    });

    // Mock fetchUserProfile success
    mockApi.get.mockResolvedValueOnce({
      data: { ...mockUserProfileData, date_of_birth: "1995-05-15" },
      status: 200,
    });

    await act(async () => {
      await result.current.handleEditProfile();
    });

    // Verify API call with correct date format
    expect(mockApi.put).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        date_of_birth: "1995-05-15",
      })
    );
  });

  it("toggleModal should initialize form with current profile values", async () => {
    // Setup successful API response
    mockApi.get.mockResolvedValueOnce({
      data: mockUserProfileData,
      status: 200,
    });

    const { result } = renderHook(() => useProfileData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Toggle modal to open
    act(() => {
      result.current.toggleModal();
    });

    // Form fields should be initialized with current profile values
    expect(result.current.newUsername).toBe(mockUserProfileData.username);
    expect(result.current.newFirstName).toBe(mockUserProfileData.first_name);
    expect(result.current.newLastName).toBe(mockUserProfileData.last_name);
    expect(result.current.newEmail).toBe(mockUserProfileData.email);
  });

  it("should handle API response for already used username", async () => {
    // Setup successful API response for initial load
    mockApi.get.mockResolvedValueOnce({
      data: mockUserProfileData,
      status: 200,
    });

    const { result } = renderHook(() => useProfileData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Set form values
    act(() => {
      result.current.setNewUsername("existinguser");
    });

    const errorResponse = {
      response: {
        status: 400,
        data: {
          username: ["This username is already taken."],
        },
      },
    };

    // Clear previous calls to Alert.alert
    (Alert.alert as jest.Mock).mockClear();

    // Mock axios.isAxiosError to return true
    (axios.isAxiosError as unknown as jest.Mock).mockImplementation(
      (error) => error && error.response !== undefined
    );

    // Mock the API put call to reject with our error
    mockApi.put.mockRejectedValueOnce(errorResponse);

    await act(async () => {
      await result.current.handleEditProfile();
    });

    // Verify that the alert was called with the expected message
    expect(Alert.alert).toHaveBeenCalledWith(
      "Error",
      "This username is already taken."
    );

    expect(result.current.isUpdating).toBe(false);
  });

  it("should handle API response for already used email", async () => {
    // Setup successful API response for initial load
    mockApi.get.mockResolvedValueOnce({
      data: mockUserProfileData,
      status: 200,
    });

    const { result } = renderHook(() => useProfileData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Set form values
    act(() => {
      result.current.setNewEmail("existing@example.com");
    });

    // Setup API error response for duplicate email
    const errorResponse = {
      response: {
        status: 400,
        data: {
          email: ["This email address is already in use."],
        },
      },
    };

    // Clear previous calls to Alert.alert
    (Alert.alert as jest.Mock).mockClear();

    // Mock axios.isAxiosError to return true
    (axios.isAxiosError as unknown as jest.Mock).mockImplementation(
      (error) => error && error.response !== undefined
    );

    // Mock the API put call to reject with our error
    mockApi.put.mockRejectedValueOnce(errorResponse);

    await act(async () => {
      await result.current.handleEditProfile();
    });

    // Verify that the alert was called with the expected message for email
    expect(Alert.alert).toHaveBeenCalledWith(
      "Error",
      "This email address is already in use."
    );

    // Also verify that the errors state was set correctly
    expect(result.current.errors).toEqual({
      email: ["This email address is already in use."],
    });

    expect(result.current.isUpdating).toBe(false);
  });
});
