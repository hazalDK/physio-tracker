import { useEffect, useState } from "react";
import axios from "axios";
import { injuryTypesData } from "@/types/Injury";
import { getEnv } from "@/config";

/**
 * Custom hook to fetch and manage injury types data.
 * @returns {Object} - An object containing injury types data and loading state.
 */
export function useInjuryData(): {
  injuryTypes: injuryTypesData[];
  loading: boolean;
} {
  const [injuryTypes, setInjuryTypes] = useState<injuryTypesData[]>([]);
  const [loading, setLoading] = useState(true);

  // Function to fetch injury types data from the API and handle the loading state
  useEffect(() => {
    const fetchInjuryTypes = async () => {
      try {
        const apiUrl = getEnv("API_URL");
        const response = await axios.get<injuryTypesData[]>(
          `${apiUrl}/injury-types/`
        );
        setInjuryTypes(response.data);
      } catch (error) {
        console.error("Error fetching injury types:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInjuryTypes();
  }, []);

  return { injuryTypes, loading };
}
