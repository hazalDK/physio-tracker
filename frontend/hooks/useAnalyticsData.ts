import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "./useAuth";

// Helper function to format date
const formatDate = (date: Date) => {
  return date.toISOString().split("T")[0];
};

// Type for analytics data (can be either adherence or pain data)
interface ChartData {
  labels: string[];
  datasets: {
    data: number[];
  }[];
}

/**
 * Custom hook to fetch and manage analytics data (adherence or pain levels).
 * @param {string} endpoint - The API endpoint to fetch data from.
 * @param {"adherence" | "pain"} dataType - The type of data to fetch (either adherence or pain).
 * @returns {Object} - An object containing loading state, chart data, average, history, error, and functions to navigate weeks.
 * @throws {Error} - Throws an error if the API call fails.
 * */
export function useAnalyticsData<T>(
  endpoint: string,
  dataType: "adherence" | "pain"
): object {
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<ChartData>({
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [{ data: [0, 0, 0, 0, 0, 0, 0] }],
  });
  const [average, setAverage] = useState(0);
  const [history, setHistory] = useState<T[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Add week navigation state
  const [currentEndDate, setCurrentEndDate] = useState(new Date());
  const [weekTitle, setWeekTitle] = useState("Current Week");
  const { createApiInstance, refreshToken } = useAuth();

  // Function to go to previous week
  const goToPreviousWeek = () => {
    const newEndDate = new Date(currentEndDate);
    newEndDate.setDate(newEndDate.getDate() - 7);
    setCurrentEndDate(newEndDate);
    fetchData(newEndDate);
    updateWeekTitle(newEndDate);
  };

  // Function to go to next week (but not beyond current date)
  const goToNextWeek = () => {
    const today = new Date();
    const newEndDate = new Date(currentEndDate);
    newEndDate.setDate(newEndDate.getDate() + 7);

    // Don't go beyond current date
    if (newEndDate > today) {
      newEndDate.setTime(today.getTime());
    }

    setCurrentEndDate(newEndDate);
    fetchData(newEndDate);
    updateWeekTitle(newEndDate);
  };

  // Update week title based on date range
  const updateWeekTitle = (endDate: Date) => {
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 6);

    const today = new Date();
    const isCurrentWeek =
      today.getDate() === endDate.getDate() &&
      today.getMonth() === endDate.getMonth() &&
      today.getFullYear() === endDate.getFullYear();

    if (isCurrentWeek) {
      setWeekTitle("Current Week");
    } else {
      const startMonth = startDate.toLocaleString("default", {
        month: "short",
      });
      const endMonth = endDate.toLocaleString("default", { month: "short" });

      if (startMonth === endMonth) {
        setWeekTitle(
          `${startMonth} ${startDate.getDate()} - ${endDate.getDate()}`
        );
      } else {
        setWeekTitle(
          `${startMonth} ${startDate.getDate()} - ${endMonth} ${endDate.getDate()}`
        );
      }
    }
  };

  // Function to fetch data for a specific end date
  const fetchData = async (endDate: Date) => {
    setLoading(true);
    try {
      const api = await createApiInstance();
      if (!api) return;

      try {
        // Fetch stats from the API with date parameter
        const response = await api.get(
          `${endpoint}?end_date=${formatDate(endDate)}`
        );
        if (response.data) {
          setChartData(response.data.chart_data);

          if (dataType === "adherence") {
            setAverage(response.data.average_adherence);
          } else {
            setAverage(response.data.average_pain);
          }

          setHistory(response.data.history);
        }
      } catch (error) {
        // Handle 401 error by refreshing the token and retrying the request
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          // Attempt token refresh
          const newToken = await refreshToken();
          if (!newToken) return;

          const api = await createApiInstance();
          if (!api) return;

          // Retry with new token
          const response = await api.get(
            `${endpoint}?end_date=${formatDate(endDate)}`
          );

          if (response.data) {
            setChartData(response.data.chart_data);

            if (dataType === "adherence") {
              setAverage(response.data.average_adherence);
            } else {
              setAverage(response.data.average_pain);
            }

            setHistory(response.data.history);
          }
        } else {
          // Handle other errors
          console.error("API request failed:", error);
          setError(
            `Failed to load your ${
              dataType === "adherence" ? "exercises" : "pain data"
            }. Please check your connection and try again.`
          );
        }
      }
    } catch (error) {
      console.error(
        `Failed to load your ${
          dataType === "adherence" ? "exercises" : "pain data"
        }.`
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial data fetch for current week
    fetchData(currentEndDate);
    updateWeekTitle(currentEndDate);
  }, []);

  return {
    loading,
    chartData,
    average,
    history,
    error,
    weekTitle,
    goToPreviousWeek,
    goToNextWeek,
  };
}
