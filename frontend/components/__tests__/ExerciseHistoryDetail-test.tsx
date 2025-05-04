import * as React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import renderer from "react-test-renderer";

import ExerciseHistoryDetail from "../ExerciseHistoryDetail";

// Mock the custom hook
jest.mock("@/hooks/useExerciseHistory", () => ({
  useExerciseHistory: jest.fn(),
}));

// Mock the navigation hooks
jest.mock("@react-navigation/native", () => ({
  useFocusEffect: jest.fn((callback) => {
    // Execute the callback to simulate screen focus
    callback();
    return jest.fn();
  }),
}));

// Mock expo icons
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons-Mock",
}));

// Mock the tailwind
jest.mock("tailwind-react-native-classnames", () => ({
  __esModule: true,
  default: (styles: any) => styles,
}));

describe("ExerciseHistoryDetail Component", () => {
  // Setup the mock data for our tests
  const mockHistoryData = [
    {
      date: "2025-04-24",
      formatted_date: "April 24, 2025",
      pain_level: 3,
      exercises: [
        { name: "Squat", sets: 3, reps: 10, pain: 2 },
        { name: "Knee Extension", sets: 2, reps: 15, pain: 4 },
      ],
    },
    {
      date: "2025-04-23",
      formatted_date: "April 23, 2025",
      pain_level: 2,
      exercises: [{ name: "Leg raises", sets: 3, reps: 12, pain: 1 }],
    },
  ];

  // Mock implementation for useExerciseHistory hook
  beforeEach(() => {
    // Reset and setup our mock functions
    const { useExerciseHistory } = require("@/hooks/useExerciseHistory");

    // Default state - successful data load
    useExerciseHistory.mockReturnValue({
      loading: false,
      history: mockHistoryData,
      error: null,
      refreshHistory: jest.fn(),
    });
  });

  it("shows loading state", () => {
    const { useExerciseHistory } = require("@/hooks/useExerciseHistory");
    useExerciseHistory.mockReturnValue({
      loading: true,
      history: [],
      error: null,
      refreshHistory: jest.fn(),
    });

    const { getByTestId } = render(<ExerciseHistoryDetail />);
    expect(getByTestId("loading-indicator")).toBeDefined();
  });

  it("shows error state", () => {
    const { useExerciseHistory } = require("@/hooks/useExerciseHistory");
    useExerciseHistory.mockReturnValue({
      loading: false,
      history: [],
      error: "Failed to load exercise history",
      refreshHistory: jest.fn(),
    });

    const { getByText } = render(<ExerciseHistoryDetail />);
    expect(getByText("Failed to load exercise history")).toBeDefined();
    expect(getByText("Try Again")).toBeDefined();
  });

  it("shows empty state message when no history", () => {
    const { useExerciseHistory } = require("@/hooks/useExerciseHistory");
    useExerciseHistory.mockReturnValue({
      loading: false,
      history: [],
      error: null,
      refreshHistory: jest.fn(),
    });

    const { getByText } = render(<ExerciseHistoryDetail />);
    expect(
      getByText(
        "No exercise history found. Complete some exercises to see your history here."
      )
    ).toBeDefined();
  });

  it("expands and collapses exercise details when pressed", () => {
    const { getByText, queryByText } = render(<ExerciseHistoryDetail />);

    // Initially the detail should not be visible
    expect(queryByText("Squat")).toBeNull();

    // Press the date to expand
    fireEvent.press(getByText("April 24, 2025"));

    // Now the detail should be visible
    expect(getByText("Squat")).toBeDefined();
    expect(getByText("Sets: 3")).toBeDefined();

    // Press again to collapse
    fireEvent.press(getByText("April 24, 2025"));

    // Detail should be hidden again
    expect(queryByText("Squat")).toBeNull();
  });

  it("calls refreshHistory when pull-to-refresh is triggered", async () => {
    const mockRefreshHistory = jest.fn().mockResolvedValue(undefined);
    const { useExerciseHistory } = require("@/hooks/useExerciseHistory");
    useExerciseHistory.mockReturnValue({
      loading: false,
      history: mockHistoryData,
      error: null,
      refreshHistory: mockRefreshHistory,
    });

    const { getByTestId } = render(<ExerciseHistoryDetail />);
    const scrollView = getByTestId("scroll-view");

    // Trigger refresh
    fireEvent(scrollView, "refreshControl", { refreshing: false });

    await waitFor(() => {
      expect(mockRefreshHistory).toHaveBeenCalled();
    });
  });

  it("calls refreshHistory when Try Again button is pressed", () => {
    const mockRefreshHistory = jest.fn();
    const { useExerciseHistory } = require("@/hooks/useExerciseHistory");
    useExerciseHistory.mockReturnValue({
      loading: false,
      history: [],
      error: "Failed to load exercise history",
      refreshHistory: mockRefreshHistory,
    });

    const { getByText } = render(<ExerciseHistoryDetail />);
    const tryAgainButton = getByText("Try Again");

    fireEvent.press(tryAgainButton);

    expect(mockRefreshHistory).toHaveBeenCalled();
  });

  // Instead of testing styles directly, test the component rendering and behavior
  it("displays exercises with pain levels correctly", () => {
    const { getByText } = render(<ExerciseHistoryDetail />);

    // Expand the exercise list
    fireEvent.press(getByText("April 24, 2025"));

    // Check if both exercises are displayed
    expect(getByText("Squat")).toBeDefined();
    expect(getByText("Knee Extension")).toBeDefined();

    // Check if pain levels are displayed correctly
    expect(getByText("Pain: 2/10")).toBeDefined();
    expect(getByText("Pain: 4/10")).toBeDefined();

    // Verify our test data has the conditions we expect
    const lowPainExercise = mockHistoryData[0].exercises[0];
    const highPainExercise = mockHistoryData[0].exercises[1];

    expect(lowPainExercise.pain).toBeLessThanOrEqual(3);
    expect(highPainExercise.pain).toBeGreaterThan(3);
  });
});
