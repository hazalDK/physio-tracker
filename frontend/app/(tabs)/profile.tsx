import {
  View,
  Text,
  Pressable,
  Alert,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import tw from "tailwind-react-native-classnames";
import { useProfileData } from "@/hooks/useProfileData";

export default function Profile() {
  const {
    userProfile,
    injuryTypes,
    loading,
    isModalVisible,
    newUsername,
    newFirstName,
    newLastName,
    newDateOfBirth,
    open,
    isUpdating,
    setNewUsername,
    setNewFirstName,
    setNewLastName,
    setNewDateOfBirth,
    setOpen,
    handleEditProfile,
    toggleModal,
  } = useProfileData();

  if (loading) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-white`}>
        <ActivityIndicator size="large" color="#14b8a6" />
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
            {`${userProfile?.first_name} ${userProfile?.last_name}` ||
              "Not provided"}
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
            <Text style={[tw`mb-2`, { color: "#8f8e8e" }]}>Date of birth:</Text>
            <View style={tw`flex-row items-center mb-4`}>
              <TouchableOpacity
                style={[
                  tw`flex-1 text-center bg-gray-200 h-8 border border-gray-300 rounded justify-center`,
                ]}
                onPress={() => setOpen(true)}
              >
                <Text style={{ color: "#8f8e8e" }}>
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
                <Text style={tw`text-white`}>
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
