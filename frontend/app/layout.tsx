import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../lib/auth';

export const metadata: Metadata = {
  title: 'JobSmart AI — Career Operating System',
  description: 'Plateforme IA de candidature automatique. Trouve et postule aux offres d\'emploi en Tunisie, France, Maroc et partout dans le monde.',
  keywords: 'emploi tunisie, candidature automatique, IA recrutement, jobsmart',
  openGraph: {
    title: 'JobSmart AI',
    description: 'Ton assistant IA pour trouver et décrocher l\'emploi de tes rêves.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
