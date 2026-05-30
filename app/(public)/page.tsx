'use client';

import HomeAccessPanel from '@/components/_prefabs/HomeAccessPanel';
import { ChecklistProvider } from '@/context/ChecklistContext';
import LoginForm from '@/components/LoginForm';
import { AuthProvider } from '@/context/AuthContext';
import { useAuthorization } from '@/lib/auth/useAuthorization';
import { Suspense } from 'react';

export const dynamic = "force-dynamic";

export default function RootPage() {
  const auth = useAuthorization();

  return <>{auth && auth.user ?
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><span className="text-gray-500">Cargando...</span></div>}>
      <ChecklistProvider tipo={'personal'}>
        <HomeAccessPanel />
      </ChecklistProvider>
    </Suspense>
    : <AuthProvider><LoginForm /></AuthProvider>}</>
}