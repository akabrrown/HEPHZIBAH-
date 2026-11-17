import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

const archivo = {
  variable: "font-archivo",
};

const publicSans = {
  variable: "font-public-sans",
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Hephzibah Media — Photography, Videography & Graphic Design in Ghana",
    template: "%s | Hephzibah Media",
  },
  description:
    "Event and commercial photography, videography, and graphic design studio in Accra, Ghana. Clear packages, honest availability, and replies within one working day.",
  openGraph: {
    type: "website",
    locale: "en_GH",
    siteName: "Hephzibah Media",
    title: "Hephzibah Media — Photography, Videography & Graphic Design",
    description:
      "Photography, videography and graphic design across Ghana. View client work and send a booking request.",
    images: ["/media/traditional-marriage-hero.svg"],
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${archivo.variable} ${publicSans.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("hephzibah-theme");if(!t){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.setAttribute("data-theme",t);if(t==="light"){document.documentElement.classList.add("light");document.documentElement.classList.remove("dark")}else{document.documentElement.classList.add("dark");document.documentElement.classList.remove("light")}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="bg-[var(--black)] text-[var(--white)] antialiased selection:bg-[var(--cyan)] selection:text-[var(--black)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
