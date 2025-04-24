export interface adherenceExerciseHistory {
  date: string;
  completed: string;
  adherence: number;
}

export interface painLevelExerciseHistory {
  date: string;
  exercises: string;
  pain_level: number;
}

export interface ExerciseDetail {
  name: string;
  sets: number;
  reps: number;
  pain: number;
}

export interface ExerciseHistoryItem {
  date: string;
  formatted_date: string;
  exercises: ExerciseDetail[];
  pain_level: number;
}

export interface ExerciseHistoryResponse {
  history: ExerciseHistoryItem[];
}
