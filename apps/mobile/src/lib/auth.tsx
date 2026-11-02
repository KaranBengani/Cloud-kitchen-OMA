import * as SecureStore from 'expo-secure-store';
import { createContext, type ReactNode, use, useEffect, useState } from 'react';
import { api, setAuth } from './api';

// The token lives in SecureStore (Android Keystore-backed), not AsyncStorage, because it grants
// full access to the family's orders and customer details. In React web you'd use an httpOnly
// cookie; a native app has no cookie jar the API controls, so it stores the token itself.
const TOKEN_KEY = 'authToken';

type Auth = {
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (pin: string) => Promise<void>;
  logout: () => void;
};
const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = () => {
    setToken(null);
    setAuth(null);
    SecureStore.deleteItemAsync(TOKEN_KEY);
  };

  useEffect(() => {
    SecureStore.getItemAsync(TOKEN_KEY)
      .then((saved) => {
        setToken(saved);
        // A 401 from any request means the token is no longer valid: send them back to the PIN screen.
        setAuth(saved, logout);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (pin: string) => {
    const { token: newToken } = await api<{ token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
    await SecureStore.setItemAsync(TOKEN_KEY, newToken);
    setAuth(newToken, logout);
    setToken(newToken);
  };

  return (
    <AuthContext value={{ isLoading, isLoggedIn: token !== null, login, logout }}>{children}</AuthContext>
  );
}

export function useAuth(): Auth {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
