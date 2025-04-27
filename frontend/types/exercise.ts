// Interface for the exercise item
export interface ExerciseItem {
  id: number;
  name: string;
  slug: string;
  video_link: string;
  video_id: string;
  difficulty_level: string;
  additional_notes: string;
  category: number;
}

// Interface for the userExercise item
export interface UserExerciseItem {
  id: number;
  user: number;
  exercise: number;
  sets: number;
  reps: number;
  hold: number;
  pain_level: number;
  completed: boolean;
  is_active: boolean;
}
