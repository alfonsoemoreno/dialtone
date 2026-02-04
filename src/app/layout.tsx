import type { Metadata } from "next";
import { Bebas_Neue, IBM_Plex_Sans, Oswald } from "next/font/google";
import "./globals.css";

const displayFont = Bebas_Neue({
  weight: "400",
  variable: "--font-display",
  subsets: ["latin"],
});

const bodyFont = IBM_Plex_Sans({
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
  subsets: ["latin"],
});

const condensedFont = Oswald({
  weight: ["300", "400", "500", "600"],
  variable: "--font-condensed",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vintage Audio Player",
  description: "Vintage audio player with radio and Spotify sources.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${displayFont.variable} ${bodyFont.variable} ${condensedFont.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
