import './globals.css';
import { roboto, orbitron, red_hat_display } from '@/app/fonts';
import ClientProviders from '@/components/providers/ClientProviders';
import { UserProvider } from '@/components/providers/UserProvider';

export const metadata = {
  title: 'BIOX',
  description: 'powered by yGa',
  manifest: "/manifest.json",
  icons: {
    apple: '/icon-192x192.png'
  }  
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) { 
  return (
    <html lang="es-CL">
      <body className={`${roboto} ${orbitron} ${red_hat_display} red_hat_display`} 
        style={{ width: "100vw", maxWidth: "100vw", overflowX: "hidden" }}>
        <UserProvider>
          <ClientProviders>
            {children}
          </ClientProviders>
        </UserProvider>
      </body>
    </html>
  );
}
