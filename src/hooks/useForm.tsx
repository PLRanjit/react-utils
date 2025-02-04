import React, {
  useReducer,
  useEffect,
  useCallback,
  useTransition,
  useId,
  useRef,
  useState,
} from "react";
import { ACTIONS, ERROR_MESSAGES } from "../constants/constant";

// Define the structure of the form state
interface FormState {
  formData: Record<string, string>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isLoading: boolean;
}

// Define the structure of the action
interface FormAction {
  type: string;
  name?: string;
  value?: string;
  error?: string;
  initialState?: Record<string, string>;
  isSubmitting?: boolean;
  isLoading?: boolean;
}

// Reducer function for managing form state
const formReducer = (state: FormState, action: FormAction): FormState => {
  switch (action.type) {
    case ACTIONS.SET_FORM_DATA:
      return {
        ...state,
        formData: { ...state.formData, [action.name!]: action.value! },
      };
    case ACTIONS.SET_ERRORS:
      return {
        ...state,
        errors: { ...state.errors, [action.name!]: action.error! },
      };
    case ACTIONS.SET_TOUCHED:
      return { ...state, touched: { ...state.touched, [action.name!]: true } };
    case ACTIONS.SET_SUBMITTING:
      return { ...state, isSubmitting: action.isSubmitting! };
    case ACTIONS.SET_LOADING:
      return { ...state, isLoading: action.isLoading! };
    case ACTIONS.RESET_FORM:
      return {
        formData: action.initialState!,
        errors: {},
        touched: {},
        isSubmitting: false,
        isLoading: false,
      };
    default:
      return state;
  }
};

// Define the signature of the validation function
type ValidateAsyncFn = (
  formData: Record<string, string>
) => Promise<Record<string, string>>;

// Define the useForm hook with TypeScript
function useForm(
  initialState: Record<string, string>,
  validateAsync: ValidateAsyncFn
) {
  const [state, dispatch] = useReducer(formReducer, {
    formData: initialState,
    errors: {},
    touched: {},
    isSubmitting: false,
    isLoading: false,
  });

  const id = useId(); // Generate unique ID for form elements
  const focusRef = useRef<HTMLInputElement | null>(null); // Focus management for first error
  const [isPending, startTransition] = useTransition();
  const debounceTimeoutRef = useRef<Timeout | null>(null);

  // Debounced form data to minimize validation calls
  const deferredFormData = state.formData;

  // Handle form input changes
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    dispatch({ type: ACTIONS.SET_FORM_DATA, name, value });

    // Debounce validation
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      dispatch({ type: ACTIONS.SET_TOUCHED, name });
      validateField(name, value);
    }, 500);
  }, []);

  // Field-level validation
  const validateField = useCallback(
    async (name: string, value: string) => {
      const fieldErrors = await validateAsync({ [name]: value });
      dispatch({
        type: ACTIONS.SET_ERRORS,
        name,
        error: fieldErrors[name] || "",
      });
    },
    [validateAsync]
  );

  // Form-level validation
  const validateForm = useCallback(async () => {
    const validationErrors = await validateAsync(state.formData);
    dispatch({ type: ACTIONS.SET_ERRORS, name: "", error: validationErrors });
    return Object.keys(validationErrors).length === 0;
  }, [state.formData, validateAsync]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = await validateForm();
    if (isValid) {
      dispatch({ type: ACTIONS.SET_SUBMITTING, isSubmitting: true });
      startTransition(() => {
        console.log("Form Submitted", state.formData);
        dispatch({ type: ACTIONS.SET_SUBMITTING, isSubmitting: false });
        dispatch({ type: ACTIONS.RESET_FORM, initialState });
      });
    } else {
      // Focus on the first field with an error
      const firstErrorField = Object.keys(state.errors)[0];
      if (firstErrorField && focusRef.current) {
        focusRef.current.focus();
      }
    }
  };

  // Handle input focus and validate form fields
  useEffect(() => {
    const storedData = localStorage.getItem("formData");
    if (storedData) {
      dispatch({
        type: ACTIONS.SET_FORM_DATA,
        name: "formData",
        value: JSON.parse(storedData),
      });
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("formData", JSON.stringify(state.formData));
  }, [state.formData]);

  return {
    formData: state.formData,
    errors: state.errors,
    isSubmitting: state.isSubmitting,
    isLoading: state.isLoading,
    handleChange,
    handleSubmit,
    validateField,
    touched: state.touched,
    isPending,
    focusRef, // Focus management
    id,
  };
}

// Custom hook for managing individual form fields
function useField(
  name: string,
  initialValue: string,
  validate: ValidateAsyncFn
) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  const handleBlur = async () => {
    setTouched(true);
    const fieldErrors = await validate({ [name]: value });
    setError(fieldErrors[name] || "");
  };

  return {
    value,
    error,
    touched,
    handleChange,
    handleBlur,
  };
}

// Example form using the custom useForm hook
function MyForm() {
  const initialFormState = {
    username: "",
    email: "",
  };

  const validateAsync: ValidateAsyncFn = async (formData) => {
    const errors: Record<string, string> = {};

    if (formData.username === "admin") {
      errors.username = ERROR_MESSAGES.USERNAME_TAKEN;
    }

    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = ERROR_MESSAGES.INVALID_EMAIL;
    }

    return errors;
  };

  const {
    formData,
    errors,
    isSubmitting,
    handleChange,
    handleSubmit,
    validateField,
    touched,
    focusRef,
    id,
  } = useForm(initialFormState, validateAsync);

  const usernameField = useField("username", formData.username, validateAsync);
  const emailField = useField("email", formData.email, validateAsync);

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor={id}>Username:</label>
        <input
          type="text"
          name="username"
          id={id}
          value={usernameField.value}
          onChange={usernameField.handleChange}
          onBlur={usernameField.handleBlur}
          ref={focusRef}
        />
        {usernameField.touched && usernameField.error && (
          <span role="alert" style={{ color: "red" }}>
            {usernameField.error}
          </span>
        )}
      </div>

      <div>
        <label htmlFor={id}>Email:</label>
        <input
          type="email"
          name="email"
          id={id}
          value={emailField.value}
          onChange={emailField.handleChange}
          onBlur={emailField.handleBlur}
        />
        {emailField.touched && emailField.error && (
          <span role="alert" style={{ color: "red" }}>
            {emailField.error}
          </span>
        )}
      </div>

      {isSubmitting && <div>Submitting...</div>}
      <button type="submit" disabled={isSubmitting}>
        Submit
      </button>
    </form>
  );
}

export default MyForm;
