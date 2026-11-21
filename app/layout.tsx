import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Footer, Nav, TestnetBanner } from "@/components/Shell";

export const metadata: Metadata = {
  title: "Genesis · testnet",
  description: "Launch a coin. Trade it. Graduate it. Genesis testnet on Ethereum Sepolia, test ETH only.",
  metadataBase: new URL("https://testnet.genesislaunch.family"),
  openGraph: { title: "Genesis · testnet", description: "Launch a coin. Trade it. Graduate it.", images: ["/logo.svg"] },
};

export const viewport = { themeColor: "#000000" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
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
