import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Footer, Nav, TestnetBanner } from "@/components/Shell";
import { Intro } from "@/components/Intro";

export const metadata: Metadata = {
  title: "Genesis · testnet",
  description: "Every Great Thing Starts at Zero. Launch a coin, trade it, graduate it. Genesis testnet on Ethereum Sepolia, test ETH only.",
  metadataBase: new URL("https://testnet.genesislaunch.family"),
  openGraph: { title: "Genesis · testnet", description: "Every Great Thing Starts at Zero.", siteName: "Genesis" },
  twitter: { card: "summary_large_image", title: "Genesis · testnet", description: "Every Great Thing Starts at Zero." },
};

export const viewport = { themeColor: "#000000" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Hide the intro before first paint if it already played this session. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{document.documentElement.classList.add(sessionStorage.getItem("genesis-intro")?"intro-seen":"intro-first")}catch(e){}`,
          }}
        />
      </head>
      <body>
        <Intro />
        <Providers>
          <TestnetBanner />
          <Nav />
          <main className="container">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
