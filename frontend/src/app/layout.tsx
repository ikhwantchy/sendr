import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Sendr',
    description: 'Multi-tenant WhatsApp automation and bot management platform',
    icons: {
        icon: [
            { url: '/favicon.png', sizes: '256x256', type: 'image/png' },
            { url: '/favicon.png', sizes: '192x192', type: 'image/png' },
        ],
        apple: { url: '/favicon.png', sizes: '180x180' },
        shortcut: '/favicon.png',
    },
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className}>
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    )
}
