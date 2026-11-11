import type { Metadata, Viewport } from 'next';
import './globals.css';
import './tourist-design.css';
export const metadata: Metadata = { title: 'City Guide · İstanbul', description: 'İstanbul için şehir rehberi ve iş ortağı paneli. Русский · Türkçe · English.', manifest: '/manifest.webmanifest', icons: { icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }, { url: '/images/city-guide-logo.webp', type: 'image/webp', sizes: '512x512' }], shortcut: '/images/city-guide-logo.webp', apple: '/images/city-guide-logo.webp' }, appleWebApp: { capable: true, title: 'City Guide', statusBarStyle: 'default' } };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#c93270' };
export default function RootLayout({ children }: {children: React.ReactNode}) {return <html lang="ru"><body>{children}</body></html>;}
