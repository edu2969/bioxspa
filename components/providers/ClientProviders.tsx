'use client';

import { AuthProvider } from '@/context/AuthContext';
import ReactQueryProvider from '@/components/providers/QueryClientProvider';
import { UserProvider } from '@/components/providers/UserProvider';

interface ClientProvidersProps {
  children: React.ReactNode;
}

export default function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <AuthProvider>
      <UserProvider>
        <ReactQueryProvider>
          {children}
        </ReactQueryProvider>
      </UserProvider>
    </AuthProvider>
  );
}