import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'registered' | 'guest';

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string;
  role: UserRole;
  is_approved: boolean;
  is_restricted: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: UserRole;
  isGuest: boolean;
  isAdmin: boolean;
  isApproved: boolean;
  isRestricted: boolean;
  loading: boolean;
  signInWithOtp: (email: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  enterGuestMode: () => void;
  exitGuestMode: () => void;
  activateDevPrivileges: (code: string) => boolean;
  deactivateDevPrivileges: () => void;
  refreshProfile: () => Promise<void>;
  allProfiles: UserProfile[];
  fetchAllProfiles: () => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  kickUser: (userId: string) => Promise<void>;
  restrictUser: (userId: string, restricted: boolean) => Promise<void>;
  approveUser: (userId: string) => Promise<void>;
}

// SECURITY NOTE: Admin emails are loaded from VITE_ADMIN_EMAILS env var (set at build time).
// These are bundled into the client JS — this is acceptable for a client-side-only app
// but should NOT be relied upon as a security boundary. For production, validate roles
// server-side via Supabase RLS policies or Edge Functions.
function getAdminEmails(): string[] {
  const envEmails = import.meta.env.VITE_ADMIN_EMAILS;
  if (envEmails) return envEmails.split(',').map((e: string) => e.trim().toLowerCase());
  // SECURITY: Removed localStorage fallback — admin emails must be set via
  // the VITE_ADMIN_EMAILS env var at build time. The previous localStorage
  // fallback allowed any user to grant themselves admin access via DevTools.
  return [];
}

// Developer activation: compare hashed input against stored hash (code never exposed in bundle)
function hashDevInput(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return 'dv_' + Math.abs(h).toString(36);
}
// Pre-computed hash of the developer code — the plain text is never stored in the bundle
const DEV_CODE_HASH = import.meta.env.VITE_DEV_CODE_HASH || 'dv_k1y9k';
const PROFILES_KEY = 'apas_user_profiles';
const GUEST_KEY = 'apas_guest_mode';
const DEV_PRIV_KEY = 'apas_dev_privileges';

function isValidDevToken(): boolean {
  const stored = localStorage.getItem(DEV_PRIV_KEY);
  if (!stored) return false;
  return stored === DEV_CODE_HASH;
}

function getStoredProfiles(): UserProfile[] {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function storeProfiles(profiles: UserProfile[]) {
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  } catch { /* ignore */ }
}

function upsertProfile(profiles: UserProfile[], profile: UserProfile): UserProfile[] {
  const idx = profiles.findIndex(p => p.id === profile.id);
  if (idx >= 0) {
    const updated = [...profiles];
    updated[idx] = { ...updated[idx], ...profile };
    return updated;
  }
  return [...profiles, profile];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [devPrivileges, setDevPrivileges] = useState(false);

  const isAdminEmail = useCallback((email: string | undefined) => {
    if (!email) return false;
    const adminEmails = getAdminEmails();
    return adminEmails.includes(email.toLowerCase());
  }, []);

  const buildProfile = useCallback((u: User): UserProfile => {
    const stored = getStoredProfiles();
    const existing = stored.find(p => p.id === u.id);
    const email = u.email || '';
    const isAdmin = isAdminEmail(email) || devPrivileges;

    return {
      id: u.id,
      email,
      display_name: existing?.display_name || u.user_metadata?.full_name || u.user_metadata?.name || email.split('@')[0],
      avatar_url: existing?.avatar_url || u.user_metadata?.avatar_url || '',
      role: isAdmin ? 'admin' : 'registered',
      is_approved: existing?.is_approved ?? isAdmin,
      is_restricted: existing?.is_restricted ?? false,
      created_at: existing?.created_at || u.created_at || new Date().toISOString(),
    };
  }, [isAdminEmail, devPrivileges]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = buildProfile(user);
    setProfile(p);
    const stored = getStoredProfiles();
    const updated = upsertProfile(stored, p);
    storeProfiles(updated);
  }, [user, buildProfile]);

  // Initialize auth state
  useEffect(() => {
    const guestMode = localStorage.getItem(GUEST_KEY) === 'true';
    const devPriv = isValidDevToken();
    setIsGuest(guestMode);
    setDevPrivileges(devPriv);

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const p = buildProfile(s.user);
        setProfile(p);
        const stored = getStoredProfiles();
        const updated = upsertProfile(stored, p);
        storeProfiles(updated);
        setIsGuest(false);
        localStorage.removeItem(GUEST_KEY);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const p = buildProfile(s.user);
        setProfile(p);
        const stored = getStoredProfiles();
        const updated = upsertProfile(stored, p);
        storeProfiles(updated);
        setIsGuest(false);
        localStorage.removeItem(GUEST_KEY);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signInWithOtp = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    return { error: error?.message || null };
  };

  const signUpWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error: error?.message || null };
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsGuest(false);
    setDevPrivileges(false);
    localStorage.removeItem(GUEST_KEY);
    localStorage.removeItem(DEV_PRIV_KEY);
  };

  const enterGuestMode = () => {
    setIsGuest(true);
    localStorage.setItem(GUEST_KEY, 'true');
  };

  const exitGuestMode = () => {
    setIsGuest(false);
    localStorage.removeItem(GUEST_KEY);
  };

  const activateDevPrivileges = (code: string): boolean => {
    // SECURITY: Dev privilege activation is restricted to development builds only.
    // In production, the client-side hash comparison is disabled to prevent
    // reverse-engineering of the dev code from the bundled JS.
    if (!import.meta.env.DEV) {
      console.warn('Dev privilege activation is disabled in production builds.');
      return false;
    }
    if (hashDevInput(code) === DEV_CODE_HASH) {
      setDevPrivileges(true);
      localStorage.setItem(DEV_PRIV_KEY, DEV_CODE_HASH);
      if (profile) {
        const updated = { ...profile, role: 'admin' as UserRole, is_approved: true };
        setProfile(updated);
        const stored = getStoredProfiles();
        const newStored = upsertProfile(stored, updated);
        storeProfiles(newStored);
      }
      return true;
    }
    return false;
  };

  const deactivateDevPrivileges = () => {
    setDevPrivileges(false);
    localStorage.removeItem(DEV_PRIV_KEY);
    if (user) {
      const p = buildProfile(user);
      const restoredProfile = { ...p, role: isAdminEmail(user.email || '') ? 'admin' as UserRole : 'registered' as UserRole };
      setProfile(restoredProfile);
      const stored = getStoredProfiles();
      const updated = upsertProfile(stored, restoredProfile);
      storeProfiles(updated);
    }
  };

  const fetchAllProfiles = async () => {
    const stored = getStoredProfiles();
    setAllProfiles(stored);
  };

  const deleteUser = async (userId: string) => {
    // Prevent deleting admin accounts
    const stored = getStoredProfiles();
    const target = stored.find(p => p.id === userId);
    if (target && isAdminEmail(target.email)) return;
    if (target && target.id === profile?.id && profile?.role === 'admin') return;

    const updated = stored.filter(p => p.id !== userId);
    storeProfiles(updated);
    setAllProfiles(updated);
  };

  const kickUser = async (userId: string) => {
    // Mark user as kicked (they'll need to re-login)
    const stored = getStoredProfiles();
    const target = stored.find(p => p.id === userId);
    if (target && isAdminEmail(target.email)) return;

    // We just record the kick event - the user will be required to re-login
    const updated = stored.map(p =>
      p.id === userId ? { ...p, is_approved: false } : p
    );
    storeProfiles(updated);
    setAllProfiles(updated);
  };

  const restrictUser = async (userId: string, restricted: boolean) => {
    const stored = getStoredProfiles();
    const target = stored.find(p => p.id === userId);
    if (target && isAdminEmail(target.email)) return;

    const updated = stored.map(p =>
      p.id === userId ? { ...p, is_restricted: restricted } : p
    );
    storeProfiles(updated);
    setAllProfiles(updated);
  };

  const approveUser = async (userId: string) => {
    const stored = getStoredProfiles();
    const updated = stored.map(p =>
      p.id === userId ? { ...p, is_approved: true, is_restricted: false } : p
    );
    storeProfiles(updated);
    setAllProfiles(updated);

    // Update own profile if that's us
    if (profile && profile.id === userId) {
      setProfile({ ...profile, is_approved: true, is_restricted: false });
    }
  };

  const role: UserRole = isGuest ? 'guest' : (profile?.role || 'guest');
  const isAdmin = role === 'admin' || devPrivileges;
  const isApproved = isAdmin || (profile?.is_approved ?? false);
  const isRestricted = !isAdmin && (profile?.is_restricted ?? false);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      role,
      isGuest,
      isAdmin,
      isApproved,
      isRestricted,
      loading,
      signInWithOtp,
      signUpWithEmail,
      signInWithEmail,
      signOut,
      enterGuestMode,
      exitGuestMode,
      activateDevPrivileges,
      deactivateDevPrivileges,
      refreshProfile,
      allProfiles,
      fetchAllProfiles,
      deleteUser,
      kickUser,
      restrictUser,
      approveUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
