import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'City Guide · İstanbul', description: 'İstanbul için şehir rehberi ve iş ortağı paneli. Русский · Türkçe · English.', manifest: '/manifest.webmanifest', icons: { icon: '/favicon.svg', shortcut: '/favicon.svg' }, appleWebApp: { capable: true, title: 'City Guide', statusBarStyle: 'default' } };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#c93270' };
export default function RootLayout({ children }: {children: React.ReactNode}) {return <html lang="ru"><body>{children}</body></html>;}
