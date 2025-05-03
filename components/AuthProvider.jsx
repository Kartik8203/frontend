"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  isAuthenticated, 
  getSessionFromCookie, 
  onAuthStateChange, 
  getCurrentUser 
} from '@/lib/auth-service';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        // Check if the user is authenticated
        const { isAuthenticated: isAuth, session } = await isAuthenticated();
        
        if (!isAuth) {
          // If not on login or signup page, redirect to login
          const publicPaths = ['/login', '/signup', '/resetpassword'];
          if (!publicPaths.includes(pathname)) {
            router.push(`/login?returnUrl=${encodeURIComponent(pathname)}`);
          }
          setIsLoading(false);
          return;
        }
        
        // If authenticated, get user data
        const { user: currentUser } = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error("Authentication check failed:", error);
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Set up auth state change listener
    const unsubscribe = onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const { user } = await getCurrentUser();
        setUser(user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        router.push('/login');
      }
    });

    return () => {
      unsubscribe(); // Clean up the listener
    };
  }, [pathname, router]);

  // Expose auth context
  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};