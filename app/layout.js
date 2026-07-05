import "./globals.css";

export const metadata = {
  title: "Taxi Meter — Earnings Tracker",
  description: "Your private record of fares, tips, and what the company owes you.",
  applicationName: "Taksimetri",
  manifest: "/manifest.json",
  icons: { icon: "/icon-192.png", apple: "/icon-180.png" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Taksimetri" },
  formatDetection: { telephone: false }, // €38.50 must not become a phone link
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#17181A",
  viewportFit: "cover",          // let the app paint under the iOS notch/home indicator
  interactiveWidget: "resizes-content", // Android: keyboard shrinks viewport, sheets ride above it
};

// iOS paints a white flash at PWA launch unless a startup image matches the
// device exactly (CSS size + pixel ratio). One entry per supported iPhone.
const SPLASH = [
  ["/splash/750x1334.png", 375, 667, 2],
  ["/splash/828x1792.png", 414, 896, 2],
  ["/splash/1125x2436.png", 375, 812, 3],
  ["/splash/1242x2688.png", 414, 896, 3],
  ["/splash/1170x2532.png", 390, 844, 3],
  ["/splash/1179x2556.png", 393, 852, 3],
  ["/splash/1284x2778.png", 428, 926, 3],
  ["/splash/1290x2796.png", 430, 932, 3],
  ["/splash/1206x2622.png", 402, 874, 3],
  ["/splash/1320x2868.png", 440, 956, 3],
];

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
        {SPLASH.map(([href, w, h, r]) => (
          <link
            key={href}
            rel="apple-touch-startup-image"
            href={href}
            media={`(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r})`}
          />
        ))}
      </head>
      <body>{children}</body>
    </html>
  );
}
