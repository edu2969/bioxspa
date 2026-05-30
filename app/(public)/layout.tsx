import { roboto, orbitron, red_hat_display } from '@/app/fonts';
import ClientProviders from '@/components/providers/ClientProviders';
import { Suspense } from 'react';
import '@/app/globals.css';
import { AuthProvider } from '@/context/AuthContext';
import LoginForm from '@/components/LoginForm';

export const metadata = {
    title: 'BIOX',
    description: 'powered by yGa',
    manifest: "/manifest.json",
    icons: {
        apple: '/icon-192x192.png'
    }
};

export default async function RootLayout() {
    return (
        <html lang="es-CL">
            <body className={`${roboto} ${orbitron} ${red_hat_display} red_hat_display`}
                style={{ width: "100vw", maxWidth: "100vw", overflowX: "hidden" }}>
                <Suspense>
                    <ClientProviders>
                        <AuthProvider>
                            <LoginForm />
                        </AuthProvider>
                    </ClientProviders>
                </Suspense>
            </body>
        </html>
    );
}
