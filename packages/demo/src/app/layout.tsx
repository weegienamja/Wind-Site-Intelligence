import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Wind Site Intelligence',
  description:
    'Score and visualise wind turbine site suitability. Combine meteorological, terrain, infrastructure and regulatory data into weighted, human-readable analysis.',
  openGraph: {
    title: 'Wind Site Intelligence',
    description:
      'Decision-support tool for wind turbine siting. Click any location to get a scored breakdown of wind resource, terrain, grid proximity and planning feasibility.',
    type: 'website',
    url: 'https://wind.jamieblair.co.uk',
    siteName: 'Wind Site Intelligence',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wind Site Intelligence',
    description:
      'Score and visualise wind turbine site suitability with free, open data.',
  },
  metadataBase: new URL('https://wind.jamieblair.co.uk'),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body style={{ margin: 0, backgroundColor: '#f8fafc' }}>{children}</body>
    </html>
  );
}
