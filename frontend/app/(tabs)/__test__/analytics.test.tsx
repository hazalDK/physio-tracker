import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import renderer, { act } from "react-test-renderer";
import { NavigationContainer } from "@react-navigation/native";
import Analytics, { AdherenceGraph, PainLevelGraph } from "../analytics"; // You'll need to export these components
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

// Mock expo/vector-icons
jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const mockIcon = (props: { color?: string; size?: number }) =>
    React.createElement("Icon", { ...props });

  return {
    Entypo: mockIcon,
    Ionicons: mockIcon,
    FontAwesome: mockIcon,
    MaterialIcons: mockIcon,
    MaterialCommunityIcons: mockIcon,
    createIconSet: jest.fn(() => mockIcon),
  };
});

// Mock react-native-chart-kit with testable components
jest.mock("react-native-chart-kit", () => {
  const React = require("react");
  const { View, Text } = require("react-native");

  const LineChart = (props: { data: any }) => (
    <View testID="line-chart" data-chartdata={JSON.stringify(props.data)}>
      <Text>LineChart</Text>
    </View>
  );

  const BarChart = (props: { data: any }) => (
    <View testID="bar-chart" data-chartdata={JSON.stringify(props.data)}>
      <Text>BarChart</Text>
    </View>
  );

  return { LineChart, BarChart };
});

// Mock the createMaterialTopTabNavigator
jest.mock("@react-navigation/material-top-tabs", () => {
  const React = require("react");
  const { View, Text } = require("react-native");

  const createMaterialTopTabNavigator = () => {
    return {
      Navigator: ({
        children,
        screenOptions,
      }: {
        children: React.ReactNode;
        screenOptions?: any;
      }) => (
        <View testID="tab-navigator" style={screenOptions?.tabBarStyle}>
          {children}
        </View>
      ),
      Screen: ({
        name,
        options,
      }: {
        name: string;
        options?: { tabBarIcon?: (props: { color: string }) => JSX.Element };
      }) => (
        <View testID={`tab-screen-${name}`}>
          <Text>{name}</Text>
          {options?.tabBarIcon && options.tabBarIcon({ color: "#14b8a6" })}
        </View>
      ),
    };
  };

  return { createMaterialTopTabNavigator };
});

// Mock ExerciseHistoryDetail component
jest.mock("@/components/ExerciseHistoryDetail", () => {
  const React = require("react");
  const { View, Text } = require("react-native");

  return {
    __esModule: true,
    default: () => (
      <View testID="exercise-history-detail">
        <Text>Exercise History Detail</Text>
      </View>
    ),
  };
});

describe("Analytics Screen", () => {
  // Mock data for all tests
  const mockAdherenceData = {
    loading: false,
    chartData: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [{ data: [75, 80, 100, 85, 90, 70, 95] }],
    },
    average: 85,
    history: [
      { date: "Sunday, April 27", completed: "3/4", adherence: 75 },
      { date: "Saturday, April 26", completed: "4/4", adherence: 100 },
    ],
    error: null,
    weekTitle: "April 20 - April 26, 2025",
    goToPreviousWeek: jest.fn(),
    goToNextWeek: jest.fn(),
    refreshData: jest.fn(),
  };

  const mockPainData = {
    loading: false,
    chartData: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [{ data: [5, 4, 3, 4, 2, 3, 2] }],
    },
    average: 3.3,
    history: [
      { date: "Sunday, April 27", exercises: 3, pain_level: 4 },
      { date: "Saturday, April 26", exercises: 4, pain_level: 2 },
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

  it("renders correctly", () => {
    (useAnalyticsData as jest.Mock).mockImplementation((url, type) => {
      if (type === "adherence") return mockAdherenceData;
      if (type === "pain") return mockPainData;
      return {};
    });

    const tree = renderer.create(
      <NavigationContainer>
        <Analytics />
      </NavigationContainer>
    );
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders the tab navigator with three tabs", () => {
    (useAnalyticsData as jest.Mock).mockImplementation((url, type) => {
      if (type === "adherence") return mockAdherenceData;
      if (type === "pain") return mockPainData;
      return {};
    });

    const { getByTestId } = render(
      <NavigationContainer>
        <Analytics />
      </NavigationContainer>
    );

    // Check that tab navigator exists
    const tabNavigator = getByTestId("tab-navigator");
    expect(tabNavigator).toBeTruthy();

    // Check that all three tabs exist
    expect(getByTestId("tab-screen-Adherence")).toBeTruthy();
    expect(getByTestId("tab-screen-Pain Level")).toBeTruthy();
    expect(getByTestId("tab-screen-History")).toBeTruthy();
  });

  it("applies correct styling to tab navigator", () => {
    (useAnalyticsData as jest.Mock).mockImplementation((url, type) => {
      if (type === "adherence") return mockAdherenceData;
      if (type === "pain") return mockPainData;
      return {};
    });

    const { getByTestId } = render(
      <NavigationContainer>
        <Analytics />
      </NavigationContainer>
    );

    const tabNavigator = getByTestId("tab-navigator");

    // Test important style properties
    expect(tabNavigator.props.style).toMatchObject({
      backgroundColor: "#fff",
      borderWidth: 1,
      height: 70,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      position: "absolute",
    });
  });
});

describe("AdherenceGraph Component", () => {
  // Mock data for adherence test
  const mockAdherenceData = {
    loading: false,
    chartData: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [{ data: [75, 80, 100, 85, 90, 70, 95] }],
    },
    average: 85,
    history: [
      { date: "Sunday, April 27", completed: "3/4", adherence: 75 },
      { date: "Saturday, April 26", completed: "4/4", adherence: 100 },
    ],
    error: null,
    weekTitle: "April 20 - April 26, 2025",
    goToPreviousWeek: jest.fn(),
    goToNextWeek: jest.fn(),
    refreshData: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAnalyticsData as jest.Mock).mockReturnValue(mockAdherenceData);
  });

  it("renders AdherenceGraph snapshot", async () => {
    let tree: any;

    await act(async () => {
      tree = renderer.create(<AdherenceGraph />);
      // Allow any pending state updates to complete
      await new Promise((resolve) => setImmediate(resolve));
    });

    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("displays adherence data correctly", () => {
    const { getByText, getByTestId } = render(<AdherenceGraph />);

    // Test average
    expect(getByText("Average Adherence: 85%")).toBeTruthy();

    // Test week title
    expect(getByTestId("week-title")).toHaveTextContent(
      "April 20 - April 26, 2025"
    );

    // Test chart is rendered
    expect(getByTestId("line-chart")).toBeTruthy();

    // Test history items
    expect(getByTestId("adherence-history-date-0")).toHaveTextContent(
      "Sunday, April 27"
    );
    expect(getByText("3/4 active exercises completed")).toBeTruthy();
    expect(getByText("Adherence: 75%")).toBeTruthy();
  });

  it("handles navigation controls correctly", () => {
    const { getByTestId } = render(<AdherenceGraph />);

    // Test previous week button
    fireEvent.press(getByTestId("prev-week-button"));
    expect(mockAdherenceData.goToPreviousWeek).toHaveBeenCalledTimes(1);

    // Test next week button
    fireEvent.press(getByTestId("next-week-button"));
    expect(mockAdherenceData.goToNextWeek).toHaveBeenCalledTimes(1);
  });

  it("shows loading state correctly", () => {
    (useAnalyticsData as jest.Mock).mockReturnValue({
      ...mockAdherenceData,
      loading: true,
    });

    const { getByTestId } = render(<AdherenceGraph />);
    expect(getByTestId("loading-indicator")).toBeTruthy();
  });

  it("shows error state correctly", () => {
    (useAnalyticsData as jest.Mock).mockReturnValue({
      ...mockAdherenceData,
      error: "Failed to load data",
    });

    const { getByTestId } = render(<AdherenceGraph />);
    expect(getByTestId("adherence-error-message")).toHaveTextContent(
      "Failed to load data"
    );
  });
});

describe("PainLevelGraph Component", () => {
  // Mock data for pain level test
  const mockPainData = {
    loading: false,
    chartData: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [{ data: [5, 4, 3, 4, 2, 3, 2] }],
    },
    average: 3.3,
    history: [
      { date: "Sunday, April 27", exercises: 3, pain_level: 4 },
      { date: "Saturday, April 26", exercises: 4, pain_level: 2 },
    ],
    error: null,
    weekTitle: "April 20 - April 26, 2025",
    goToPreviousWeek: jest.fn(),
    goToNextWeek: jest.fn(),
    refreshData: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAnalyticsData as jest.Mock).mockReturnValue(mockPainData);
  });

  it("renders PainLevelGraph snapshot", async () => {
    let tree: any;

    await act(async () => {
      tree = renderer.create(<PainLevelGraph />);
      // Allow any pending state updates to complete
      await new Promise((resolve) => setImmediate(resolve));
    });

    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("displays pain level data correctly", () => {
    const { getByText, getByTestId } = render(<PainLevelGraph />);

    // Test average
    expect(getByText("Average Pain Level: 3.3/10")).toBeTruthy();

    // Test week title
    expect(getByTestId("pain-week-title")).toHaveTextContent(
      "April 20 - April 26, 2025"
    );

    // Test chart is rendered
    expect(getByTestId("bar-chart")).toBeTruthy();

    // Test history items
    expect(getByTestId("pain-history-date-0")).toHaveTextContent(
      "Sunday, April 27"
    );
    expect(getByText("3 exercises completed")).toBeTruthy();
    expect(getByText("Pain Level: 4/10")).toBeTruthy();
  });

  it("handles navigation controls correctly", () => {
    const { getByTestId } = render(<PainLevelGraph />);

    // Test previous week button
    fireEvent.press(getByTestId("pain_level_prev_week_button"));
    expect(mockPainData.goToPreviousWeek).toHaveBeenCalledTimes(1);

    // Test next week button
    fireEvent.press(getByTestId("pain_level_next_week_button"));
    expect(mockPainData.goToNextWeek).toHaveBeenCalledTimes(1);
  });

  it("shows loading state correctly", () => {
    (useAnalyticsData as jest.Mock).mockReturnValue({
      ...mockPainData,
      loading: true,
    });

    const { getByTestId } = render(<PainLevelGraph />);
    expect(getByTestId("pain_level_loading-indicator")).toBeTruthy();
  });

  it("shows error state correctly", () => {
    (useAnalyticsData as jest.Mock).mockReturnValue({
      ...mockPainData,
      error: "Failed to load data",
    });

    const { getByTestId } = render(<PainLevelGraph />);
    expect(getByTestId("pain-error-message")).toHaveTextContent(
      "Failed to load data"
    );
  });
});
