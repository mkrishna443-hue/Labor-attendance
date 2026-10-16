import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, getSupabaseCredentials } from '../lib/supabase';
import { Profile } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  isSupervisor: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  sendOtp: (phoneNumber: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (phoneNumber: string, otpCode: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  checkConfiguration: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isConfigured, setIsConfigured] = useState<boolean>(() => getSupabaseCredentials().isConfigured);

  const checkConfiguration = useCallback(() => {
    const creds = getSupabaseCredentials();
    setIsConfigured(creds.isConfigured);
  }, []);

  const fetchProfile = useCallback(async (userId: string, userPhone?: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Error fetching profile from DB:', error.message);
      }

      if (data) {
        setProfile(data as Profile);
        return data as Profile;
      }

      // If user profile record not created yet, upsert one
      const newProfile: Partial<Profile> = {
        id: userId,
        phone: userPhone || '',
        name: 'Site Supervisor',
        role: 'supervisor',
      };

      const { data: created, error: insertError } = await supabase
        .from('profiles')
        .upsert(newProfile)
        .select()
        .single();

      if (insertError) {
        console.warn('Failed to auto-create profile:', insertError.message);
        // Fallback local representation
        const fallback: Profile = {
          id: userId,
          phone: userPhone || '',
          name: 'Site Supervisor',
          role: 'supervisor',
        };
        setProfile(fallback);
        return fallback;
      }

      setProfile(created as Profile);
      return created as Profile;
    } catch (err) {
      console.error('Exception fetching profile:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    checkConfiguration();

    // Fetch initial session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        fetchProfile(currentSession.user.id, currentSession.user.phone).finally(() => {
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    }).catch((err) => {
      console.warn('Get session error:', err);
      setIsLoading(false);
    });

    // Listen for auth state changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          await fetchProfile(newSession.user.id, newSession.user.phone);
        } else {
          setProfile(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [checkConfiguration, fetchProfile]);

  const sendOtp = async (phoneNumber: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phoneNumber,
        options: {
          channel: 'sms',
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send OTP';
      return { success: false, error: msg };
    }
  };

  const verifyOtp = async (phoneNumber: string, otpCode: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phoneNumber,
        token: otpCode.trim(),
        type: 'sms',
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        await fetchProfile(data.user.id, data.user.phone);
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid or expired OTP code';
      return { success: false, error: msg };
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const refreshProfile = async (): Promise<void> => {
    if (user) {
      await fetchProfile(user.id, user.phone);
    }
  };

  const isAdmin = profile?.role === 'admin';
  const isSupervisor = profile?.role === 'supervisor' || isAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isAdmin,
        isSupervisor,
        isLoading,
        isConfigured,
        sendOtp,
        verifyOtp,
        signOut,
        refreshProfile,
        checkConfiguration,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
