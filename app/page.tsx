'use client';

import HomeAccessPanel from '@/components/_prefabs/HomeAccessPanel';
import { ChecklistProvider } from '@/components/context/ChecklistContext';
import LoginForm from '@/components/LoginForm';
import { AuthProvider } from '@/context/AuthContext';
import { useAuthorization } from '@/lib/auth/useAuthorization';

export default function RootPage() {
  const auth = useAuthorization();

  return <>{auth && auth.user ?
    <ChecklistProvider tipo={'personal'}>
      <HomeAccessPanel />
    </ChecklistProvider>
    : <AuthProvider><LoginForm /></AuthProvider>}</>
}