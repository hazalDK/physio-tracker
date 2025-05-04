import { renderHook, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import { useExerciseUpdates } from "../useExerciseUpdates";
import { useAuth } from "../useAuth";

// Mock dependencies
jest.mock("@/hooks/useAuth");

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    goBack: jest.fn(),
  }),
}));

jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
}));

// Mock Alert.alert
jest.mock("react-native", () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

describe("useExerciseUpdates", () => {
  // Setup common test variables
  const mockUserExerciseId = 123;
  const mockExerciseDifficulty = "Beginner";
  const mockHighExerciseDifficulty = "Advanced";
  const mockApi = {
    put: jest.fn(),
    post: jest.fn(),
  };
  const mockCreateApiInstance = jest.fn().mockResolvedValue(mockApi);

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup useAuth mock
    (useAuth as jest.Mock).mockReturnValue({
      createApiInstance: mockCreateApiInstance,
    });
  });

  it("should initialize with default values", () => {
    const { result } = renderHook(() =>
      useExerciseUpdates(mockUserExerciseId, mockExerciseDifficulty)
    );

    expect(result.current.showCompletionForm).toBe(false);
    expect(result.current.showRemovalConfirmation).toBe(false);
    expect(result.current.reps).toBe(0);
    expect(result.current.sets).toBe(0);
    expect(result.current.painLevel).toBe(0);
  });

  it("should update state values when setters are called", () => {
    const { result } = renderHook(() =>
      useExerciseUpdates(mockUserExerciseId, mockExerciseDifficulty)
    );

    act(() => {
      result.current.setShowCompletionForm(true);
      result.current.setReps(10);
      result.current.setSets(3);
      result.current.setPainLevel(2);
    });

    expect(result.current.showCompletionForm).toBe(true);
    expect(result.current.reps).toBe(10);
    expect(result.current.sets).toBe(3);
    expect(result.current.painLevel).toBe(2);
  });

  it("should generate dropdown data correctly", () => {
    const { result } = renderHook(() =>
      useExerciseUpdates(mockUserExerciseId, mockExerciseDifficulty)
    );

    const repOptions = result.current.getDropdownData(5);
    expect(repOptions).toHaveLength(5);
    expect(repOptions[0]).toEqual({ label: "1", value: 1 });
    expect(repOptions[4]).toEqual({ label: "5", value: 5 });

    const painOptions = result.current.getPainLevelData();
    expect(painOptions).toHaveLength(11);
    expect(painOptions[0]).toEqual({ label: "0", value: 0 });
    expect(painOptions[10]).toEqual({ label: "10", value: 10 });
  });

  it("handleSave should show error when fields are missing", async () => {
    const { result } = renderHook(() =>
      useExerciseUpdates(mockUserExerciseId, mockExerciseDifficulty)
    );

    await act(async () => {
      await result.current.handleSave();
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      "Error",
      "Please fill all required fields"
    );
    expect(mockApi.put).not.toHaveBeenCalled();
  });

  it("handleSave should update exercise data successfully", async () => {
    const { result } = renderHook(() =>
      useExerciseUpdates(mockUserExerciseId, mockExerciseDifficulty)
    );

    // Set required values
    act(() => {
      result.current.setReps(10);
      result.current.setSets(3);
      result.current.setPainLevel(2);
    });

    // Mock API response
    mockApi.put.mockResolvedValueOnce({
      data: {
        should_decrease: false,
        should_increase: false,
        should_remove: false,
      },
    });

    await act(async () => {
      await result.current.handleSave();
    });

    // Verify API call
    expect(mockCreateApiInstance).toHaveBeenCalled();
    expect(mockApi.put).toHaveBeenCalledWith(
      `/user-exercises/${mockUserExerciseId}/`,
      {
        reps: 10,
        sets: 3,
        pain_level: 2,
        completed: true,
      }
    );

    // Verify form was closed
    expect(result.current.showCompletionForm).toBe(false);

    // Verify success message for low pain level
    expect(Alert.alert).toHaveBeenCalledWith(
      "Exercise Progress",
      "Your pain level is low. Keep it up for 3 days to unlock higher difficulty!",
      expect.anything()
    );
  });

  it("handleSave should show alert for low pain level and high difficulty", async () => {
    const { result } = renderHook(() =>
      useExerciseUpdates(mockUserExerciseId, mockHighExerciseDifficulty)
    );

    // Set required values
    act(() => {
      result.current.setReps(10);
      result.current.setSets(3);
      result.current.setPainLevel(1);
    });

    // Mock API response
    mockApi.put.mockResolvedValueOnce({
      data: {
        should_decrease: false,
        should_increase: false,
        should_remove: false,
      },
    });

    await act(async () => {
      await result.current.handleSave();
    });

    // Verify API call
    expect(mockCreateApiInstance).toHaveBeenCalled();
    expect(mockApi.put).toHaveBeenCalledWith(
      `/user-exercises/${mockUserExerciseId}/`,
      {
        reps: 10,
        sets: 3,
        pain_level: 1,
        completed: true,
      }
    );

    // Verify form was closed
    expect(result.current.showCompletionForm).toBe(false);

    // Verify success message for low pain level and high difficulty
    expect(Alert.alert).toHaveBeenCalledWith(
      "Exercise Progress",
      "Great job! Your pain level is low. Keep it up!",
      expect.anything()
    );
  });

  it('handleSave should handle "should_remove" flag', async () => {
    const { result } = renderHook(() =>
      useExerciseUpdates(mockUserExerciseId, mockExerciseDifficulty)
    );

    // Set required values
    act(() => {
      result.current.setReps(10);
      result.current.setSets(3);
      result.current.setPainLevel(8);
    });

    // Mock API response
    mockApi.put.mockResolvedValueOnce({
      data: {
        should_decrease: false,
        should_increase: false,
        should_remove: true,
      },
    });

    await act(async () => {
      await result.current.handleSave();
    });

    // Verify API call
    expect(mockApi.put).toHaveBeenCalled();

    // Verify removal confirmation is shown
    expect(result.current.showRemovalConfirmation).toBe(true);
  });

  it('handleSave should handle "should_decrease" flag', async () => {
    const { result } = renderHook(() =>
      useExerciseUpdates(mockUserExerciseId, mockExerciseDifficulty)
    );

    // Set required values
    act(() => {
      result.current.setReps(10);
      result.current.setSets(3);
      result.current.setPainLevel(7);
    });

    // Mock API response
    mockApi.put.mockResolvedValueOnce({
      data: {
        should_decrease: true,
        should_increase: false,
        should_remove: false,
      },
    });

    await act(async () => {
      await result.current.handleSave();
    });

    // Verify API call
    expect(mockApi.put).toHaveBeenCalled();

    // Verify Alert is shown with decrease option
    expect(Alert.alert).toHaveBeenCalledWith(
      "Exercise Difficulty",
      "Your pain level is high. Would you like to decrease the difficulty for next time?",
      expect.arrayContaining([
        expect.objectContaining({ text: "No" }),
        expect.objectContaining({ text: "Yes" }),
      ])
    );
  });

  it('handleSave should handle "should_increase" flag', async () => {
    const { result } = renderHook(() =>
      useExerciseUpdates(mockUserExerciseId, mockExerciseDifficulty)
    );

    // Set required values
    act(() => {
      result.current.setReps(10);
      result.current.setSets(3);
      result.current.setPainLevel(1);
    });

    // Mock API response
    mockApi.put.mockResolvedValueOnce({
      data: {
        should_decrease: false,
        should_increase: true,
        should_remove: false,
      },
    });

    await act(async () => {
      await result.current.handleSave();
    });

    // Verify API call
    expect(mockApi.put).toHaveBeenCalled();

    // Verify Alert is shown with increase option
    expect(Alert.alert).toHaveBeenCalledWith(
      "Exercise Progress",
      "Your pain level is low and you've had consistent low pain for 3 days. Would you like to increase the difficulty for next time?",
      expect.arrayContaining([
        expect.objectContaining({ text: "No" }),
        expect.objectContaining({ text: "Yes" }),
      ])
    );
  });

  it("handleRemovalConfirmation should confirm removal when confirmed", async () => {
    const { result } = renderHook(() =>
      useExerciseUpdates(mockUserExerciseId, mockExerciseDifficulty)
    );

    mockApi.post.mockResolvedValueOnce({ status: 200 });

    await act(async () => {
      await result.current.handleRemovalConfirmation(true);
    });

    // Verify API call
    expect(mockCreateApiInstance).toHaveBeenCalled();
    expect(mockApi.post).toHaveBeenCalledWith(
      `/user-exercises/${mockUserExerciseId}/confirm_removal/`,
      { confirm: "yes" }
    );

    // Verify modal is closed
    expect(result.current.showRemovalConfirmation).toBe(false);

    // Verify correct alert is shown
    expect(Alert.alert).toHaveBeenCalledWith(
      "Exercise Removed",
      "This exercise has been removed from your routine due to high pain level. Please consult your healthcare provider.",
      expect.anything()
    );
  });

  it("handleRemovalConfirmation should keep exercise when not confirmed", async () => {
    const { result } = renderHook(() =>
      useExerciseUpdates(mockUserExerciseId, mockExerciseDifficulty)
    );

    mockApi.post.mockResolvedValueOnce({ status: 200 });

    await act(async () => {
      await result.current.handleRemovalConfirmation(false);
    });

    // Verify API call
    expect(mockApi.post).toHaveBeenCalledWith(
      `/user-exercises/${mockUserExerciseId}/confirm_removal/`,
      { confirm: "no" }
    );

    // Verify modal is closed
    expect(result.current.showRemovalConfirmation).toBe(false);

    // Verify correct alert is shown
    expect(Alert.alert).toHaveBeenCalledWith(
      "Exercise Kept",
      "Exercise kept in your routine. Consider modifying how you perform it or consulting your healthcare provider.",
      expect.anything()
    );
  });

  it("handleRemoval should remove the exercise", async () => {
    const { result } = renderHook(() =>
      useExerciseUpdates(mockUserExerciseId, mockExerciseDifficulty)
    );

    mockApi.put.mockResolvedValueOnce({ status: 200 });

    await act(async () => {
      await result.current.handleRemoval();
    });

    // Verify API call
    expect(mockApi.put).toHaveBeenCalledWith(
      `/user-exercises/${mockUserExerciseId}/remove_exercise/`
    );

    // Verify modal is closed
    expect(result.current.showRemovalConfirmation).toBe(false);

    // Verify correct alert is shown
    expect(Alert.alert).toHaveBeenCalledWith(
      "Exercise Removed",
      "This exercise has been removed from your routine. You can add it back on the dashboard.",
      expect.anything()
    );
  });

  it("handleSave should handle API errors", async () => {
    const { result } = renderHook(() =>
      useExerciseUpdates(mockUserExerciseId, mockExerciseDifficulty)
    );

    // Set required values
    act(() => {
      result.current.setReps(10);
      result.current.setSets(3);
      result.current.setPainLevel(2);
    });

    // Mock API error
    const mockError = new Error("API error");
    mockApi.put.mockRejectedValueOnce(mockError);

    // Mock console.error to avoid test output clutter
    const originalConsoleError = console.error;
    console.error = jest.fn();

    await act(async () => {
      await result.current.handleSave();
    });

    // Verify error handling
    expect(console.error).toHaveBeenCalledWith(
      "Error saving exercise:",
      mockError
    );
    expect(Alert.alert).toHaveBeenCalledWith(
      "Error",
      "Failed to save exercise completion. Please try again."
    );

    // Restore console.error
    console.error = originalConsoleError;
  });
});
