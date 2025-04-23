// hooks/useInjuryData.ts
import { useEffect, useState } from "react";
import axios from "axios";
import { injuryTypesData } from "@/types/Injury";

export function useInjuryData() {
  const [injuryTypes, setInjuryTypes] = useState<injuryTypesData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInjuryTypes = async () => {
      try {
        const apiUrl = process.env.API_URL || "http://192.168.68.111:8000";
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
