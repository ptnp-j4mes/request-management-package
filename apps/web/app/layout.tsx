import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "../components/layout/Providers";
import { AppChrome } from "../components/layout/AppChrome";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Request Management Platform",
  description: "Enterprise workflow platform for project, request, UAT, and MIT tracking",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <AppChrome>{children}</AppChrome>
        </Providers>
      </body>
    </html>
  );
}
