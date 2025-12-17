import './globals.css';
import { roboto, orbitron, red_hat_display } from '@/app/fonts';
import ReactQueryProvider from '@/components/providers/QueryClientProvider';

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
}) { 
  return (
    <html lang="es-CL">
      <body className={`${roboto} ${orbitron} ${red_hat_display} red_hat_display`} 
        style={{ width: "100vw", maxWidth: "100vw", overflowX: "hidden" }}>
        <ReactQueryProvider>
        {children}        
        </ReactQueryProvider>
      </body>
    </html>
  );
}
