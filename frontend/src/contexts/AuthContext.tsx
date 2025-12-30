import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { AccessDescriptor, AccessRole, LoginResponse } from "@types";

type LoginCredentials = {
  password: string;
  identifier?: string;
};

type RefreshOptions = {
  tokenOverride?: string | null;
  persist?: boolean;
};

type AuthContextValue = {
  role: AccessRole;
  defaultRole: AccessRole;
  authenticated: boolean;
  requiresPassword: boolean;
  token: string | null;
  loading: boolean;
  loginVisible: boolean;
  setLoginVisible: (visible: boolean) => void;
  requestLogin: () => void;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  authFetch: (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => Promise<Response>;
  refreshAccess: (options?: RefreshOptions) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_TOKEN_STORAGE_KEY = "wavecap-auth-token";

const readStoredToken = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }
  const value = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  return value && value.length > 0 ? value : null;
};

const persistToken = (token: string | null) => {
  if (typeof window === "undefined") {
    return;
  }
  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  }
};

const buildAuthHeaders = (token: string | null): HeadersInit => {
  if (!token) {
    return {};
  }
  return { Authorization: `Bearer ${token}` };
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => readStoredToken());
  const [role, setRole] = useState<AccessRole>("read_only");
  const [defaultRole, setDefaultRole] = useState<AccessRole>("read_only");
  const [authenticated, setAuthenticated] = useState(false);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loginVisible, setLoginVisible] = useState(false);
  const defaultRoleRef = useRef<AccessRole>("read_only");

  useEffect(() => {
    defaultRoleRef.current = defaultRole;
  }, [defaultRole]);

  const updateAccessDescriptor = useCallback((descriptor: AccessDescriptor) => {
    setDefaultRole(descriptor.defaultRole);
    setRole(descriptor.role);
    setAuthenticated(descriptor.authenticated);
    setRequiresPassword(descriptor.requiresPassword);
    if (descriptor.authenticated) {
      setLoginVisible(false);
    }
  }, []);

  const applyToken = useCallback((value: string | null) => {
    setToken(value);
    persistToken(value);
  }, []);

  const handleUnauthorized = useCallback(() => {
    applyToken(null);
    setAuthenticated(false);
    setRole(defaultRoleRef.current);
    setLoginVisible(true);
  }, [applyToken]);

  const refreshAccess = useCallback(
    async (options: RefreshOptions = {}) => {
      const activeToken =
        options.tokenOverride !== undefined ? options.tokenOverride : token;
      const headers = buildAuthHeaders(activeToken ?? null);
      try {
        const response = await fetch("/api/access", { headers });
        if (response.status === 401) {
          handleUnauthorized();
          return;
        }
        if (!response.ok) {
          throw new Error(
            `Failed to load access descriptor (status ${response.status})`,
          );
        }
        const descriptor = (await response.json()) as AccessDescriptor;
        updateAccessDescriptor(descriptor);
        if (options.persist) {
          applyToken(activeToken ?? null);
        }
      } catch (error) {
        console.error("Failed to refresh access descriptor", error);
      } finally {
        setLoading(false);
      }
    },
    [applyToken, handleUnauthorized, token, updateAccessDescriptor],
  );

  useEffect(() => {
    const initialToken = readStoredToken();
    void refreshAccess({ tokenOverride: initialToken, persist: true });
  }, [refreshAccess]);

  const authFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers ?? undefined);
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      const response = await fetch(input, { ...init, headers });
      if (response.status === 401 || response.status === 403) {
        handleUnauthorized();
      }
      return response;
    },
    [handleUnauthorized, token],
  );

  const login = useCallback(
    async ({ password, identifier }: LoginCredentials) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, identifier }),
      });
      if (response.status === 401) {
        throw new Error("Invalid credentials.");
      }
      if (!response.ok) {
        throw new Error("Unable to complete sign-in.");
      }
      const data = (await response.json()) as LoginResponse;
      await refreshAccess({ tokenOverride: data.token, persist: true });
    },
    [refreshAccess],
  );

  const logout = useCallback(async () => {
    try {
      if (token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: buildAuthHeaders(token),
        });
      }
    } catch (error) {
      console.warn("Failed to logout cleanly", error);
    } finally {
      await refreshAccess({ tokenOverride: null, persist: true });
    }
  }, [refreshAccess, token]);

  const requestLogin = useCallback(() => {
    setLoginVisible(true);
  }, []);

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      role,
      defaultRole,
      authenticated,
      requiresPassword,
      token,
      loading,
      loginVisible,
      setLoginVisible,
      requestLogin,
      login,
      logout,
      authFetch,
      refreshAccess,
    }),
    [
      authFetch,
      authenticated,
      defaultRole,
      loading,
      login,
      loginVisible,
      logout,
      refreshAccess,
      requestLogin,
      requiresPassword,
      role,
      setLoginVisible,
      token,
    ],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
