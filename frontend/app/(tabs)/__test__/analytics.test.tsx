import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { NavigationContainer } from "@react-navigation/native";
import Analytics from "../analytics";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";

// Mock the dependencies
jest.mock("@/hooks/useAnalyticsData");

// Mock useFocusEffect to prevent infinite loops
jest.mock("@react-navigation/native", () => {
  const actualNav = jest.requireActual("@react-navigation/native");
  return {
    ...actualNav,
    useFocusEffect: jest.fn((callback) => callback()),
  };
});

// Mock expo-font
jest.mock("expo-font", () => ({
  isLoaded: jest.fn(() => true),
  loadAsync: jest.fn(() => Promise.resolve()),
  __internal__: {
    getAssetForModule: jest.fn(() => 1),
  },
  Font: {
    isLoaded: jest.fn(() => true),
    loadAsync: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const mockIcon = (props) => React.createElement("Icon", props);

  // Return an object with all common icon sets
  return {
    Entypo: mockIcon,
    Ionicons: mockIcon,
    FontAwesome: mockIcon,
    MaterialIcons: mockIcon,
    MaterialCommunityIcons: mockIcon,
    // Add other icon sets you're using
    createIconSet: jest.fn(() => mockIcon),
  };
});

jest.mock("@react-navigation/material-top-tabs", () => {
  const { View } = require("react-native");
  return {
    createMaterialTopTabNavigator: () => ({
      Navigator: ({ children }) => <View>{children}</View>,
      Screen: ({ component: Component }) => <Component />,
    }),
  };
});

jest.mock("react-native-chart-kit", () => ({
  LineChart: () => "LineChart",
  BarChart: () => "BarChart",
}));

jest.mock("@/components/ExerciseHistoryDetail", () => "ExerciseHistoryDetail");

describe("Analytics Component", () => {
  // Mock data for adherence test
  const mockAdherenceData = {
    loading: false,
    chartData: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [{ data: [75, 80, 100, 85, 90, 70, 95] }],
    },
    average: 85,
    history: [
      { date: "2025-04-23", completed: 3, adherence: 75 },
      { date: "2025-04-24", completed: 4, adherence: 100 },
    ],
    error: null,
    weekTitle: "April 20 - April 26, 2025",
    goToPreviousWeek: jest.fn(),
    goToNextWeek: jest.fn(),
    refreshData: jest.fn(),
  };

  // Mock data for pain test
  const mockPainData = {
    loading: false,
    chartData: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [{ data: [5, 4, 3, 4, 2, 3, 2] }],
    },
    average: 3.3,
    history: [
      { date: "2025-04-23", exercises: 3, pain_level: 4 },
      { date: "2025-04-24", exercises: 4, pain_level: 2 },
    ],
    error: null,
    weekTitle: "April 20 - April 26, 2025",
    goToPreviousWeek: jest.fn(),
    goToNextWeek: jest.fn(),
    refreshData: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders AdherenceGraph correctly with data", () => {
    (useAnalyticsData as jest.Mock).mockReturnValue(mockAdherenceData);

    const { getByText, getByTestId } = render(
      <NavigationContainer>
        <Analytics />
      </NavigationContainer>
    );

    expect(getByText("Average Adherence: 85%")).toBeTruthy();
    expect(getByText("Weekly Adherence")).toBeTruthy();
    expect(getByText("Exercise History")).toBeTruthy();
    expect(getByTestId("week-title")).toHaveTextContent(
      "April 20 - April 26, 2025"
    );
  });

  it("renders PainLevelGraph correctly with data", () => {
    (useAnalyticsData as jest.Mock).mockReturnValue(mockPainData);

    const { getByText, getByTestId } = render(
      <NavigationContainer>
        <Analytics />
      </NavigationContainer>
    );

    expect(getByText("Average Pain Level: 3.3/10")).toBeTruthy();
    expect(getByText("Weekly Pain Levels")).toBeTruthy();
    expect(getByText("Pain History")).toBeTruthy();
    expect(getByTestId("pain-week-title")).toHaveTextContent(
      "April 20 - April 26, 2025"
    );
  });

  it("shows loading indicator when data is loading for adherence", () => {
    console.log("Mocking loading state for adherence data");
    (useAnalyticsData as jest.Mock).mockReturnValue({
      ...mockAdherenceData,
      loading: true,
    });

    const { getByTestId } = render(
      <NavigationContainer>
        <Analytics />
      </NavigationContainer>
    );

    // Note: You need to add testID="loading-indicator" to the ActivityIndicator
    expect(getByTestId("loading-indicator")).toBeTruthy();
  });

  it("shows error message when there is an error for adherence", () => {
    const errorMessage = "Failed to load data";
    (useAnalyticsData as jest.Mock).mockReturnValue({
      ...mockAdherenceData,
      error: errorMessage,
    });

    const { getByTestId } = render(
      <NavigationContainer>
        <Analytics />
      </NavigationContainer>
    );

    expect(getByTestId("adherence-error-message")).toBeTruthy();
  });

  it("shows error message when there is an error for pain level", () => {
    const errorMessage = "Failed to load data";
    (useAnalyticsData as jest.Mock).mockReturnValue({
      ...mockPainData,
      error: errorMessage,
    });

    const { getByTestId } = render(
      <NavigationContainer>
        <Analytics />
      </NavigationContainer>
    );

    expect(getByTestId("pain-error-message")).toBeTruthy();
  });

  it("navigation controls work correctly for adherence", () => {
    (useAnalyticsData as jest.Mock).mockReturnValue(mockAdherenceData);

    const { getByTestId } = render(
      <NavigationContainer>
        <Analytics />
      </NavigationContainer>
    );

    // Note: You need to add testID attributes to these buttons
    fireEvent.press(getByTestId("prev-week-button"));
    expect(mockAdherenceData.goToPreviousWeek).toHaveBeenCalledTimes(1);

    fireEvent.press(getByTestId("next-week-button"));
    expect(mockAdherenceData.goToNextWeek).toHaveBeenCalledTimes(1);
  });

  it("refreshes data on focus for pain level", () => {
    (useAnalyticsData as jest.Mock).mockReturnValue(mockPainData);

    render(
      <NavigationContainer>
        <Analytics />
      </NavigationContainer>
    );

    expect(mockPainData.refreshData).toHaveBeenCalledTimes(2);
  });

  it("refreshes data on focus for adherence", () => {
    (useAnalyticsData as jest.Mock).mockReturnValue(mockAdherenceData);

    render(
      <NavigationContainer>
        <Analytics />
      </NavigationContainer>
    );

    expect(mockAdherenceData.refreshData).toHaveBeenCalledTimes(2);
  });

  it("shows loading indicator when pain level data is loading", () => {
    console.log("Mocking loading state for pain level data");
    (useAnalyticsData as jest.Mock).mockReturnValue({
      ...mockPainData,
      loading: true,
    });

    const { getByTestId } = render(
      <NavigationContainer>
        <Analytics />
      </NavigationContainer>
    );

    expect(getByTestId("pain_level_loading-indicator")).toBeTruthy();
  });
});
