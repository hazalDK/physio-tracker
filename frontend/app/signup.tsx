import { Link } from "@react-navigation/native";
import { useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import axios from "axios";
import {
  View,
  Text,
  Pressable,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import { TextInput } from "react-native-gesture-handler";
import tw from "tailwind-react-native-classnames";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { useInjuryData } from "@/hooks/useInjuryData";
import { useAuthStore } from "@/stores/authStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getEnv } from "@/config";

// Signup component for user registration.
// This component allows users to enter their personal information, including name, email, password, and injury type.
// It handles the registration process, including validation and API calls to create a new user account.
interface SignupProps {
  testInjuryType?: any;
  setInjuryTypeForTest?: (
    setter: React.Dispatch<React.SetStateAction<any>>
  ) => void;
}

export default function Signup({
  testInjuryType,
  setInjuryTypeForTest,
}: SignupProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState(new Date());
  const [open, setOpen] = useState(false);
  const { injuryTypes, loading: injuryLoading } = useInjuryData();
  const [injuryType, setInjuryType] = useState();
  const [passwordError, setPasswordError] = useState("");
  const [securePassword, setSecurePassword] = useState(false);
  const [secureConfirmPassword, setSecureConfirmPassword] = useState(false);
  const [isFocus, setIsFocus] = useState(false);
  const setIsAuthenticated = useAuthStore((state) => state.setIsAuthenticated);
  const insets = useSafeAreaInsets();

  // Support for tests - allow setting injury type from props
  useEffect(() => {
    if (testInjuryType) {
      setInjuryType(testInjuryType);
    }
  }, [testInjuryType]);

  // Allow test to set injury type
  useEffect(() => {
    if (setInjuryTypeForTest) {
      setInjuryTypeForTest(setInjuryType);
    }
  }, [setInjuryTypeForTest]);

  // Register the user
  async function handleRegister() {
    // Check if all required fields are filled
    if (
      !firstName ||
      !lastName ||
      !username ||
      !email ||
      !password ||
      !confirmPassword ||
      !injuryType ||
      !dateOfBirth
    ) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }

    // Check if passwords match - Moved this check here to ensure it gets priority
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    // Check if email is valid
    if (!validateEmail(email)) {
      setEmailError("Invalid email format.");
      Alert.alert("Error", "Invalid email format. (e.g., user@example.com)");
      return;
    }

    // Check if password meets criteria
    if (!validatePassword(password)) {
      setPasswordError("Password does not meet requirements.");
      Alert.alert(
        "Error",
        "Password must be at least 8 characters long, contain uppercase and lowercase letters, a number, and a special character."
      );
      return;
    }

    try {
      const apiUrl = getEnv("API_URL");

      // Format the date properly
      const formattedDate = dateOfBirth.toISOString().split("T")[0];

      // Make the API call to register the user
      const response = await axios.post(
        `${apiUrl}/users/register/`,
        {
          username: username.trim(),
          email: email.trim(),
          password: password,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          date_of_birth: formattedDate,
          injury_type: injuryType || null,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      // Store tokens
      await SecureStore.setItemAsync("access_token", response.data.access);
      await SecureStore.setItemAsync("refresh_token", response.data.refresh);
      setIsAuthenticated(true);
      // Navigate to the home screen
      router.replace("/(tabs)");
    } catch (error: any) {
      console.error(
        "Registration failed:",
        error.response?.data || error.message
      );

      // Handle error messages from the server
      // Check if the error response contains specific fields
      let errorMessage = "Please check your information and try again";

      if (error.response?.data) {
        // Handle different types of error responses
        if (error.response.data.username) {
          errorMessage = `Username: ${error.response.data.username.join(" ")}`;
        } else if (error.response.data.email) {
          errorMessage = `Email: ${error.response.data.email.join(" ")}`;
        } else if (error.response.data.non_field_errors) {
          errorMessage = error.response.data.non_field_errors.join(" ");
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        }
      }

      Alert.alert("Registration Failed", errorMessage);
    }
  }

  // Regex validation for password
  const validatePassword = (password: string) => {
    const regex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(password);
  };

  // Regex validation for email
  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Basic email regex
    return regex.test(email);
  };

  // Injury type data for dropdown
  const injuryData = injuryTypes.map((item) => ({
    label: item.name,
    value: item.id,
  }));

  // Input field style
  const inputStyle = tw`flex text-center bg-gray-200 w-64 h-10 border rounded justify-center mb-4`;
  const inputTextStyle = {
    color: "#8f8e8e",
    placeholderTextColor: "#8f8e8e",
    borderColor: "#e5e7eb",
    borderWidth: 1,
    outlineColor: "#ccc",
    textAlign: "center" as "center", // Explicitly cast to allowed type
  };

  return (
    <KeyboardAvoidingView
      style={tw`flex-1`}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={[tw`flex-1 bg-white`, { paddingTop: insets.top }]}
        contentContainerStyle={tw`pb-10`}
        showsVerticalScrollIndicator={false}
      >
        <View style={tw`flex-1 justify-center items-center py-8 px-4`}>
          <Text
            style={[
              tw`text-3xl font-semibold mb-2`,
              {
                color: "#14b8a6",
              },
            ]}
          >
            Registration
          </Text>
          <Text style={[tw`mb-10`, { color: "#8f8e8e" }]}>
            Already Registered? Log in{" "}
            <Link screen="login" params={{}}>
              <Text style={{ color: "#14b8a6", fontWeight: "bold" }}>here</Text>
            </Link>
          </Text>

          <Text style={[tw` ml-4 mb-1 mr-1`, { color: "#8f8e8e" }]}>
            First Name
          </Text>
          <TextInput
            style={[inputStyle, inputTextStyle]}
            placeholder="Enter first name here"
            value={firstName}
            onChangeText={setFirstName}
          />

          <Text style={[tw` ml-4 mb-1 mr-1`, { color: "#8f8e8e" }]}>
            Last Name
          </Text>
          <TextInput
            style={[inputStyle, inputTextStyle]}
            placeholder="Enter last name here"
            value={lastName}
            onChangeText={setLastName}
          />

          <Text style={[tw` ml-4 mb-1 mr-1`, { color: "#8f8e8e" }]}>
            Username
          </Text>
          <TextInput
            style={[inputStyle, inputTextStyle]}
            placeholder="Enter username here"
            value={username}
            onChangeText={setUsername}
          />

          <Text style={[tw` ml-4 mb-1 mr-1`, { color: "#8f8e8e" }]}>Email</Text>
          <TextInput
            style={[inputStyle, inputTextStyle]}
            placeholder="example@gmail.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (!validateEmail(text)) {
                setEmailError(
                  "Please enter a valid email (e.g., user@example.com)."
                );
              } else {
                setEmailError("");
              }
            }}
            keyboardType="email-address"
          />
          {emailError ? (
            <Text style={[tw` ml-4 mb-1 -mt-2`, { color: "red" }]}>
              {emailError}
            </Text>
          ) : null}

          <Text style={[tw` ml-4 mb-1 mr-1`, { color: "#8f8e8e" }]}>
            Password
          </Text>
          <View style={tw`flex-row items-center mb-4 w-64`}>
            <TextInput
              style={[
                tw`flex text-center bg-gray-200 flex-1 h-10 border rounded justify-center`,
                inputTextStyle,
              ]}
              placeholder="****"
              testID="password-input"
              secureTextEntry={!securePassword}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (!validatePassword(text)) {
                  setPasswordError(
                    "Password must be 8+ chars with uppercase, lowercase, number, and special char."
                  );
                } else {
                  setPasswordError("");
                }
              }}
            />
            <TouchableOpacity
              style={tw`absolute right-3`}
              onPress={() => setSecurePassword(!securePassword)}
            >
              <Text testID="secure-password" style={{ fontSize: 16 }}>
                {securePassword ? "🙈" : "👁️"}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[tw` ml-4 mb-1 mr-1`, { color: "#8f8e8e" }]}>
            Confirm Password
          </Text>
          <View style={tw`flex-row items-center mb-4 w-64`}>
            <TextInput
              style={[
                tw`flex text-center bg-gray-200 flex-1 h-10 border rounded justify-center`,
                inputTextStyle,
              ]}
              testID="confirm-password-input"
              placeholder="****"
              secureTextEntry={!secureConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity
              style={tw`absolute right-3`}
              onPress={() => setSecureConfirmPassword(!secureConfirmPassword)}
            >
              <Text testID="secure-confirm-password" style={{ fontSize: 16 }}>
                {secureConfirmPassword ? "🙈" : "👁️"}
              </Text>
            </TouchableOpacity>
          </View>
          {passwordError ? (
            <Text
              style={[tw`text-xs text-red-500 mb-2 px-4`, { maxWidth: 300 }]}
            >
              {passwordError}
            </Text>
          ) : null}

          <Text style={[tw`ml-4 mr-1 mb-1`, { color: "#8f8e8e" }]}>
            Date of Birth
          </Text>
          {open && (
            <DateTimePicker
              testID="date-time-picker"
              value={dateOfBirth}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setOpen(false);
                if (selectedDate) {
                  setDateOfBirth(selectedDate);
                }
              }}
              maximumDate={new Date()}
            />
          )}
          <TouchableOpacity
            style={[inputStyle, inputTextStyle]}
            onPress={() => setOpen(true)}
            testID="date-picker-button"
          >
            <Text style={{ color: "#8f8e8e" }}>
              {dateOfBirth.toLocaleDateString()}
            </Text>
          </TouchableOpacity>

          <Text style={[tw` ml-4 mb-1 mr-1`, { color: "#8f8e8e" }]}>
            Injury Type
          </Text>
          <Dropdown
            style={[
              tw`bg-gray-200 w-64 h-10 border rounded mb-6 px-4`,
              {
                borderColor: "#e5e7eb",
                borderWidth: 1,
                ...(isFocus && { borderColor: "#14b8a6", borderWidth: 2 }),
              },
            ]}
            containerStyle={tw`rounded-md shadow-md`}
            data={injuryData}
            search
            searchPlaceholder="Search..."
            maxHeight={300}
            placeholder="Select injury type"
            placeholderStyle={{ color: "#8f8e8e" }}
            selectedTextStyle={{ color: "#14b8a6" }}
            inputSearchStyle={{ height: 40, borderColor: "#e5e7eb" }}
            labelField="label"
            valueField="value"
            value={injuryType}
            onFocus={() => setIsFocus(true)}
            onBlur={() => setIsFocus(false)}
            onChange={(item) => {
              setInjuryType(item.value);
              setIsFocus(false);
            }}
            renderLeftIcon={() => (
              <Text style={[tw`mr-2 text-gray-500`, { fontSize: 16 }]}>🩹</Text>
            )}
            testID="injury-dropdown"
          />

          <Pressable
            style={({ pressed, hovered }) => [
              tw`flex items-center p-4 rounded-xl mt-2 mb-2 w-64`,
              {
                backgroundColor: hovered ? "#0d9488" : "#14b8a6",
                opacity: pressed ? 0.8 : 1,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 3,
                elevation: 2,
              },
            ]}
            onPress={handleRegister}
          >
            <Text style={tw`text-white font-semibold`}>Sign Up</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
