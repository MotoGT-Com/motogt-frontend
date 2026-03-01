import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router";

export type AuthModalView = "register" | "login" | "forgotPassword" | "verifyOTP" | "checkoutSelection";

export type AuthIntent = {
  type: "checkout" | "garage" | "none";
  returnTo?: string;
};

export type OtpContext =
  | {
      email: string;
      source: "register" | "login";
    }
  | {
      phone: string;
      source: "guestCheckout";
      onVerified?: () => void | Promise<void>;
    };

export type PendingCredentials = {
  email: string;
  password: string;
};

type OpenAuthModalOptions = {
  intent?: AuthIntent;
  otpContext?: OtpContext;
  pendingCredentials?: PendingCredentials;
};

type AuthModalContextValue = {
  isOpen: boolean;
  view: AuthModalView;
  intent?: AuthIntent;
  otpContext?: OtpContext;
  pendingCredentials?: PendingCredentials;
  openAuthModal: (view?: AuthModalView, options?: OpenAuthModalOptions) => void;
  closeAuthModal: () => void;
  setAuthView: (view: AuthModalView) => void;
  setAuthIntent: (intent?: AuthIntent) => void;
  setOtpContext: (otpContext?: OtpContext) => void;
  setPendingCredentials: (credentials?: PendingCredentials) => void;
  completeAuthAndContinue: () => void;
};

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<AuthModalView>("register");
  const [intent, setIntent] = useState<AuthIntent | undefined>(undefined);
  const [otpContext, setOtp] = useState<OtpContext | undefined>(undefined);
  const [pendingCredentials, setPending] = useState<PendingCredentials | undefined>(undefined);

  const clearEphemeralState = useCallback(() => {
    setOtp(undefined);
    setPending(undefined);
  }, []);

  const openAuthModal = useCallback(
    (nextView: AuthModalView = "register", options?: OpenAuthModalOptions) => {
      setView(nextView);
      setIsOpen(true);
      setIntent(options?.intent);
      setOtp(options?.otpContext);
      setPending(options?.pendingCredentials);
    },
    []
  );

  const closeAuthModal = useCallback(() => {
    setIsOpen(false);
    setView("register");
    setIntent(undefined);
    clearEphemeralState();
  }, [clearEphemeralState]);

  const setAuthView = useCallback((nextView: AuthModalView) => {
    setView(nextView);
  }, []);

  const setAuthIntent = useCallback((nextIntent?: AuthIntent) => {
    setIntent(nextIntent);
  }, []);

  const setOtpContext = useCallback((nextOtp?: OtpContext) => {
    setOtp(nextOtp);
  }, []);

  const setPendingCredentials = useCallback((credentials?: PendingCredentials) => {
    setPending(credentials);
  }, []);

  const completeAuthAndContinue = useCallback(() => {
    const destination = intent?.returnTo ?? (intent?.type === "garage" ? "/my-garage" : intent?.type === "checkout" ? "/checkout" : "/");

    setIsOpen(false);
    setView("register");
    setIntent(undefined);
    clearEphemeralState();
    navigate(destination);
  }, [clearEphemeralState, intent, navigate]);

  const value = useMemo<AuthModalContextValue>(
    () => ({
      isOpen,
      view,
      intent,
      otpContext,
      pendingCredentials,
      openAuthModal,
      closeAuthModal,
      setAuthView,
      setAuthIntent,
      setOtpContext,
      setPendingCredentials,
      completeAuthAndContinue,
    }),
    [
      closeAuthModal,
      completeAuthAndContinue,
      intent,
      isOpen,
      openAuthModal,
      otpContext,
      pendingCredentials,
      setAuthIntent,
      setAuthView,
      setOtpContext,
      setPendingCredentials,
      view,
    ]
  );

  return (
    <AuthModalContext.Provider value={value}>{children}</AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error("useAuthModal must be used within AuthModalProvider");
  }
  return context;
}
