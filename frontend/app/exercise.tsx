import { View, Text, Pressable } from "react-native";
import tw from "tailwind-react-native-classnames";
import VideoPlayer, { type VideoPlayerRef } from "react-native-video-player";

// Define the interface for the exercise item
interface ExerciseItem {
  id: number;
  name: string;
  slug: string;
  image: string;
  video_link: string;
  difficulty_level: string;
  additional_notes: string;
  category: number;
}

// Define the interface for the userExercise item
interface UserExerciseItem {
  id: number;
  user: number;
  exercise: number;
  sets: number;
  reps: number;
  pain_level: number;
  completed: boolean;
}

export default function Exercise() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text> Exercise Name</Text>
      <VideoPlayer
        video={{ uri: "https://www.example.com/video.mp4" }} // Replace with your video URL
        style={{ width: 300, height: 200 }} // Adjust the size as needed
      />
      <Text>Reps: 3 Sets: 3 Hold 5s</Text>
      <Text>Difficulty: Beginner</Text>
      <Text>Exercise description</Text>
      <Pressable
        style={({ pressed, hovered }) => [
          tw`flex items-center p-4 rounded-2xl mt-5 mb-2 w-28`,
          {
            // When hovered, change to a darker teal; otherwise use the default teal
            backgroundColor: hovered ? "#0d9488" : "#14b8a6",
            // Slightly reduce the opacity when the button is pressed
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Text style={tw`text-white font-semibold`}>Complete</Text>
      </Pressable>
    </View>
  );
}
