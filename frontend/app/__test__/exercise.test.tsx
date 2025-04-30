import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import Exercise from "../exercise";
import renderer from "react-test-renderer";

// Mock dependencies
jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useRoute: () => ({
    params: {
      exerciseId: 1,
      userExerciseId: 2,
    },
  }),
  useNavigation: () => ({
    goBack: jest.fn(),
  }),
}));

jest.mock("react-native-youtube-iframe", () => "YoutubePlayer");
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));
jest.mock("react-native-element-dropdown", () => ({
  Dropdown: "Dropdown",
}));

// Mock hooks with jest.fn() for each implementation
const mockUseExerciseData = jest.fn();
jest.mock("@/hooks/useExerciseData", () => ({
  useExerciseData: () => mockUseExerciseData(),
}));

const mockUseVideoPlayer = jest.fn();
jest.mock("@/hooks/useVideoPlayer", () => ({
  useVideoPlayer: () => mockUseVideoPlayer(),
}));

const mockUseExerciseUpdates = jest.fn();
jest.mock("@/hooks/useExerciseUpdates", () => ({
  useExerciseUpdates: () => mockUseExerciseUpdates(),
}));

describe("Exercise Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Set default mock implementations
    mockUseExerciseData.mockReturnValue({
      loading: false,
      exercise: {
        id: 1,
        name: "Test Exercise",
        difficulty_level: "Medium",
        additional_notes: "Test notes for the exercise",
        youtube_url: "2pbHPfsC3-U",
      },
      userExercise: {
        id: 2,
        exercise_id: 1,
        reps: 10,
        sets: 3,
        hold: 5,
        completed: false,
      },
    });

    mockUseVideoPlayer.mockReturnValue({
      playing: false,
      onStateChange: jest.fn(),
    });

    mockUseExerciseUpdates.mockReturnValue({
      showCompletionForm: false,
      setShowCompletionForm: jest.fn(),
      showRemovalConfirmation: false,
      setShowRemovalConfirmation: jest.fn(),
      reps: 10,
      setReps: jest.fn(),
      sets: 3,
      setSets: jest.fn(),
      painLevel: 0,
      setPainLevel: jest.fn(),
      handleSave: jest.fn(),
      handleRemoval: jest.fn(),
      handleRemovalConfirmation: jest.fn(),
      getDropdownData: () => [
        { label: "1", value: 1 },
        { label: "2", value: 2 },
      ],
      getPainLevelData: () => [
        { label: "0 - No Pain", value: 0 },
        { label: "1 - Minimal", value: 1 },
      ],
    });
  });

  it("renders correctly with data", () => {
    const tree = renderer.create(<Exercise />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it("renders exercise details correctly", () => {
    const { getByText } = render(<Exercise />);

    // Check if exercise details are displayed
    expect(getByText("Test Exercise")).toBeTruthy();
    expect(getByText(/Reps: 10/)).toBeTruthy();
    expect(getByText(/Sets: 3/)).toBeTruthy();
    expect(getByText(/Hold: 5s/)).toBeTruthy();
    expect(getByText(/Difficulty: Medium/)).toBeTruthy();
    expect(getByText("Test notes for the exercise")).toBeTruthy();
  });

  it("shows complete and remove buttons", () => {
    const { getByText } = render(<Exercise />);

    expect(getByText("Complete")).toBeTruthy();
    expect(getByText("Remove")).toBeTruthy();
  });

  it("opens completion form modal when complete button is pressed", () => {
    // Create a mock for setShowCompletionForm
    const setShowCompletionFormMock = jest.fn();

    // Override the default mock implementation
    mockUseExerciseUpdates.mockReturnValue({
      ...mockUseExerciseUpdates(),
      setShowCompletionForm: setShowCompletionFormMock,
    });

    const { getByText } = render(<Exercise />);

    // Press the complete button
    const completeButton = getByText("Complete");
    fireEvent.press(completeButton);

    // Check if setShowCompletionForm was called with true
    expect(setShowCompletionFormMock).toHaveBeenCalledWith(true);
  });

  it("calls handleRemoval when remove button is pressed", () => {
    // Create a mock for handleRemoval
    const handleRemovalMock = jest.fn();

    // Override the default mock implementation
    mockUseExerciseUpdates.mockReturnValue({
      ...mockUseExerciseUpdates(),
      handleRemoval: handleRemovalMock,
    });

    const { getByText } = render(<Exercise />);

    // Press the remove button
    const removeButton = getByText("Remove");
    fireEvent.press(removeButton);

    // Check if handleRemoval was called
    expect(handleRemovalMock).toHaveBeenCalled();
  });

  it("renders completion form with correct fields when the exercise is not completed", () => {
    // Override the default mock implementation to show completion form
    mockUseExerciseUpdates.mockReturnValue({
      ...mockUseExerciseUpdates(),
      showCompletionForm: true,
    });

    const { getByText } = render(<Exercise />);

    // Check if modal title and fields are shown
    expect(getByText("Complete Exercise")).toBeTruthy();
    expect(getByText("Reps Completed")).toBeTruthy();
    expect(getByText("Sets Completed")).toBeTruthy();
    expect(getByText("Pain Level (0-10)")).toBeTruthy();
    expect(getByText("Save")).toBeTruthy();
  });

  // The specific test that's failing:
  it("renders completion form with correct fields when the exercise is completed", () => {
    // Override the default mock implementation to show completion form with is_completed: true
    mockUseExerciseData.mockReturnValue({
      loading: false,
      exercise: {
        id: 1,
        name: "Test Exercise",
        difficulty_level: "Medium",
        additional_notes: "Test notes for the exercise",
        youtube_url: "2pbHPfsC3-U",
      },
      userExercise: {
        id: 2,
        exercise_id: 1,
        reps: 10,
        sets: 3,
        hold: 5,
        completed: true,
      },
    });

    // Fix: Keep using the default mockUseExerciseUpdates implementation
    // but override only the showCompletionForm value
    mockUseExerciseUpdates.mockReturnValue({
      ...mockUseExerciseUpdates(),
      showCompletionForm: true,
    });

    const { getByText } = render(<Exercise />);

    expect(getByText("Complete Exercise")).toBeTruthy();
    expect(getByText("Reps Completed")).toBeTruthy();
    expect(getByText("Sets Completed")).toBeTruthy();
    expect(getByText("Pain Level (0-10)")).toBeTruthy();
    expect(getByText("Update")).toBeTruthy();
  });

  it("renders removal confirmation dialog", () => {
    // Override the default mock implementation to show removal confirmation
    mockUseExerciseUpdates.mockReturnValue({
      ...mockUseExerciseUpdates(),
      showRemovalConfirmation: true,
      painLevel: 7,
    });

    const { getByText } = render(<Exercise />);

    // Check if confirmation dialog is shown
    expect(getByText("Confirm Removal")).toBeTruthy();
    expect(
      getByText(/You've reported a pain level of 7 for this exercise/)
    ).toBeTruthy();
    expect(getByText("Yes")).toBeTruthy();
    expect(getByText("No")).toBeTruthy();
  });

  it("handles loading state", () => {
    // Override default mock implementation for loading state
    mockUseExerciseData.mockReturnValue({
      loading: true,
      exercise: null,
      userExercise: null,
    });

    const { getByTestId } = render(<Exercise />);

    // Check if loading indicator is shown
    expect(getByTestId("activity-indicator")).toBeTruthy();
  });

  it("handles exercise not found state", () => {
    // Override default mock implementation for exercise not found
    mockUseExerciseData.mockReturnValue({
      loading: false,
      exercise: null,
      userExercise: null,
    });

    const { getByText } = render(<Exercise />);

    // Check if error message is shown
    expect(getByText("Exercise not found")).toBeTruthy();
  });

  it("calls handleSave when save button is pressed in completion form", () => {
    // Create a mock for handleSave
    const handleSaveMock = jest.fn();

    // Override the default mock implementation
    mockUseExerciseUpdates.mockReturnValue({
      ...mockUseExerciseUpdates(),
      showCompletionForm: true,
      handleSave: handleSaveMock,
    });

    const { getByText } = render(<Exercise />);

    // Press the save button
    const saveButton = getByText("Save");
    fireEvent.press(saveButton);

    // Check if handleSave was called
    expect(handleSaveMock).toHaveBeenCalled();
  });

  it("calls handleRemovalConfirmation when yes button is pressed in removal dialog", () => {
    // Create a mock for handleRemovalConfirmation
    const handleRemovalConfirmationMock = jest.fn();

    // Override the default mock implementation
    mockUseExerciseUpdates.mockReturnValue({
      ...mockUseExerciseUpdates(),
      showRemovalConfirmation: true,
      handleRemovalConfirmation: handleRemovalConfirmationMock,
    });

    const { getByText } = render(<Exercise />);

    // Press the yes button
    const yesButton = getByText("Yes");
    fireEvent.press(yesButton);

    // Check if handleRemovalConfirmation was called with true
    expect(handleRemovalConfirmationMock).toHaveBeenCalledWith(true);
  });
});
