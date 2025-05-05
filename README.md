# Project Setup Instructions

This guide provides step-by-step instructions for setting up both the frontend and backend of the application.

## Finding Your Local IP Address

Before setting up the environment variables, you'll need to find your local IP address:

- **Windows**:

  - Open Command Prompt and type `ipconfig`
  - Look for the IPv4 Address under your active network adapter (usually starts with 192.168.x.x)

- **macOS/Linux**:
  - Open Terminal and type `ifconfig` (or `ip addr` on some Linux systems)
  - Look for the inet address under your active network adapter (usually starts with 192.168.x.x)

You'll need this IP address to connect your frontend and backend applications.

## Backend Setup (Django)

1. Configure environment variables:

   Please note that the chatbot will not work if there is no OPENAI API Key so please use one of yours if possible.
   Configure the `.env` file in the project root with the following variables:

   ```
   OPENAI_API_KEY="<your-key>"
   API_URL="http://192.168.68.111:8000"
   HOST_DOMAIN="192.168.68.111"
   # Replace 192.168.x.x with your actual IP address
   # replace OPENAI API key with your own key since secret keys cannot be pushed into public repositories
   ```

2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Run migrations:

   ```bash
   python manage.py migrate
   ```

4. Start the server:
   ```bash
   # To make the server accessible on your local network:
   python manage.py runserver 0.0.0.0:8000
   # This makes your Django server available at your IP address
   ```

## Frontend Setup (React Native)

1. Create and configure environment variables:

   Configure the `.env` file in the frontend project root with the following variables:

   ```
   API_URL=http://192.168.68.111:8000
   # Replace 192.168.x.x with your actual IP address from the step above
   # Do NOT use localhost as it won't work when testing on physical devices
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the app:
   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a:

- [Development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

## Note on Environment Files

The project is configured to allow committing `.env` files to the repository. This is intended for easier setup.
