import { Link } from "@react-navigation/native";
import { useState } from "react";
import { View, Text, Pressable, TouchableOpacity } from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import { TextInput } from "react-native-gesture-handler";
import tw from "tailwind-react-native-classnames";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function Signup() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [injuryType, setInjuryType] = useState("");
  const [securePassword, setSecurePassword] = useState(false);
  const [secureConfirmPassword, setSecureConfirmPassword] = useState(false);

  // Injury type data for dropdown
  const injuryData = [
    { label: "ACL Injury", value: "acl" },
    { label: "Rotator Cuff", value: "rotator" },
    { label: "Tennis Elbow", value: "tennis_elbow" },
    { label: "Hamstring Strain", value: "hamstring" },
    { label: "Other", value: "other" },
  ];

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
      {/* First Name */}
      <Text style={[tw`mb-2`, { color: "#8f8e8e" }]}>First Name:</Text>
      <TextInput
        style={[
          tw`flex text-center bg-gray-200 w-48 h-8 border rounded justify-center mb-4`,
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
      {/* Last Name */}
      <Text style={[tw`mb-2`, { color: "#8f8e8e" }]}>Last Name:</Text>
      <TextInput
        style={[
          tw`flex text-center bg-gray-200 w-48 h-8 border rounded justify-center mb-4`,
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
      {/* Username */}
      <Text style={[tw`mb-2`, { color: "#8f8e8e" }]}>Username:</Text>
      <TextInput
        style={[
          tw`flex text-center bg-gray-200 w-48 h-8 border rounded justify-center mb-4`,
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
      {/* Email */}
      <Text style={[tw`mb-2`, { color: "#8f8e8e" }]}>Email:</Text>
      <TextInput
        style={[
          tw`flex text-center bg-gray-200 w-48 h-8 border rounded justify-center mb-4`,
          {
            color: "#8f8e8e",
            borderColor: "#e5e7eb",
            borderWidth: 1,
            outlineColor: "#ccc",
          },
        ]}
        placeholder="example@gmail.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />
      {/* Password */}
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
          secureTextEntry={!securePassword}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity
          style={tw`ml-2`}
          onPress={() => setSecurePassword(!securePassword)}
        >
          <Text>{securePassword ? "🙈" : "👁️"}</Text>
        </TouchableOpacity>
      </View>
      {/* Confirm Password */}
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
          placeholder="****"
          secureTextEntry={!secureConfirmPassword}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        <TouchableOpacity
          style={tw`ml-2`}
          onPress={() => setSecureConfirmPassword(!secureConfirmPassword)}
        >
          <Text>{secureConfirmPassword ? "🙈" : "👁️"}</Text>
        </TouchableOpacity>
      </View>
      {/* Date of Birth */}
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
      // And update your touchable to:
      <TouchableOpacity
        style={[
          tw`flex text-center bg-gray-200 w-48 h-8 border rounded justify-center mb-4`,
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
      {/* Injury Type */}
      <Text style={[tw`mb-2`, { color: "#8f8e8e" }]}>Injury type:</Text>
      <Dropdown
        style={[
          tw`flex bg-gray-200 w-48 h-8 border rounded justify-center mb-6 px-2`,
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
      {/* Sign Up Button */}
      <Pressable
        style={({ pressed, hovered }) => [
          tw`flex items-center p-4 rounded-xl mt-5 mb-2 w-60`,
          {
            backgroundColor: hovered ? "#0d9488" : "#14b8a6",
            opacity: pressed ? 0.8 : 1,
          },
        ]}
        onPress={() => {
          // Handle sign up logic here
          console.log({
            firstName,
            lastName,
            username,
            email,
            password,
            confirmPassword,
            dateOfBirth: dateOfBirth.toISOString().split("T")[0],
            injuryType,
          });
        }}
      >
        <Text style={tw`text-white font-semibold`}>Sign Up</Text>
      </Pressable>
    </View>
  );
}
