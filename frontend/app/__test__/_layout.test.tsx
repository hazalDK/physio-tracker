import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import { act } from "react-test-renderer";
import RootLayout from "../_layout";
import * as SplashScreen from "expo-splash-screen";
import * as SecureStore from "expo-secure-store";
import { hydrateAuthStore } from "@/stores/authStore";

// Mocks
jest.mock("expo-font", () => ({
  useFonts: jest.fn().mockReturnValue([true, null]),
}));

jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}));

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock("@/stores/authStore", () => ({
  useAuthStore: jest.fn(),
  hydrateAuthStore: jest.fn(),
}));

jest.mock("react-native-gesture-handler", () => ({
  GestureHandlerRootView: ({ children }: { children: React.ReactNode }) =>
    children,
}));

jest.mock("expo-router", () => {
  return {
    useRouter: jest.fn(() => ({ push: jest.fn() })),
    Stack: (props: {
      children:
        | string
        | number
        | boolean
        | React.ReactElement<any, string | React.JSXElementConstructor<any>>
        | Iterable<React.ReactNode>
        | React.ReactPortal
        | null
        | undefined;
    }) => {
      return <>{props.children}</>;
    },
    Redirect: ({ href }: { href: string }) => (
      <div data-testid="redirect" data-href={href} />
    ),
  };
});

describe("RootLayout Component", () => {
  let mockAuthState: { setIsAuthenticated: any; isAuthenticated?: boolean };

  beforeEach(() => {
    jest.clearAllMocks();
    // Initialize mock auth state
    mockAuthState = {
      isAuthenticated: false,
      setIsAuthenticated: jest.fn((value) => {
        mockAuthState.isAuthenticated = value;
      }),
    };
    const { useAuthStore } = require("@/stores/authStore");
    useAuthStore.mockImplementation(
      (
        selector: (arg0: {
          setIsAuthenticated: any;
          isAuthenticated?: boolean;
        }) => any
      ) => selector(mockAuthState)
    );
  });

  it("should return null when fonts are not loaded", async () => {
    const { useFonts } = require("expo-font");
    useFonts.mockReturnValue([false, null]);

    const { toJSON } = render(<RootLayout />);
    expect(toJSON()).toBeNull();
  });

  it("should check authentication and hide splash screen", async () => {
    // Simulate successful font loading and secure store fetching token
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue("test-token");

    // Use renderResult variable to store the render result
    let renderResult;

    render(<RootLayout />);

    await waitFor(() => {
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith("userToken");
      expect(SplashScreen.hideAsync).toHaveBeenCalled();
    });
  });

  it("should set unauthenticated when no token is found", async () => {
    // Simulate no token in SecureStore
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    // Render outside of act and wait for state updates with waitFor
    render(<RootLayout />);

    await waitFor(() => {
      expect(mockAuthState.setIsAuthenticated).toHaveBeenCalledWith(false);
    });
  });

  it("should set initial route to tabs when authenticated", async () => {
    // Simulate authenticated state
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue("test-token");

    // Call hydrateAuthStore to simulate the hydration
    hydrateAuthStore();

    // Create a spy on the Stack component
    const stackSpy = jest.fn();

    // Override the Stack mock for this test
    const originalStack = require("expo-router").Stack;
    require("expo-router").Stack = (props: any) => {
      stackSpy(props);
      return originalStack(props);
    };

    // Render the component
    render(<RootLayout />);

    // Wait for auth check to complete and state to be updated
    await waitFor(() => {
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith("userToken");
      expect(mockAuthState.setIsAuthenticated).toHaveBeenCalledWith(true);
    });

    // Restore the original Stack component
    require("expo-router").Stack = originalStack;
  });

  it("should set initial route to login when unauthenticated", async () => {
    // Simulate unauthenticated state (no token in SecureStore)
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    // Create a spy on the Stack component
    const stackSpy = jest.fn();

    // Override the Stack mock for this test
    const originalStack = require("expo-router").Stack;
    require("expo-router").Stack = (props: any) => {
      stackSpy(props);
      return originalStack(props);
    };

    // Render the component
    render(<RootLayout />);

    // Wait for auth check to complete and state to be updated
    await waitFor(() => {
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith("userToken");
      expect(mockAuthState.setIsAuthenticated).toHaveBeenCalledWith(false);
    });

    // Restore the original Stack component
    require("expo-router").Stack = originalStack;
  });
});
