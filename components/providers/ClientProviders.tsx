'use client';

import { AuthProvider } from '@/context/AuthContext';
import ReactQueryProvider from '@/components/providers/QueryClientProvider';

interface ClientProvidersProps {
  children: React.ReactNode;
}

export default function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <AuthProvider>
      <ReactQueryProvider>
        {children}        
      </ReactQueryProvider>
    </AuthProvider>
  );
}