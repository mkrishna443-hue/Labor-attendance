import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
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
  signInWithPassword: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithPassword: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  sendEmailOtp: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyEmailOtp: (email: string, token: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: { name?: string; phone?: string; role?: 'admin' | 'supervisor' }) => Promise<{ success: boolean; error?: string }>;
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

  const fetchProfile = useCallback(async (userId: string, userEmail?: string): Promise<Profile | null> => {
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
        const prof = data as Profile;
        if (prof.role !== 'admin') {
          await supabase.from('profiles').update({ role: 'admin' }).eq('id', userId);
          prof.role = 'admin';
        }
        setProfile(prof);
        return prof;
      }

      // If user profile record not created yet, upsert one with admin privileges
      const derivedName = userEmail ? userEmail.split('@')[0] : 'Site Supervisor';
      const newProfile: Partial<Profile> = {
        id: userId,
        email: userEmail || '',
        name: derivedName,
        role: 'admin',
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
          email: userEmail || '',
          name: derivedName,
          role: 'admin',
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
        fetchProfile(currentSession.user.id, currentSession.user.email).finally(() => {
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    }).catch((err) => {
      console.warn('Get session error:', err);
      setIsLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          await fetchProfile(newSession.user.id, newSession.user.email);
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

  // Sign In with Email & Password
  const signInWithPassword = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        await fetchProfile(data.user.id, data.user.email);
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      return { success: false, error: msg };
    }
  };

  // Sign Up with Email & Password
  const signUpWithPassword = async (
    email: string,
    password: string,
    name?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const displayName = name?.trim() || cleanEmail.split('@')[0];

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            name: displayName,
            role: 'supervisor',
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        await fetchProfile(data.user.id, cleanEmail);
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      return { success: false, error: msg };
    }
  };

  // Send Email OTP / Magic Code
  const sendEmailOtp = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send verification code';
      return { success: false, error: msg };
    }
  };

  // Verify Email OTP
  const verifyEmailOtp = async (email: string, token: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: token.trim(),
        type: 'email',
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        await fetchProfile(data.user.id, data.user.email);
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid or expired code';
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
      await fetchProfile(user.id, user.email);
    }
  };

  const updateProfile = async (updates: {
    name?: string;
    phone?: string;
    role?: 'admin' | 'supervisor';
  }): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      const payload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (updates.name !== undefined) payload.name = updates.name.trim();
      if (updates.phone !== undefined) payload.phone = updates.phone.trim();
      if (updates.role !== undefined) payload.role = updates.role;

      const { data, error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      if (data) {
        setProfile(data as Profile);
      }
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile';
      return { success: false, error: msg };
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
        signInWithPassword,
        signUpWithPassword,
        sendEmailOtp,
        verifyEmailOtp,
        signOut,
        refreshProfile,
        updateProfile,
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
