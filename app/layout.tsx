import { Inter } from 'next/font/google'
import type { Metadata } from 'next'
import './globals.css'
import Nav from '@/components/Nav'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/utils/authOptions';
import { NextAuthOptions } from 'next-auth';
import { roboto } from '@/app/fonts';
const inter = Inter({ subsets: ['latin'] })

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
    <html lang="en">
      <body className={`${inter.className} ${roboto}`}>      
        {children}
        <Nav user={session?.user}></Nav>      
      </body>
    </html>
  )
}
