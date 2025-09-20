import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { AuthService, AuthUser } from '../services/authService';

interface AuthContextType {
  user: User | null;
  login: (userData: Omit<User, 'id' | 'createdAt'>) => void;
  signUp: (email: string, password: string, businessName: string, phoneNumber?: string) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Listen for auth state changes (this handles both initial load and subsequent changes)
    const { data: { subscription } } = AuthService.onAuthStateChange((authUser) => {
      console.log('🔄 Auth state changed:', authUser ? 'User found' : 'No user');
      if (authUser) {
        setUser({
          id: authUser.id,
          email: authUser.email,
          businessName: authUser.business_name,
          phoneNumber: authUser.phone_number || '',
          createdAt: new Date(),
        });
        console.log('✅ User authenticated successfully');
      } else {
        setUser(null);
        console.log('❌ No user authenticated');
      }
      setIsLoading(false);
    });

    return () => {
      console.log('🧹 Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, []);

  const login = (userData: Omit<User, 'id' | 'createdAt'>) => {
    // This is kept for backward compatibility but shouldn't be used in production
    const newUser: User = {
      ...userData,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    setUser(newUser);
  };

  const signUp = async (email: string, password: string, businessName: string, phoneNumber?: string) => {
    setIsLoading(true);
    const { user: newUser, error } = await AuthService.signUp({
      email,
      password,
      businessName,
      phoneNumber,
    });

    if (newUser && !error) {
      setUser({
        id: newUser.id,
        email: newUser.email,
        businessName: newUser.business_name,
        phoneNumber: newUser.phone_number || '',
        createdAt: new Date(),
      });
      setIsLoading(false);
      return { success: true };
    } else {
      setIsLoading(false);
      return { success: false, error: error || 'Sign up failed' };
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('🔐 AuthContext: Starting sign in');
    setIsLoading(true);
    const { user: authUser, error } = await AuthService.signIn({
      email,
      password,
    });

    console.log('🔐 AuthContext: Sign in response received');

    if (authUser && !error) {
      console.log('✅ AuthContext: Setting user state');
      setUser({
        id: authUser.id,
        email: authUser.email,
        businessName: authUser.business_name,
        phoneNumber: authUser.phone_number || '',
        createdAt: new Date(),
      });
      setIsLoading(false);
      console.log('✅ AuthContext: Sign in successful');
      return { success: true };
    } else {
      console.error('❌ AuthContext: Sign in failed:', error);
      setIsLoading(false);
      return { success: false, error: error || 'Sign in failed' };
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Logging out...');
      setIsLoading(true);
      
      // Clear any cached data
      try {
        const { dataCache } = await import('../hooks/useDataCache');
        dataCache.clear();
        console.log('🧹 Cleared data cache');
      } catch (error) {
        console.log('⚠️ Could not clear cache:', error);
      }
      
      await AuthService.signOut();
      setUser(null);
      console.log('✅ Logout completed');
    } catch (error) {
      console.error('❌ Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    login,
    signUp,
    signIn,
    logout,
    isAuthenticated: !!user,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};