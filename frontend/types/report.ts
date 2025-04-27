// Interface for adherence exercise history
export interface adherenceExerciseHistory {
  date: string;
  completed: string;
  adherence: number;
}

// Interface for pain level exercise history
export interface painLevelExerciseHistory {
  date: string;
  exercises: string;
  pain_level: number;
}

// Interface for exercise details
export interface ExerciseDetail {
  name: string;
  sets: number;
  reps: number;
  pain: number;
}

// Interface for exercise history
export interface ExerciseHistoryItem {
  date: string;
  formatted_date: string;
  exercises: ExerciseDetail[];
  pain_level: number;
}

// Interface for exercise history response
export interface ExerciseHistoryResponse {
  history: ExerciseHistoryItem[];
}
