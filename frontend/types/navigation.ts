export type TabParamList = {
  index: undefined;
  analytics: undefined;
  profile: undefined;
  settings: undefined;
};

export type RootStackParamsList = {
  login: undefined;
  signup: undefined;
  chatbot: undefined;
  exercise: {
    exerciseId: number;
    userExerciseId: number | null;
  };
  tabs: undefined;
};
