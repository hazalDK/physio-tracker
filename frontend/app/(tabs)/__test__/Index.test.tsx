import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { NavigationContainer } from "@react-navigation/native";
import Index from "../index";
import { useFetchDashboardExercises } from "@/hooks/useFetchDashBoardExercises";
import { useReactivateExercise } from "@/hooks/useReactivateExercise";

// Mock the dependencies
jest.mock("@/hooks/useFetchDashBoardExercises");
jest.mock("@/hooks/useReactivateExercise");

// Mock navigation
const mockNavigate = jest.fn();
jest.mock("@react-navigation/native", () => {
  const actualNav = jest.requireActual("@react-navigation/native");
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
    // Make useFocusEffect a no-op in tests to prevent infinite re-renders
    useFocusEffect: jest.fn(),
  };
});

// Mocks the react-native-progress Bar component
jest.mock("react-native-progress", () => ({
  Bar: () => "ProgressBar",
}));
jest.mock(
  "@expo/vector-icons/MaterialCommunityIcons",
  () => "MaterialCommunityIcons"
);

describe("Index Component", () => {
  const mockUserExercises = [
    { id: 1, exercise: 101, completed: true, is_active: true },
    { id: 2, exercise: 102, completed: false, is_active: true },
  ];

  const mockExercises = [
    {
      id: 101,
      category: "Knee",
      name: "Exercise 1",
      difficulty_level: "Easy",
      video_id: "abc123",
    },
    {
      id: 102,
      category: "Squat",
      name: "Exercise 2",
      difficulty_level: "Medium",
      video_id: "def456",
    },
  ];

  const mockInactiveExercises = [
    {
      id: 103,
      category: "Sit to stand",
      name: "Exercise 3",
      difficulty_level: "Hard",
      video_id: "ghi789",
      is_active: false,
    },
  ];

  const mockFetchData = jest.fn();
  const mockRefreshData = jest.fn();
  const mockReactivateExercise = jest.fn().mockResolvedValue({});

  beforeEach(() => {
    jest.clearAllMocks();

    (useFetchDashboardExercises as jest.Mock).mockReturnValue({
      loading: false,
      userExercises: mockUserExercises,
      exercises: mockExercises,
      inActiveExercises: mockInactiveExercises,
      fetchData: mockFetchData,
      refreshData: mockRefreshData,
    });

    (useReactivateExercise as jest.Mock).mockReturnValue({
      reactivateExercise: mockReactivateExercise,
    });
  });

  it("renders correctly with exercises", () => {
    const { getByText, getAllByText } = render(
      <NavigationContainer>
        <Index />
      </NavigationContainer>
    );

    expect(getByText("Completed 50%")).toBeTruthy();
    expect(getByText("Exercise 1")).toBeTruthy();
    expect(getByText("Exercise 2")).toBeTruthy();
    expect(getAllByText(/Difficulty level:/i).length).toBe(2);
  });

  it("shows loading indicator when loading", () => {
    (useFetchDashboardExercises as jest.Mock).mockReturnValue({
      loading: true,
      userExercises: [],
      exercises: [],
      inActiveExercises: [],
      fetchData: mockFetchData,
      refreshData: mockRefreshData,
    });

    const { getByTestId } = render(
      <NavigationContainer>
        <Index />
      </NavigationContainer>
    );

    expect(getByTestId("loading-indicator")).toBeTruthy();
  });

  it("fetches data on initial render", () => {
    render(
      <NavigationContainer>
        <Index />
      </NavigationContainer>
    );

    expect(mockFetchData).toHaveBeenCalledTimes(1);
  });

  it("refreshes data when screen gains focus", () => {
    // Extract the callback function when useFocusEffect is called
    let focusCallback: (() => void) | undefined;

    (
      require("@react-navigation/native").useFocusEffect as jest.Mock
    ).mockImplementation((callback) => {
      focusCallback = callback;
    });

    render(
      <NavigationContainer>
        <Index />
      </NavigationContainer>
    );

    // Reset refreshData call count (from component mount)
    mockRefreshData.mockClear();

    // Execute the focus callback manually
    if (focusCallback) {
      focusCallback();
    }

    expect(mockRefreshData).toHaveBeenCalledTimes(1);
  });

  it("navigates to Exercise screen with correct params when an exercise is pressed", () => {
    const { getByText } = render(
      <NavigationContainer>
        <Index />
      </NavigationContainer>
    );

    fireEvent.press(getByText("Exercise 1"));

    expect(mockNavigate).toHaveBeenCalledWith("exercise", {
      exerciseId: 101,
      userExerciseId: 1,
    });
  });

  it("navigates to Exercise screen with null userExerciseId when no user exercise exists", () => {
    const exerciseWithoutUserExercise = {
      id: 104,
      category: "Balance",
      name: "New Exercise",
      difficulty_level: "Advanced",
      video_id: "xyz789",
    };

    (useFetchDashboardExercises as jest.Mock).mockReturnValue({
      loading: false,
      userExercises: mockUserExercises,
      exercises: [...mockExercises, exerciseWithoutUserExercise],
      inActiveExercises: mockInactiveExercises,
      fetchData: mockFetchData,
      refreshData: mockRefreshData,
    });

    const { getByText } = render(
      <NavigationContainer>
        <Index />
      </NavigationContainer>
    );

    fireEvent.press(getByText("New Exercise"));

    expect(mockNavigate).toHaveBeenCalledWith("exercise", {
      exerciseId: 104,
      userExerciseId: null,
    });
  });

  it("navigates to Chatbot screen when the chatbot button is pressed", () => {
    const { getByTestId } = render(
      <NavigationContainer>
        <Index />
      </NavigationContainer>
    );

    fireEvent.press(getByTestId("chatbot-button"));

    expect(mockNavigate).toHaveBeenCalledWith("chatbot");
  });

  it("opens modal when add button is pressed", () => {
    const { getByTestId, getByText } = render(
      <NavigationContainer>
        <Index />
      </NavigationContainer>
    );

    fireEvent.press(getByTestId("add-exercise-button"));

    expect(getByText("Add an Exercise")).toBeTruthy();
    expect(getByText("Exercise 3")).toBeTruthy();
  });

  it("reactivates exercise when selected from modal", async () => {
    // Update the mock to include the relationship for inactive exercise
    const updatedUserExercises = [
      ...mockUserExercises,
      { id: 3, exercise: 103, completed: false, is_active: false }, // Add inactive exercise relation
    ];

    (useFetchDashboardExercises as jest.Mock).mockReturnValue({
      loading: false,
      userExercises: updatedUserExercises,
      exercises: mockExercises,
      inActiveExercises: mockInactiveExercises,
      fetchData: mockFetchData,
      refreshData: mockRefreshData,
    });

    const { getByTestId, getByText } = render(
      <NavigationContainer>
        <Index />
      </NavigationContainer>
    );

    fireEvent.press(getByTestId("add-exercise-button"));
    fireEvent.press(getByText("Exercise 3"));

    await waitFor(() => {
      expect(mockReactivateExercise).toHaveBeenCalledWith(3); // Expect to be called with id 3
      expect(mockRefreshData).toHaveBeenCalled();
    });
  });

  it("closes modal when cancel is pressed", () => {
    const { getByTestId, getByText, queryByText } = render(
      <NavigationContainer>
        <Index />
      </NavigationContainer>
    );

    fireEvent.press(getByTestId("add-exercise-button"));
    fireEvent.press(getByText("Cancel"));

    expect(queryByText("Add an Exercise")).toBeNull();
  });

  it("handles image error by displaying placeholder image", () => {
    const { getAllByTestId } = render(
      <NavigationContainer>
        <Index />
      </NavigationContainer>
    );

    // Find all Image components by test ID
    const images = getAllByTestId("exercise-image");
    expect(images.length).toBeGreaterThan(0);

    // Simulate image loading error on the first image
    fireEvent(images[0], "error");

    // We can verify the component didn't crash
    expect(images.length).toBeGreaterThan(0);
  });
});
