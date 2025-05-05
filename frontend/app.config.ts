import "dotenv/config"; // Make sure dotenv is installed
import fs from "fs";
import path from "path";

const envPath = path.resolve(__dirname, "../.env");
// Create a cache buster file if it doesn't exist
const CACHE_FILE = ".env-cache-timestamp";
if (!fs.existsSync(CACHE_FILE)) {
  fs.writeFileSync(CACHE_FILE, Date.now().toString());
}

// Read cache buster value
const cacheBuster = fs.readFileSync(CACHE_FILE, "utf8");

export default ({ config }) => {
  // Use a fixed timestamp value that gets updated by the reload-env script
  const timestamp = 1746449886624; // Updated at 2025-05-05T12:58:06.624Z; // This line gets replaced by the script

  console.log(`Loading environment variables at ${timestamp}`);
  console.log(`Cache buster: ${cacheBuster}`);

  // Force reload .env file
  require("dotenv").config({ override: true });

  // Debug logging - show where API_URL is coming from
  console.log("API_URL from process.env:", process.env.API_URL);

  // Try to read directly from .env file
  try {
    const envContent = fs.readFileSync(envPath, "utf8");
    const envLines = envContent.split("\n");
    const apiUrlLine = envLines.find((line) =>
      line.trim().startsWith("API_URL=")
    );
    if (apiUrlLine) {
      console.log("API_URL from .env file:", apiUrlLine.trim().split("=")[1]);
    }
  } catch (error) {
    console.log("Error reading .env file directly:", error.message);
  }

  // Load environment variables based on the environment
  let apiUrl;

  if (process.env.NODE_ENV === "production") {
    apiUrl = process.env.PROD_API_URL || "https://your-production-api.com";
    console.log("Using production API URL");
  } else if (process.env.NODE_ENV === "staging") {
    apiUrl = process.env.STAGING_API_URL || "https://your-staging-api.com";
    console.log("Using staging API URL");
  } else {
    // Development environment - force load from .env
    apiUrl = process.env.API_URL || "http://localhost:8000";
    console.log("Using development API URL");
  }

  console.log(`API URL set to: ${apiUrl}`);

  return {
    ...config,
    extra: {
      API_URL: apiUrl,
      ENV_TIMESTAMP: timestamp,
      CACHE_BUSTER: cacheBuster,
      // Add any other environment variables here
    },
  };
};
