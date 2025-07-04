import {
  View,
  Text,
  Pressable,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import tw from "tailwind-react-native-classnames";
import { useProfileData } from "@/hooks/useProfileData";
import { useState } from "react";

// Profile screen component
// This component displays the user's profile information and allows them to edit it.
// It includes a modal for updating the profile details and handles the logic for saving changes.
export default function Profile() {
  const {
    userProfile,
    injuryTypes,
    loading,
    isModalVisible,
    newUsername,
    newFirstName,
    newLastName,
    newEmail,
    newDateOfBirth,
    open,
    isUpdating,
    setNewUsername,
    setNewFirstName,
    setNewLastName,
    setNewEmail,
    setNewDateOfBirth,
    setOpen,
    handleEditProfile,
    toggleModal,
  } = useProfileData();
  const [emailError, setEmailError] = useState("");

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Basic email regex
    return regex.test(email);
  };

  const handleEmailChange = (email: string) => {
    setNewEmail(email);
    if (!validateEmail(email)) {
      setEmailError("Invalid email format (e.g, user@example.com)");
    } else {
      setEmailError("");
    }
  };

  // Check if the user profile is loading
  // If loading, show a loading indicator
  if (loading) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-white`}>
        <ActivityIndicator
          testID="loading-indicator"
          size="large"
          color="#14b8a6"
        />
      </View>
    );
  }

  return (
    <View style={tw`flex flex-1 items-center justify-center bg-white`}>
      <View style={tw`bg-gray-50 rounded-xl p-6 w-11/12 mb-6 shadow-sm`}>
        <View style={tw`mb-4`}>
          <Text style={tw`text-gray-500 text-sm`}>Username</Text>
          <Text style={tw`text-gray-800`}>
            {userProfile?.username || "Not provided"}
          </Text>
        </View>

        <View style={tw`mb-4`}>
          <Text style={tw`text-gray-500 text-sm`}>Full Name</Text>
          <Text style={tw`text-gray-800`}>
            {userProfile?.first_name && userProfile?.last_name
              ? `${userProfile.first_name} ${userProfile.last_name}`
              : "Not provided"}
          </Text>
        </View>

        <View style={tw`mb-4`}>
          <Text style={tw`text-gray-500 text-sm`}>Email</Text>
          <Text style={tw`text-gray-800`}>
            {userProfile?.email || "Not provided"}
          </Text>
        </View>

        <View style={tw`mb-4`}>
          <Text style={tw`text-gray-500 text-sm`}>Date of Birth</Text>
          <Text style={tw`text-gray-800`}>
            {userProfile?.date_of_birth
              ? new Date(userProfile.date_of_birth).toLocaleDateString()
              : "Not provided"}
          </Text>
        </View>

        <View>
          <Text style={tw`text-gray-500 text-sm`}>Injury Type</Text>
          <Text style={tw`text-gray-800`}>
            {injuryTypes.find((type) => type.id === userProfile?.injury_type)
              ?.name || "Unknown"}
          </Text>
        </View>
      </View>
      <Pressable
        style={({ pressed, hovered }) => [
          tw`absolute bottom-4 items-center p-4 rounded-2xl w-80`,
          {
            backgroundColor: hovered ? "#0d9488" : "#14b8a6",
            opacity: pressed ? 0.8 : 1,
          },
        ]}
        onPress={() => {
          toggleModal();
        }}
      >
        <Text style={tw`text-lg text-white font-semibold`}>Edit Profile</Text>
      </Pressable>
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !isUpdating && toggleModal()}
      >
        <View
          style={tw`flex-1 justify-center items-center bg-black bg-opacity-50`}
        >
          <View style={tw`bg-white p-6 rounded-lg w-80`}>
            <Text style={tw`text-xl font-bold mb-4`}>Update Profile</Text>
            <Text style={tw`mb-1`}>Update Username:</Text>
            <TextInput
              testID="username-input"
              style={tw`border border-gray-300 p-2 mb-4 rounded`}
              placeholder="username"
              value={newUsername}
              onChangeText={setNewUsername}
              editable={!isUpdating}
            />
            <Text style={tw`mb-1`}>Update First Name:</Text>
            <TextInput
              style={tw`border border-gray-300 p-2 mb-3 rounded`}
              placeholder="first name"
              value={newFirstName}
              onChangeText={setNewFirstName}
              editable={!isUpdating}
            />
            <Text style={tw`mb-1`}>Update Last Name:</Text>
            <TextInput
              style={tw`border border-gray-300 p-2 mb-4 rounded`}
              placeholder="last name"
              value={newLastName}
              onChangeText={setNewLastName}
              editable={!isUpdating}
            />
            <Text style={tw`mb-1`}>Update Email:</Text>
            <TextInput
              style={tw`border border-gray-300 p-2 mb-4 rounded`}
              placeholder="email"
              value={newEmail}
              onChangeText={handleEmailChange}
              editable={!isUpdating}
              keyboardType="email-address"
              testID="email-input"
            />
            {emailError ? (
              <Text style={[tw` ml-4 mb-1 -mt-2`, { color: "red" }]}>
                {emailError}
              </Text>
            ) : null}
            <Text style={[tw`mb-2`, { color: "#8f8e8e" }]}>Date of birth:</Text>
            <View style={tw`flex-row items-center mb-4`}>
              <TouchableOpacity
                testID="date-picker-button"
                style={[
                  tw`flex-1 text-center bg-gray-200 h-8 border border-gray-300 rounded justify-center`,
                ]}
                onPress={() => setOpen(true)}
              >
                <Text testID="datetime-text" style={{ color: "#8f8e8e" }}>
                  {newDateOfBirth
                    ? newDateOfBirth.toLocaleDateString()
                    : userProfile?.date_of_birth
                    ? new Date(userProfile.date_of_birth).toLocaleDateString()
                    : "Select Date of Birth"}
                </Text>
              </TouchableOpacity>

              {(newDateOfBirth || userProfile?.date_of_birth) && (
                <TouchableOpacity
                  style={tw`ml-2 p-2`}
                  onPress={() => setNewDateOfBirth(undefined)} // Clear to null
                >
                  <Text style={tw`text-red-500`}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            {open && (
              <DateTimePicker
                testID="date-time-picker"
                value={
                  newDateOfBirth ||
                  new Date(userProfile?.date_of_birth || Date.now())
                }
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setOpen(false);
                  if (event.type === "set") {
                    setNewDateOfBirth(selectedDate);
                  }
                }}
                maximumDate={new Date()}
              />
            )}

            <View style={tw`flex-row justify-between`}>
              <Pressable
                style={[tw`px-4 py-2 rounded`, { backgroundColor: "#e5e7eb" }]}
                onPress={() => toggleModal()}
                disabled={isUpdating}
              >
                <Text style={isUpdating ? tw`text-gray-500` : tw``}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                style={[tw`px-4 py-2 rounded`, { backgroundColor: "#14b8a6" }]}
                onPress={handleEditProfile}
                disabled={isUpdating}
              >
                <Text testID="update-button" style={tw`text-white`}>
                  {isUpdating ? "Updating..." : "Update"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
