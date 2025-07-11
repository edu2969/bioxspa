import type { Metadata } from 'next';
import './globals.css';
import Nav from '@/components/Nav';
import { roboto, orbitron, red_hat_display } from '@/app/fonts';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'BIOX',
  description: 'by EDUARDO TRONCOSO',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-CL">
      <body className={`${roboto} ${orbitron} ${red_hat_display} red_hat_display`}>
        <Providers apiKey={process.env.GOOGLE_API_KEY || ''}>
          {children}
          <Nav />
        </Providers>
      </body>
    </html>
  );
}
