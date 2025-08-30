import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import QueryProvider from '../providers/QueryProvider';
import { ToastContainer } from '../components/ui/Toast';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Skool Clone',
  description: 'Community learning platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>{children}</QueryProvider>
        <ToastContainer />
      </body>
    </html>
  );
}
