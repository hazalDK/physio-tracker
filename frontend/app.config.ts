// app.config.js
export default ({ config }) => {
  // Load environment variables based on the environment
  let apiUrl;

  if (process.env.NODE_ENV === "production") {
    apiUrl = "https://your-production-api.com";
  } else if (process.env.NODE_ENV === "staging") {
    apiUrl = "https://your-staging-api.com";
  } else {
    // Development environment - you can also set this from .env file
    // if you install dotenv package
    apiUrl = process.env.API_URL || "http://localhost:8000";
  }

  return {
    ...config,
    extra: {
      API_URL: apiUrl,
      // Add any other environment variables here
    },
  };
};
