import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { setUnauthorizedHandler } from "@/lib/api";

export type User = {
  id: string;
  username: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  website?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  isVerified?: boolean;
  verificationStatus?: string;
};

type AuthContextValue = {
  user: User | null;
  token: string | null;
  hydrated: boolean;
  signIn: (user: User, token: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const STORAGE_KEY = "tattoo-record-mobile-auth";
const AuthContext = createContext<AuthContextValue | null>(null);
const authStorage = {
  getItem: (key: string) => Platform.OS === "web" ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => Platform.OS === "web" ? AsyncStorage.setItem(key, value) : SecureStore.setItemAsync(key, value),
  deleteItem: (key: string) => Platform.OS === "web" ? AsyncStorage.removeItem(key) : SecureStore.deleteItemAsync(key),
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const signOut = useCallback(async () => {
    setUser(null);
    setToken(null);
    await authStorage.deleteItem(STORAGE_KEY);
  }, []);

  useEffect(() => {
    authStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!value) return;
        const parsed = JSON.parse(value) as { user: User; token: string };
        setUser(parsed.user);
        setToken(parsed.token);
      })
      .catch(() => undefined)
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => { void signOut(); });
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const signIn = useCallback(async (nextUser: User, nextToken: string) => {
    setUser(nextUser);
    setToken(nextToken);
    await authStorage.setItem(STORAGE_KEY, JSON.stringify({ user: nextUser, token: nextToken }));
  }, []);

  const value = useMemo(() => ({ user, token, hydrated, signIn, signOut }), [user, token, hydrated, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}