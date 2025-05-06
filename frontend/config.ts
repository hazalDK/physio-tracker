import Constants from "expo-constants";

// Define the shape of our environment variables
interface EnvVariables {
  API_URL: string;
  ENV_TIMESTAMP?: number; // Timestamp to track when env was loaded
  // Add other environment variables as needed
}

// Default values for development
const DEFAULT_ENV: EnvVariables = {
  API_URL: "http://localhost:8000",
};

// Get environment variables from Expo Constants
// The extra property is populated from app.config.js/app.json
export const ENV: EnvVariables = {
  ...DEFAULT_ENV,
  ...Constants.expoConfig?.extra,
};

// Helper function to get environment values with type safety
export function getEnv<T extends keyof EnvVariables>(key: T): EnvVariables[T] {
  return ENV[key];
}
