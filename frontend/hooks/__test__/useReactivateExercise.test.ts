import { renderHook, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import axios from "axios";
import { useReactivateExercise } from "../useReactivateExercise";
import { useAuth } from "../useAuth";

// Mock dependencies
jest.mock("../useAuth");
jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
}));
jest.mock("@react-navigation/native", () => ({
  useNavigation: jest.fn(),
}));
jest.mock("react-native", () => ({
  Alert: {
    alert: jest.fn(),
  },
}));
jest.mock("axios");

// Mock API instance
const mockApiPut = jest.fn();
const mockCreateApiInstance = jest.fn().mockResolvedValue({
  put: mockApiPut,
});

// Mock refresh token function
const mockRefreshToken = jest.fn();

describe("useReactivateExercise", () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup default mock implementations
    (useAuth as jest.Mock).mockReturnValue({
      createApiInstance: mockCreateApiInstance,
      refreshToken: mockRefreshToken,
    });
  });

  it("should successfully reactivate an exercise", async () => {
    // Mock successful API response
    mockApiPut.mockResolvedValueOnce({ status: 200, data: { success: true } });

    // Render the hook
    const { result } = renderHook(() => useReactivateExercise());

    // Execute the reactivate function
    await act(async () => {
      await result.current.reactivateExercise(123);
    });

    // Check if API was called with correct parameters
    expect(mockCreateApiInstance).toHaveBeenCalledTimes(1);
    expect(mockApiPut).toHaveBeenCalledWith(
      "/user-exercises/123/reactivate_exercise/",
      { exercise_id: 123 }
    );

    // Check if success alert was shown
    expect(Alert.alert).toHaveBeenCalledWith(
      "Success",
      "Exercise added successfully"
    );

    // Check loading state
    expect(result.current.loading).toBe(false);
  });

  it("should handle API failure with status other than 200/201", async () => {
    // Mock API response with non-success status
    mockApiPut.mockResolvedValueOnce({
      status: 400,
      data: { error: "Bad Request" },
    });

    // Render the hook
    const { result } = renderHook(() => useReactivateExercise());

    // Execute the reactivate function
    await act(async () => {
      await result.current.reactivateExercise(123);
    });

    // Check if error alert was shown
    expect(Alert.alert).toHaveBeenCalledWith(
      "Error",
      "Failed to add the exercise"
    );

    // Check loading state
    expect(result.current.loading).toBe(false);
  });

  it("should handle 401 error by refreshing token and retrying", async () => {
    // Setup mock for first API call to throw 401 error
    const error401 = {
      response: { status: 401 },
      isAxiosError: true,
    };
    mockApiPut.mockRejectedValueOnce(error401);

    // Setup successful response after token refresh
    mockApiPut.mockResolvedValueOnce({ status: 200, data: { success: true } });

    // Mock refresh token to succeed
    mockRefreshToken.mockResolvedValueOnce("new-token");

    // Render the hook
    const { result } = renderHook(() => useReactivateExercise());

    // Execute the reactivate function
    await act(async () => {
      await result.current.reactivateExercise(123);
    });

    // Check if refresh token was called
    expect(mockRefreshToken).toHaveBeenCalledTimes(1);

    // Check if createApiInstance was called twice (initial + after refresh)
    expect(mockCreateApiInstance).toHaveBeenCalledTimes(2);

    // Check if API was retried with correct parameters
    expect(mockApiPut).toHaveBeenCalledTimes(2);

    // Check if success alert was shown after retry
    expect(Alert.alert).toHaveBeenCalledWith(
      "Success",
      "Exercise reactivated successfully"
    );

    // Check loading state
    expect(result.current.loading).toBe(false);
  });

  it("should handle 401 error when token refresh fails", async () => {
    // Setup mock for first API call to throw 401 error
    const error401 = {
      response: { status: 401 },
      isAxiosError: true,
    };
    mockApiPut.mockRejectedValueOnce(error401);

    // Mock refresh token to fail
    mockRefreshToken.mockResolvedValueOnce(null);

    // Render the hook
    const { result } = renderHook(() => useReactivateExercise());

    // Execute the reactivate function
    await act(async () => {
      await result.current.reactivateExercise(123);
    });

    // Check if refresh token was called
    expect(mockRefreshToken).toHaveBeenCalledTimes(1);

    // Check if error alert was shown
    expect(Alert.alert).toHaveBeenCalledWith(
      "Error",
      "Failed to reactivate the exercise. Please check your connection and try again."
    );

    // Check loading state
    expect(result.current.loading).toBe(false);
  });

  it("should handle 400 error with validation message", async () => {
    // Setup mock for API call to throw 400 error
    const error400 = {
      response: {
        status: 400,
        data: { message: "Already active exercise in this category" },
      },
      isAxiosError: true,
    };
    mockApiPut.mockRejectedValueOnce(error400);

    // Make axios.isAxiosError return true for our mock error
    (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

    // Render the hook
    const { result } = renderHook(() => useReactivateExercise());

    // Execute the reactivate function
    await act(async () => {
      await result.current.reactivateExercise(123);
    });

    // Check if specific error alert was shown
    expect(Alert.alert).toHaveBeenCalledWith(
      "Cannot Add Exercise",
      "Already active exercise in this category"
    );

    // Check loading state
    expect(result.current.loading).toBe(false);
  });

  it("should handle generic error during API request", async () => {
    // Setup mock for API call to throw generic error
    mockApiPut.mockRejectedValueOnce(new Error("Network error"));

    // Make axios.isAxiosError return false for our generic error
    (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(false);

    // Render the hook
    const { result } = renderHook(() => useReactivateExercise());

    // Execute the reactivate function
    await act(async () => {
      await result.current.reactivateExercise(123);
    });

    // Check if generic error alert was shown
    expect(Alert.alert).toHaveBeenCalledWith(
      "Error",
      "Failed to reactivate the exercise. Please check your connection and try again."
    );

    // Check loading state
    expect(result.current.loading).toBe(false);
  });
});
