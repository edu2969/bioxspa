import type { Metadata } from 'next';
import './globals.css';
import Nav from '@/components/Nav';
import { roboto, orbitron, red_hat_display } from '@/app/fonts';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'BIOX',
  description: 'powered by yGa',
  manifest: "/manifest.json",
  icons: {
    apple: '/icon-192x192.png'
  }  
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-CL">
      <body className={`${roboto} ${orbitron} ${red_hat_display} red_hat_display`} style={{ width: "100vw", maxWidth: "100vw", overflowX: "hidden" }}>
        <Providers apiKey={process.env.GOOGLE_API_KEY || ''}>
          {children}
          <Nav />
        </Providers>
      </body>
    </html>
  );
}
