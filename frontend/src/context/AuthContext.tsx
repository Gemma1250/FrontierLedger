import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api';

interface AuthState {
  token: string | null;
  user: any | null;
  currentOrg: any | null;
  loading: boolean;
  login: (token: string, user: any) => Promise<void>;
  logout: () => Promise<void>;
  selectOrg: (org: any) => Promise<void>;
  clearOrg: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({} as AuthState);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [currentOrg, setCurrentOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuth();
  }, []);

  async function loadAuth() {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');
      const storedOrg = await AsyncStorage.getItem('currentOrg');
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        api.setToken(storedToken);
        if (storedOrg) setCurrentOrg(JSON.parse(storedOrg));
      }
    } catch (e) {
      console.error('Auth load error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function login(newToken: string, newUser: any) {
    setToken(newToken);
    setUser(newUser);
    api.setToken(newToken);
    await AsyncStorage.setItem('token', newToken);
    await AsyncStorage.setItem('user', JSON.stringify(newUser));
  }

  async function logout() {
    setToken(null);
    setUser(null);
    setCurrentOrg(null);
    api.setToken(null);
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('currentOrg');
  }

  async function selectOrg(org: any) {
    setCurrentOrg(org);
    await AsyncStorage.setItem('currentOrg', JSON.stringify(org));
  }

  async function clearOrg() {
    setCurrentOrg(null);
    await AsyncStorage.removeItem('currentOrg');
  }

  return (
    <AuthContext.Provider value={{ token, user, currentOrg, loading, login, logout, selectOrg, clearOrg }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
