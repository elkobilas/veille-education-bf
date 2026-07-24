import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Veille Éducation Burkina Faso",
  description:
    "Surveillance automatique des communiqués officiels du secteur éducatif burkinabè.",
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5ef" },
    { media: "(prefers-color-scheme: dark)", color: "#121813" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
