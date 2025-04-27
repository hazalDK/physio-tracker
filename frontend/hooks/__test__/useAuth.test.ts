import { renderHook } from "@testing-library/react-native";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { Alert } from "react-native";
import { useAuth } from "../useAuth";

// Mock dependencies
jest.mock("axios");
jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
jest.mock("react-native", () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

// Create a mock navigate function that we can test against
const mockNavigate = jest.fn();

// Mock the entire navigation stack
jest.mock("@react-navigation/native", () => {
  return {
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
    StackActions: {
      replace: jest.fn((name) => ({ type: "login", name })),
    },
  };
});

// Mock @react-navigation/stack if needed
jest.mock("@react-navigation/stack", () => {
  return {
    // This is just to satisfy any imports, the actual implementation is mocked above
    StackNavigationProp: jest.fn(),
  };
});

describe("useAuth", () => {
  const mockToken = "test_token";
  const mockRefreshToken = "test_refresh_token";

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Reset API URL
    process.env.API_URL = "http://test-api.com";
  });

  describe("getToken", () => {
    it("should return token from secure storage", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(mockToken);

      const { result } = renderHook(() => useAuth());
      const token = await result.current.getToken();

      expect(SecureStore.getItemAsync).toHaveBeenCalledWith("access_token");
      expect(token).toBe(mockToken);
    });

    it("should return null if no token exists", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useAuth());
      const token = await result.current.getToken();

      expect(token).toBeNull();
    });
  });

  describe("refreshToken", () => {
    it("should refresh token successfully", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        mockRefreshToken
      );
      (axios.post as jest.Mock).mockResolvedValue({
        data: {
          access: "new_access_token",
          refresh: "new_refresh_token",
        },
      });

      const { result } = renderHook(() => useAuth());
      const newToken = await result.current.refreshToken();

      expect(SecureStore.getItemAsync).toHaveBeenCalledWith("refresh_token");
      expect(axios.post).toHaveBeenCalledWith(
        "http://test-api.com/api/token/refresh/",
        { refresh: mockRefreshToken }
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        "access_token",
        "new_access_token"
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        "refresh_token",
        "new_refresh_token"
      );
      expect(newToken).toBe("new_access_token");
    });

    it("should handle missing refresh token", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useAuth());
      await result.current.refreshToken();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("access_token");
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("refresh_token");
      expect(Alert.alert).toHaveBeenCalled();

      const okButton = (Alert.alert as jest.Mock).mock.calls[0][2][0];
      okButton.onPress();

      expect(mockNavigate).toHaveBeenCalledWith("login");
    });

    it("should handle refresh token API error", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        mockRefreshToken
      );
      (axios.post as jest.Mock).mockRejectedValue(new Error("API error"));

      const { result } = renderHook(() => useAuth());
      await result.current.refreshToken();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("access_token");
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("refresh_token");
      expect(Alert.alert).toHaveBeenCalled();

      const okButton = (Alert.alert as jest.Mock).mock.calls[0][2][0];
      okButton.onPress();

      expect(mockNavigate).toHaveBeenCalledWith("login");
    });
  });

  describe("createApiInstance", () => {
    it("should create API instance with token", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(mockToken);
      (axios.create as jest.Mock).mockReturnValue("api_instance");

      const { result } = renderHook(() => useAuth());
      const apiInstance = await result.current.createApiInstance();

      expect(axios.create).toHaveBeenCalledWith({
        baseURL: "http://test-api.com",
        timeout: 10000,
        headers: {
          Authorization: `Bearer ${mockToken}`,
          "Content-Type": "application/json",
        },
      });
      expect(apiInstance).toBe("api_instance");
    });

    it("should navigate to login if no token exists", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useAuth());
      await result.current.createApiInstance();

      expect(Alert.alert).toHaveBeenCalled();

      const okButton = (Alert.alert as jest.Mock).mock.calls[0][2][0];
      okButton.onPress();

      expect(mockNavigate).toHaveBeenCalledWith("login");
    });

    it("should use default API URL if env variable not set", async () => {
      // Explicitly delete the environment variable
      delete process.env.API_URL;

      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(mockToken);
      (axios.create as jest.Mock).mockReturnValue("api_instance");

      const { result } = renderHook(() => useAuth());
      await result.current.createApiInstance();

      expect(axios.create).toHaveBeenCalledWith({
        baseURL: "http://192.168.68.111:8000",
        timeout: 10000,
        headers: {
          Authorization: `Bearer ${mockToken}`,
          "Content-Type": "application/json",
        },
      });
    });
  });
});
