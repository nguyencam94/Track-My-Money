import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { migrateDataToKUnits } from '../lib/services';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  currency: string;
  monthlyBudget: number;
  editPassword?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  profile: null, 
  loading: true,
  refreshProfile: async () => {}
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (user) {
      const profileRef = doc(db, 'users', user.uid);
      const profileSnap = await getDoc(profileRef);
      if (profileSnap.exists()) {
        setProfile(profileSnap.data() as UserProfile);
      }
    }
  };

  useEffect(() => {
    return onAuthStateChanged(auth, async (currUser) => {
      if (currUser) {
        setUser(currUser);
        const profileRef = doc(db, 'users', currUser.uid);
        let profileData: UserProfile | null = null;
        
        try {
          const profileSnap = await getDoc(profileRef);
          if (profileSnap.exists()) {
            profileData = profileSnap.data() as UserProfile;
            setProfile(profileData);
          } else {
            // Initialize profile
            profileData = {
              uid: currUser.uid,
              email: currUser.email || '',
              displayName: currUser.displayName || 'User',
              currency: 'VND',
              monthlyBudget: 0,
              createdAt: new Date().toISOString()
            };
            await setDoc(profileRef, profileData);
            setProfile(profileData);
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        }

        // Finish loading as soon as we have user and profile
        setLoading(false);
        
        // Run migration in background without blocking the UI
        migrateDataToKUnits(currUser.uid).catch(err => {
          console.error("Migration failed in background:", err);
        });
        
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
