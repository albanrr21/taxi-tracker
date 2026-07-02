import "./globals.css";

export const metadata = {
  title: "Taxi Meter — Earnings Tracker",
  description: "Track your daily fares, tips, and monthly cut.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#17181A",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
