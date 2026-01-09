import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'BroBot',
    description: 'Multi-tenant WhatsApp automation and bot management platform',
    icons: {
        icon: [
            { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
            { url: '/favicon.png', sizes: '16x16', type: 'image/png' },
        ],
        apple: '/favicon.png',
    },
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    )
}
