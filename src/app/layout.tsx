import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Paradox '26 | Team Management",
  description: "Manage departments, teams, and members for Paradox.",
  icons: {
    icon: '/icon.png', // This tells the browser exactly where to look
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
