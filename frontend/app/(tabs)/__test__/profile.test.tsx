import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";
import renderer from "react-test-renderer";
import { Alert } from "react-native";
import Profile from "../profile";
import { useProfileData } from "@/hooks/useProfileData";

// Mock the hooks
jest.mock("@/hooks/useProfileData");

// Mock DateTimePicker
jest.mock("@react-native-community/datetimepicker", () => {
  const mockComponent = ({
    onChange,
  }: {
    onChange: (event: { type: string }, date?: Date) => void;
  }) => {
    return (
      <button
        data-testid="date-picker-button"
        onClick={() => {
          return onChange({ type: "set" }, new Date("2000-01-01"));
        }}
      >
        Select Date
      </button>
    );
  };
  return mockComponent;
});

// Mock Alert
jest.spyOn(Alert, "alert").mockImplementation(() => {});

describe("Profile Component", () => {
  // Setup mock data for testing
  const mockUserProfile = {
    username: "testuser",
    first_name: "Test",
    last_name: "User",
    email: "test@example.com",
    date_of_birth: "1990-01-01",
    injury_type: 1,
  };

  const mockInjuryTypes = [
    { id: 1, name: "Sprain" },
    { id: 2, name: "Fracture" },
  ];

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  // Update the first test to provide mock data
  it("renders correctly with data", () => {
    // Add mock implementation before rendering
    (useProfileData as jest.Mock).mockReturnValue({
      loading: false,
      userProfile: mockUserProfile,
      injuryTypes: mockInjuryTypes,
      isModalVisible: false,
      toggleModal: jest.fn(),
    });

    let tree;
    act(() => {
      tree = renderer.create(<Profile />).toJSON();
    });
    expect(tree).toMatchSnapshot();
  });

  it("renders loading state when loading is true", () => {
    (useProfileData as jest.Mock).mockReturnValue({
      loading: true,
    });

    const { getByTestId } = render(<Profile />);
    expect(getByTestId("loading-indicator")).toBeTruthy();
  });

  it("renders user profile data correctly", () => {
    (useProfileData as jest.Mock).mockReturnValue({
      loading: false,
      userProfile: mockUserProfile,
      injuryTypes: mockInjuryTypes,
      isModalVisible: false,
    });

    const { getByText } = render(<Profile />);

    expect(getByText("testuser")).toBeTruthy();
    expect(getByText("Test User")).toBeTruthy();
    expect(getByText("test@example.com")).toBeTruthy();
    expect(getByText("01/01/1990")).toBeTruthy();
    expect(getByText("Sprain")).toBeTruthy();
    expect(getByText("Edit Profile")).toBeTruthy();
  });

  it('renders "Not provided" for missing profile data', () => {
    (useProfileData as jest.Mock).mockReturnValue({
      loading: false,
      userProfile: {
        injury_type: 3,
      },
      injuryTypes: mockInjuryTypes,
      isModalVisible: false,
    });

    const { getAllByText } = render(<Profile />);
    const notProvidedTexts = getAllByText("Not provided");

    // Should have multiple "Not provided" texts for username, name, email, DOB
    expect(notProvidedTexts.length).toBeGreaterThan(0);

    // Should show "Unknown" for injury type not in the list
    expect(getAllByText("Unknown").length).toBe(1);
  });

  it("opens edit profile modal when button is pressed", () => {
    const toggleModal = jest.fn();

    (useProfileData as jest.Mock).mockReturnValue({
      loading: false,
      userProfile: mockUserProfile,
      injuryTypes: mockInjuryTypes,
      isModalVisible: false,
      toggleModal,
    });

    const { getByText } = render(<Profile />);
    fireEvent.press(getByText("Edit Profile"));

    expect(toggleModal).toHaveBeenCalledTimes(1);
  });

  it("renders modal with profile data when open", () => {
    (useProfileData as jest.Mock).mockReturnValue({
      loading: false,
      userProfile: mockUserProfile,
      injuryTypes: mockInjuryTypes,
      isModalVisible: true,
      newUsername: "testuser",
      newFirstName: "Test",
      newLastName: "User",
      newEmail: "test@example.com",
      newDateOfBirth: new Date("1990-01-01"),
      open: false,
      isUpdating: false,
      setNewUsername: jest.fn(),
      setNewFirstName: jest.fn(),
      setNewLastName: jest.fn(),
      setNewEmail: jest.fn(),
      setNewDateOfBirth: jest.fn(),
      setOpen: jest.fn(),
      handleEditProfile: jest.fn(),
      toggleModal: jest.fn(),
    });

    const { getByText, getByPlaceholderText, getByTestId } = render(
      <Profile />
    );

    expect(getByText("Update Profile")).toBeTruthy();
    expect(getByPlaceholderText("username").props.value).toBe("testuser");
    expect(getByPlaceholderText("first name").props.value).toBe("Test");
    expect(getByPlaceholderText("last name").props.value).toBe("User");
    expect(getByPlaceholderText("email").props.value).toBe("test@example.com");
    expect(getByTestId("datetime-text").props.children).toBe("01/01/1990");
  });

  it("handles text input changes in modal", () => {
    const setNewUsername = jest.fn();
    const setNewFirstName = jest.fn();
    const setNewLastName = jest.fn();
    const setNewEmail = jest.fn();

    (useProfileData as jest.Mock).mockReturnValue({
      loading: false,
      userProfile: mockUserProfile,
      injuryTypes: mockInjuryTypes,
      isModalVisible: true,
      newUsername: "",
      newFirstName: "",
      newLastName: "",
      newEmail: "",
      newDateOfBirth: null,
      open: false,
      isUpdating: false,
      setNewUsername,
      setNewFirstName,
      setNewLastName,
      setNewEmail,
      setNewDateOfBirth: jest.fn(),
      setOpen: jest.fn(),
      handleEditProfile: jest.fn(),
      toggleModal: jest.fn(),
    });

    const { getByPlaceholderText } = render(<Profile />);

    fireEvent.changeText(getByPlaceholderText("username"), "newusername");
    fireEvent.changeText(getByPlaceholderText("first name"), "New");
    fireEvent.changeText(getByPlaceholderText("last name"), "Name");
    fireEvent.changeText(getByPlaceholderText("email"), "new@example.com");

    expect(setNewUsername).toHaveBeenCalledWith("newusername");
    expect(setNewFirstName).toHaveBeenCalledWith("New");
    expect(setNewLastName).toHaveBeenCalledWith("Name");
    expect(setNewEmail).toHaveBeenCalledWith("new@example.com");
  });

  it("opens date picker when date field is pressed", () => {
    const setOpen = jest.fn();

    (useProfileData as jest.Mock).mockReturnValue({
      loading: false,
      userProfile: mockUserProfile,
      injuryTypes: mockInjuryTypes,
      isModalVisible: true,
      newUsername: "testuser",
      newFirstName: "Test",
      newLastName: "User",
      newEmail: "test@example.com",
      newDateOfBirth: new Date("1990-01-01"),
      open: false,
      isUpdating: false,
      setNewUsername: jest.fn(),
      setNewFirstName: jest.fn(),
      setNewLastName: jest.fn(),
      setNewEmail: jest.fn(),
      setNewDateOfBirth: jest.fn(),
      setOpen,
      handleEditProfile: jest.fn(),
      toggleModal: jest.fn(),
    });

    const { getByTestId } = render(<Profile />);

    fireEvent.press(getByTestId("date-picker-button"));
    expect(setOpen).toHaveBeenCalledWith(true);
  });

  it("clears date of birth when clear button is pressed", () => {
    const setNewDateOfBirth = jest.fn();

    (useProfileData as jest.Mock).mockReturnValue({
      loading: false,
      userProfile: mockUserProfile,
      injuryTypes: mockInjuryTypes,
      isModalVisible: true,
      newUsername: "testuser",
      newFirstName: "Test",
      newLastName: "User",
      newEmail: "test@example.com",
      newDateOfBirth: new Date("1990-01-01"),
      open: false,
      isUpdating: false,
      setNewUsername: jest.fn(),
      setNewFirstName: jest.fn(),
      setNewLastName: jest.fn(),
      setNewEmail: jest.fn(),
      setNewDateOfBirth,
      setOpen: jest.fn(),
      handleEditProfile: jest.fn(),
      toggleModal: jest.fn(),
    });

    const { getByText } = render(<Profile />);

    fireEvent.press(getByText("Clear"));
    expect(setNewDateOfBirth).toHaveBeenCalledWith(undefined);
  });

  it("calls handleEditProfile when update button is pressed", () => {
    const handleEditProfile = jest.fn();

    (useProfileData as jest.Mock).mockReturnValue({
      loading: false,
      userProfile: mockUserProfile,
      injuryTypes: mockInjuryTypes,
      isModalVisible: true,
      newUsername: "testuser",
      newFirstName: "Test",
      newLastName: "User",
      newEmail: "test@example.com",
      newDateOfBirth: new Date("1990-01-01"),
      open: false,
      isUpdating: false,
      setNewUsername: jest.fn(),
      setNewFirstName: jest.fn(),
      setNewLastName: jest.fn(),
      setNewEmail: jest.fn(),
      setNewDateOfBirth: jest.fn(),
      setOpen: jest.fn(),
      handleEditProfile,
      toggleModal: jest.fn(),
    });

    const { getByText } = render(<Profile />);

    fireEvent.press(getByText("Update"));
    expect(handleEditProfile).toHaveBeenCalledTimes(1);
  });

  it("disables inputs and buttons when updating", () => {
    (useProfileData as jest.Mock).mockReturnValue({
      loading: false,
      userProfile: mockUserProfile,
      injuryTypes: mockInjuryTypes,
      isModalVisible: true,
      newUsername: "testuser",
      newFirstName: "Test",
      newLastName: "User",
      newEmail: "test@example.com",
      newDateOfBirth: new Date("1990-01-01"),
      open: false,
      isUpdating: true,
      setNewUsername: jest.fn(),
      setNewFirstName: jest.fn(),
      setNewLastName: jest.fn(),
      setNewEmail: jest.fn(),
      setNewDateOfBirth: jest.fn(),
      setOpen: jest.fn(),
      handleEditProfile: jest.fn(),
      toggleModal: jest.fn(),
    });

    const { getByText, getByPlaceholderText } = render(<Profile />);

    expect(getByPlaceholderText("username").props.editable).toBe(false);
    expect(getByPlaceholderText("first name").props.editable).toBe(false);
    expect(getByPlaceholderText("last name").props.editable).toBe(false);
    expect(getByPlaceholderText("email").props.editable).toBe(false);
    expect(getByText("Updating...")).toBeTruthy();
  });

  it("handles email input changes in modal", () => {
    const setNewEmail = jest.fn();

    (useProfileData as jest.Mock).mockReturnValue({
      loading: false,
      userProfile: mockUserProfile,
      injuryTypes: mockInjuryTypes,
      isModalVisible: true,
      newUsername: "testuser",
      newFirstName: "Test",
      newLastName: "User",
      newEmail: "test@example.com",
      newDateOfBirth: new Date("1990-01-01"),
      open: false,
      isUpdating: false,
      setNewUsername: jest.fn(),
      setNewFirstName: jest.fn(),
      setNewLastName: jest.fn(),
      setNewEmail,
      setNewDateOfBirth: jest.fn(),
      setOpen: jest.fn(),
      handleEditProfile: jest.fn(),
      toggleModal: jest.fn(),
    });

    const { getByTestId } = render(<Profile />);

    fireEvent.changeText(getByTestId("email-input"), "updated@example.com");
    expect(setNewEmail).toHaveBeenCalledWith("updated@example.com");
  });

  it("shows error message for invalid email format", () => {
    const setNewEmail = jest.fn();
    const setEmailError = jest.fn();

    (useProfileData as jest.Mock).mockReturnValue({
      loading: false,
      userProfile: mockUserProfile,
      injuryTypes: mockInjuryTypes,
      isModalVisible: true,
      newUsername: "testuser",
      newFirstName: "Test",
      newLastName: "User",
      newEmail: "test@gmail",
      newDateOfBirth: new Date("1990-01-01"),
      open: false,
      isUpdating: false,
      setNewUsername: jest.fn(),
      setNewFirstName: jest.fn(),
      setNewLastName: jest.fn(),
      setNewEmail,
      setNewDateOfBirth: jest.fn(),
      setOpen: jest.fn(),
      handleEditProfile: jest.fn(),
      toggleModal: jest.fn(),
      setEmailError,
    });

    const { getByTestId, getByText } = render(<Profile />);

    fireEvent.changeText(getByTestId("email-input"), "invalid-email-format");
    expect(() =>
      getByText("Please enter a valid email (e.g., user@example.com).")
    ).toThrow();
  });
});
