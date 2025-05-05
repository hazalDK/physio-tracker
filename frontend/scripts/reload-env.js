// scripts/reload-env.js
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

// Path to .env file
const envPath = path.resolve(__dirname, "../.env");
// Path to app.config.ts
const configPath = path.resolve(__dirname, "../app.config.ts");
// Path to cache buster file
const cacheFilePath = path.resolve(__dirname, "../.env-cache-timestamp");

// Check if .env file exists
if (!fs.existsSync(envPath)) {
  console.error("❌ Error: .env file not found at", envPath);
  console.log("Creating a sample .env file...");
  fs.writeFileSync(envPath, "API_URL=http://localhost:8000\n", "utf8");
  console.log(
    "✅ Sample .env file created. Please edit it with your actual values."
  );
  process.exit(1);
}

// Read and validate .env file
try {
  const envContent = fs.readFileSync(envPath, "utf8");
  const lines = envContent.split("\n");

  // Check for common formatting errors
  let hasErrors = false;
  lines.forEach((line, index) => {
    line = line.trim();
    if (line && !line.startsWith("#")) {
      // Check for invalid characters in variable assignment
      if (line.includes("**=**") || line.includes("**")) {
        console.error(`❌ Line ${index + 1} has invalid formatting: ${line}`);
        console.error(
          "   Should not contain ** characters. Correct format is KEY=VALUE"
        );
        hasErrors = true;
      }

      // Check for placeholder values
      if (
        line.includes("xx.xxx") ||
        line.includes("your-") ||
        line.includes("<")
      ) {
        console.warn(
          `⚠️ Line ${index + 1} appears to contain a placeholder: ${line}`
        );
        console.warn(
          "   Make sure to replace placeholders with actual values."
        );
      }
    }
  });

  if (hasErrors) {
    console.error(
      "❌ Found formatting errors in .env file. Please fix them and try again."
    );
    process.exit(1);
  }

  // Load environment variables
  const result = dotenv.config();

  if (result.error) {
    console.error("❌ Error parsing .env file:", result.error);
    process.exit(1);
  }

  console.log("✅ .env file validated successfully");
  console.log("Environment variables loaded:");

  // Display loaded environment variables
  Object.keys(result.parsed || {}).forEach((key) => {
    const value = result.parsed[key];
    // Mask sensitive values
    const displayValue =
      key.includes("SECRET") || key.includes("KEY") || key.includes("PASSWORD")
        ? "******"
        : value;
    console.log(`   ${key}=${displayValue}`);
  });
} catch (error) {
  console.error("❌ Error reading .env file:", error);
  process.exit(1);
}

try {
  // Read the current app.config.ts file
  let configContent = fs.readFileSync(configPath, "utf8");

  // Update the timestamp in the file to force a reload
  const newTimestamp = new Date().getTime();

  // Replace any existing timestamp with a new one
  if (configContent.includes("timestamp = new Date().getTime()")) {
    configContent = configContent.replace(
      /timestamp = new Date\(\)\.getTime\(\)/,
      `timestamp = ${newTimestamp} // Updated at ${new Date().toISOString()}`
    );
  }

  // Write the updated config back to the file
  fs.writeFileSync(configPath, configContent, "utf8");

  // Update the cache buster file
  fs.writeFileSync(cacheFilePath, newTimestamp.toString(), "utf8");

  console.log(`✅ Environment timestamp updated to ${newTimestamp}`);
  console.log("✅ API_URL set to:", process.env.API_URL || "Not defined");
  console.log("✅ Cache buster updated");
  console.log("\n🔄 Please restart your Expo server with:");
  console.log("   npm start -- --clear");
  console.log("   or");
  console.log("   expo start --clear\n");
} catch (error) {
  console.error("❌ Error updating environment timestamp:", error);
  process.exit(1);
}
