import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthService } from '../services/authService';

export interface User {
  id: string;
  email: string;
  businessName: string;
  phoneNumber: string;
  createdAt: Date;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, businessName: string, phoneNumber?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simple auth check - just check if there's a current user
    const checkAuth = async () => {
      try {
        console.log('🔍 Checking authentication...');
        const { user: currentUser, error } = await AuthService.getCurrentUser();
        
        if (currentUser && !error) {
          setUser({
            id: currentUser.id,
            email: currentUser.email,
            businessName: currentUser.business_name,
            phoneNumber: currentUser.phone_number || '',
            createdAt: new Date(),
          });
          console.log('✅ User authenticated');
        } else {
          console.log('❌ No user found');
          setUser(null);
        }
      } catch (error) {
        console.error('❌ Auth check error:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
        console.log('🏁 Auth check completed');
      }
    };

    checkAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 Signing in...');
      setIsLoading(true);
      
      const { user: authUser, error } = await AuthService.signIn({ email, password });
      
      if (authUser && !error) {
        setUser({
          id: authUser.id,
          email: authUser.email,
          businessName: authUser.business_name,
          phoneNumber: authUser.phone_number || '',
          createdAt: new Date(),
        });
        console.log('✅ Sign in successful');
        return { success: true };
      } else {
        console.error('❌ Sign in failed:', error);
        return { success: false, error: error || 'Sign in failed' };
      }
    } catch (error) {
      console.error('❌ Sign in error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, businessName: string, phoneNumber?: string) => {
    try {
      console.log('📝 Signing up...');
      setIsLoading(true);
      
      const { user: newUser, error } = await AuthService.signUp({
        email,
        password,
        businessName,
        phoneNumber,
      });

      // Handle email confirmation required case
      if (error === 'EMAIL_CONFIRMATION_REQUIRED') {
        console.log('📧 Email confirmation required - verification email sent');
        return { success: true, error: 'Please check your email and click the verification link to complete your registration.' };
      }

      if (newUser && !error) {
        setUser({
          id: newUser.id,
          email: newUser.email,
          businessName: newUser.business_name,
          phoneNumber: newUser.phone_number || '',
          createdAt: new Date(),
        });
        console.log('✅ Sign up successful');
        return { success: true };
      } else {
        console.error('❌ Sign up failed:', error);
        return { success: false, error: error || 'Sign up failed' };
      }
    } catch (error) {
      console.error('❌ Sign up error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Logging out...');
      setIsLoading(true);
      
      await AuthService.signOut();
      setUser(null);
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    signIn,
    signUp,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
