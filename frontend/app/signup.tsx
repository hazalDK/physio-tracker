import { Link } from "@react-navigation/native";
import { useState } from "react";
import * as SecureStore from "expo-secure-store";
import axios from "axios";
import { View, Text, Pressable, TouchableOpacity, Alert } from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import { TextInput } from "react-native-gesture-handler";
import tw from "tailwind-react-native-classnames";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { useInjuryData } from "@/hooks/useInjuryData";

// Signup component for user registration.
// This component allows users to enter their personal information, including name, email, password, and injury type.
// It handles the registration process, including validation and API calls to create a new user account.
export default function Signup() {
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

  // Register the user
  async function handleRegister() {
    // Check if email is valid
    if (!validateEmail(email)) {
      setEmailError("Invalid email format.");
      Alert.alert("Error", "Invalid email format.");
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

    // Validation first
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (
      !firstName ||
      !lastName ||
      !username ||
      !email ||
      !password ||
      !dateOfBirth
    ) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }

    try {
      const apiUrl = process.env.API_URL || "http://192.168.68.111:8000";

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

  return (
    <View style={tw`flex-1 justify-center items-center bg-white`}>
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
          here
        </Link>
      </Text>
      <Text style={[tw`mb-2`, { color: "#8f8e8e" }]}>First Name:</Text>
      <TextInput
        style={[
          tw`flex text-center bg-gray-200 w-56 h-8 border rounded justify-center mb-4`,
          {
            color: "#8f8e8e",
            borderColor: "#e5e7eb",
            borderWidth: 1,
            outlineColor: "#ccc",
          },
        ]}
        placeholder="Enter first name here"
        value={firstName}
        onChangeText={setFirstName}
      />
      <Text style={[tw`mb-2`, { color: "#8f8e8e" }]}>Last Name:</Text>
      <TextInput
        style={[
          tw`flex text-center bg-gray-200 w-56 h-8 border rounded justify-center mb-4`,
          {
            color: "#8f8e8e",
            borderColor: "#e5e7eb",
            borderWidth: 1,
            outlineColor: "#ccc",
          },
        ]}
        placeholder="Enter last name here"
        value={lastName}
        onChangeText={setLastName}
      />
      <Text style={[tw`mb-2`, { color: "#8f8e8e" }]}>Username:</Text>
      <TextInput
        style={[
          tw`flex text-center bg-gray-200 w-56 h-8 border rounded justify-center mb-4`,
          {
            color: "#8f8e8e",
            borderColor: "#e5e7eb",
            borderWidth: 1,
            outlineColor: "#ccc",
          },
        ]}
        placeholder="Enter username here"
        value={username}
        onChangeText={setUsername}
      />
      <Text style={[tw`mb-2`, { color: "#8f8e8e" }]}>Email:</Text>
      <TextInput
        style={[
          tw`flex text-center bg-gray-200 w-56 h-8 border rounded justify-center mb-4`,
          {
            color: "#8f8e8e",
            borderColor: "#e5e7eb",
            borderWidth: 1,
            outlineColor: "#ccc",
          },
        ]}
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
      <Text style={[tw`mb-2`, { color: "#8f8e8e" }]}>Password:</Text>
      <View style={tw`flex-row items-center mb-4`}>
        <TextInput
          style={[
            tw`flex text-center bg-gray-200 w-48 h-8 border rounded justify-center`,
            {
              color: "#8f8e8e",
              borderColor: "#e5e7eb",
              borderWidth: 1,
              outlineColor: "#ccc",
            },
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
          style={tw`ml-2`}
          onPress={() => setSecurePassword(!securePassword)}
        >
          <Text testID="secure-password">{securePassword ? "🙈" : "👁️"}</Text>
        </TouchableOpacity>
      </View>
      <Text style={[tw`mb-2`, { color: "#8f8e8e" }]}>Confirm password:</Text>
      <View style={tw`flex-row items-center mb-4`}>
        <TextInput
          style={[
            tw`flex text-center bg-gray-200 w-48 h-8 border rounded justify-center`,
            {
              color: "#8f8e8e",
              borderColor: "#e5e7eb",
              borderWidth: 1,
              outlineColor: "#ccc",
            },
          ]}
          testID="confirm-password-input"
          placeholder="****"
          secureTextEntry={!secureConfirmPassword}
          value={confirmPassword}
          onChangeText={(text) => {
            setConfirmPassword(text);
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
          style={tw`ml-2`}
          onPress={() => setSecureConfirmPassword(!secureConfirmPassword)}
        >
          <Text testID="secure-confirm-password">
            {secureConfirmPassword ? "🙈" : "👁️"}
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={[tw`mb-2`, { color: "#8f8e8e" }]}>Date of birth:</Text>
      {open && (
        <DateTimePicker
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
        style={[
          tw`flex text-center bg-gray-200 w-56 h-8 border rounded justify-center mb-4`,
          {
            borderColor: "#e5e7eb",
            borderWidth: 1,
          },
        ]}
        onPress={() => setOpen(true)}
      >
        <Text style={{ color: "#8f8e8e" }}>
          {dateOfBirth.toLocaleDateString()}
        </Text>
      </TouchableOpacity>
      <Text style={[tw`mb-2`, { color: "#8f8e8e" }]}>Injury type:</Text>
      <Dropdown
        style={[
          tw`flex bg-gray-200 w-56 h-8 border rounded justify-center mb-6 px-2`,
          {
            borderColor: "#e5e7eb",
            borderWidth: 1,
          },
        ]}
        data={injuryData}
        placeholder="Select injury type"
        placeholderStyle={{ color: "#8f8e8e" }}
        selectedTextStyle={{ color: "#8f8e8e" }}
        labelField="label"
        valueField="value"
        value={injuryType}
        onChange={(item) => setInjuryType(item.value)}
      />
      <Pressable
        style={({ pressed, hovered }) => [
          tw`flex items-center p-4 rounded-xl mt-5 mb-2 w-60`,
          {
            backgroundColor: hovered ? "#0d9488" : "#14b8a6",
            opacity: pressed ? 0.8 : 1,
          },
        ]}
        onPress={() => {
          handleRegister();
        }}
      >
        <Text style={tw`text-white font-semibold`}>Sign Up</Text>
      </Pressable>
    </View>
  );
}
