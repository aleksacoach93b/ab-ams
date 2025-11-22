import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
// import PWAInstaller from "@/components/PWAInstaller";
import AnalyticsScheduler from "@/components/AnalyticsScheduler";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AB - AMS",
  description: "Modern athlete and sports team management platform with real-time features",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0F172A", // Dark theme color
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ background: 'var(--color-background)', minHeight: '100vh', overflowX: 'hidden', width: '100%' }}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme') || 'light';
                  const darkBg = '#0F172A';
                  const lightBg = '#F9FAFB';
                  const bg = theme === 'dark' ? darkBg : lightBg;
                  document.documentElement.style.backgroundColor = bg;
                  document.documentElement.style.background = bg;
                  document.body.style.backgroundColor = bg;
                  document.body.style.background = bg;
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ 
          margin: 0, 
          padding: 0, 
          minHeight: '100vh',
          width: '100%',
          background: 'var(--color-background)',
          overflowX: 'hidden'
        }}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <div style={{ minHeight: '100vh', width: '100%', background: 'var(--color-background)' }}>
                <AnalyticsScheduler />
                {children}
                {/* <PWAInstaller /> */}
              </div>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
