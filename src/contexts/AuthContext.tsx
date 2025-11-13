import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  subscription_plan: 'free' | 'pro' | 'enterprise';
  subscription_status: 'active' | 'cancelled' | 'expired' | 'trial';
  playbooks_generated_this_month: number;
  subscription_start_date: string;
  subscription_end_date: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

interface ProfessionalMetadata {
  job_title?: string;
  phone?: string;
  company_name?: string;
  company_size?: string;
  industry?: string;
  country?: string;
  use_cases?: string[];
  newsletter?: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, metadata?: ProfessionalMetadata) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  canGeneratePlaybook: () => boolean;
  isAdmin: () => boolean;
  getAllUsers: () => Promise<UserProfile[]>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error loading profile:', error);
        return;
      }

      setProfile(data);
    } catch (err) {
      console.error('Exception loading profile:', err);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, metadata?: ProfessionalMetadata) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            ...(metadata || {})
          }
        }
      });

      if (error) {
        return { error };
      }

      if (data.user) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: data.user.id,
            email: data.user.email,
            full_name: fullName,
            subscription_plan: 'free',
            subscription_status: 'active',
          });

        if (profileError) {
          console.error('Error creating profile:', profileError);
        }

        if (metadata) {
          const { error: metadataError } = await supabase
            .from('professional_profiles')
            .insert({
              user_id: data.user.id,
              job_title: metadata.job_title,
              phone: metadata.phone,
              company_name: metadata.company_name,
              company_size: metadata.company_size,
              industry: metadata.industry,
              country: metadata.country,
              use_cases: metadata.use_cases,
              newsletter_subscribed: metadata.newsletter,
            });

          if (metadataError) {
            console.error('Error creating professional profile:', metadataError);
          }
        }
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setProfile(null);
      setUser(null);
      setSession(null);
      window.location.href = '/';
    } catch (error) {
      console.error('Error during sign out:', error);
      window.location.href = '/';
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  const canGeneratePlaybook = (): boolean => {
    if (!profile) return false;

    if (profile.subscription_status !== 'active') {
      return false;
    }

    if (profile.subscription_plan === 'pro' || profile.subscription_plan === 'enterprise') {
      return true;
    }

    return profile.playbooks_generated_this_month < 3;
  };

  const isAdmin = (): boolean => {
    return profile?.is_admin === true;
  };

  const getAllUsers = async (): Promise<UserProfile[]> => {
    if (!isAdmin()) {
      console.error('Access denied: not an admin');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Exception fetching users:', err);
      return [];
    }
  };

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    canGeneratePlaybook,
    isAdmin,
    getAllUsers,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
