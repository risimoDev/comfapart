import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { AuthProvider } from '@/contexts/AuthContext'
import CookieBanner from '@/components/CookieBanner'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: 'Comfort Apartments | Аренда апартаментов',
    template: '%s | Comfort Apartments',
  },
  description: 'Премиальные апартаменты для аренды в лучших городах России. Комфортное проживание с отличным сервисом.',
  keywords: ['аренда апартаментов', 'снять квартиру', 'краткосрочная аренда', 'апартаменты посуточно'],
  authors: [{ name: 'Comfort Apartments' }],
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: 'Comfort Apartments',
    title: 'Comfort Apartments | Аренда апартаментов',
    description: 'Премиальные апартаменты для аренды в лучших городах России',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <AuthProvider>
          <Header />
          <div className="min-h-screen pt-16 md:pt-20">
            {children}
          </div>
          <Footer />
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--background)',
                color: 'var(--foreground)',
                border: '1px solid var(--border)',
              },
              success: {
                iconTheme: {
                  primary: '#22c55e',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
          <CookieBanner />
        </AuthProvider>
      </body>
    </html>
  )
}
