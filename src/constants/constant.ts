// constants.ts
export const ACTIONS = {
  SET_FORM_DATA: "SET_FORM_DATA",
  SET_ERRORS: "SET_ERRORS",
  SET_TOUCHED: "SET_TOUCHED",
  SET_SUBMITTING: "SET_SUBMITTING",
  SET_LOADING: "SET_LOADING",
  RESET_FORM: "RESET_FORM",
} as const;

export const ERROR_MESSAGES = {
  REQUIRED: "This field is required.",
  INVALID_EMAIL: "Invalid email address.",
  USERNAME_TAKEN: "Username is already taken.",
} as const;

// Types for action types
export type ActionType = keyof typeof ACTIONS;
