import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "sonner";
import { AppProvider } from '@/context/AppContext';
import { AuthProvider } from '@/context/AuthContext'; // Import AuthProvider
import { ThemeProvider } from 'next-themes';
import { APP_NAME } from '@/constants';
import SplashScreenWrapper from '@/components/animation/SplashScreen';
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SpendWise",
  description: "Your personal finance management app",
  manifest: "/manifest.json",
  icons: {
    apple: [
      { url: "/icons/icon-192x192.png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512" },
    ],
  },
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="application-name" content="SpendWise" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SpendWise" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff"/>
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#000000"/>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap" rel="stylesheet"/>
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        ><SplashScreenWrapper>
          <AuthProvider> {/* Wrap AppProvider with AuthProvider */}
            <AppProvider>
              {children}
              <Toaster position="top-right" richColors/>
            </AppProvider>
          </AuthProvider>
        </SplashScreenWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
