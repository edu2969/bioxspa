import type { Metadata } from 'next'
import './globals.css'
import Nav from '@/components/Nav'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/utils/authOptions';
import { NextAuthOptions } from 'next-auth';
import { roboto, orbitron, red_hat_display } from '@/app/fonts';

export const metadata: Metadata = {
  title: 'BIOX',
  description: 'by EDUARDO TRONCOSO',
}

export default async function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions as NextAuthOptions);
  return (    
    <html lang="es_CL">
      <body className={`${roboto} ${orbitron} ${red_hat_display} red_hat_display`}>      
        {children}
        <Nav user={session?.user}></Nav>      
      </body>
    </html>
  )
}
