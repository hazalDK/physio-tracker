import { renderHook, waitFor } from "@testing-library/react-native";
import axios from "axios";
import { useInjuryData } from "../useInjuryData";

// Mock axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("useInjuryData Hook", () => {
  // Sample mock data
  const mockInjuryTypes = [
    { id: 1, name: "Sprain", description: "Ligament injury" },
    { id: 2, name: "Fracture", description: "Bone break" },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should initialize with empty injury types and loading true", () => {
    const { result } = renderHook(() => useInjuryData());

    expect(result.current.injuryTypes).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  it("should fetch injury types successfully", async () => {
    // Mock the API response
    mockedAxios.get.mockResolvedValueOnce({ data: mockInjuryTypes });

    // Render the hook
    const { result } = renderHook(() => useInjuryData());

    // Initial state
    expect(result.current.loading).toBe(true);
    expect(result.current.injuryTypes).toEqual([]);

    // Wait for the async operation to complete
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Verify state after API call
    expect(result.current.loading).toBe(false);
    expect(result.current.injuryTypes).toEqual(mockInjuryTypes);
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining("/injury-types/")
    );
  });

  it("should handle API errors gracefully", async () => {
    // Mock API error
    mockedAxios.get.mockRejectedValueOnce(new Error("API Error"));

    // Spy on console.error
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    // Render the hook
    const { result } = renderHook(() => useInjuryData());

    // Wait for the async operation to complete
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Verify error handling
    expect(result.current.loading).toBe(false);
    expect(result.current.injuryTypes).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error fetching injury types:",
      expect.any(Error)
    );

    // Clean up
    consoleSpy.mockRestore();
  });

  it("should use the default API URL when environment variable is not set", async () => {
    // Save original env and clear it
    const originalEnv = process.env;
    process.env = { ...originalEnv };
    delete process.env.API_URL;

    // Mock the API response
    mockedAxios.get.mockResolvedValueOnce({ data: mockInjuryTypes });

    // Render the hook
    const { result } = renderHook(() => useInjuryData());

    // Wait for the async operation to complete
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Verify the correct URL was used
    expect(mockedAxios.get).toHaveBeenCalledWith(
      "http://192.168.68.111:8000/injury-types/"
    );

    // Restore original env
    process.env = originalEnv;
  });

  it("should use the environment API URL when available", async () => {
    // Set environment variable
    const originalEnv = process.env;
    process.env = { ...originalEnv, API_URL: "https://api.example.com" };

    // Mock the API response
    mockedAxios.get.mockResolvedValueOnce({ data: mockInjuryTypes });

    // Render the hook
    const { result } = renderHook(() => useInjuryData());

    // Wait for the async operation to complete
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Verify the correct URL was used
    expect(mockedAxios.get).toHaveBeenCalledWith(
      "https://api.example.com/injury-types/"
    );

    // Restore original env
    process.env = originalEnv;
  });
});
