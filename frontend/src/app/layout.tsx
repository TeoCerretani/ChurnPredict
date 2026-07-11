import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Aisthesis Churn Predictor",
  description: "Spotify-style metallic churn prediction dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body className={`${outfit.className} bg-[#121212] text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}
