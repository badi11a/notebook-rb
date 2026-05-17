import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mi Patrimonio',
  description: 'Gestión de patrimonio personal',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
