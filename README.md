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
   API_URL="http://192.168.xx.xxx:8000"
   HOST_DOMAIN="192.168.xx.xxx"
   # Replace 192.168.xx.xxx with your actual IP address
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

You can open the server at your IP address in this format (http://192.168.xx.xxx:8000/)

## Frontend Setup (React Native)

1. Create and configure environment variables:

   Configure the `.env` file in the frontend project root with the following variables:

   ```
   API_URL=http://192.168.68.111:8000
   # Replace 192.168.x.x with your actual IP address from the step above
   # Do NOT use localhost as it won't work when testing on physical devices
   ```

2. Go the frontend directory
   ```bash
   cd frontend
   ```
   
3. Install dependencies:
   ```bash
   npm install
   ```

4. Reset API_URL (For any caching issues)
   ```bash
   # Command Prompt:
   set API_URL=
   # For PowerShell:
   $env:API_URL = $null
   # For Mac/Linux:
   unset API_URL
   ```
   
5. Reload the env after configuring the URL
   ``` bash
   npm run reload-env
   ```

6. Start the app:
   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a:

- [Development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

Please note that the backend must be running for the frontend to work.

## Run unit tests for the backend

1. Gather all static files into the staticfiles directory
```bash
python manage.py collectstatic
```

2. Run the test command
```bash
python manage.py test
```

## Run unit tests for the frontend

1. Go the frontend directory
   ```bash
   cd frontend
   ```

2. Run the test command
   ```bash
   npm test
   ```

## Note on Environment Files

The project is configured to allow committing `.env` files to the repository. This is intended for easier setup.
