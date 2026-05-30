import { roboto, orbitron, red_hat_display } from '@/app/fonts';
import ClientProviders from '@/components/providers/ClientProviders';
import { Suspense } from 'react';
import '@/app/globals.css';
import { getSupabaseServerClient } from '@/lib/supabase';
import { redirect } from 'next/navigation';

export const dynamic = "force-dynamic";

export const metadata = {
  title: 'BIOX',
  description: 'powered by yGa',
  manifest: "/manifest.json",
  icons: {
    apple: '/icon-192x192.png'
  }
};

export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase =
    await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return (
    <html lang="es-CL">
      <body className={`${roboto} ${orbitron} ${red_hat_display} red_hat_display`}
        style={{ width: "100vw", maxWidth: "100vw", overflowX: "hidden" }}>
        <Suspense>
          <ClientProviders>
            {children}
          </ClientProviders>
        </Suspense>
      </body>
    </html>
  );
}
