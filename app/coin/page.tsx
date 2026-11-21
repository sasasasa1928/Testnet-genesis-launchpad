import type { Metadata } from "next";
import CoinView from "@/components/CoinView";
import { serverCoin } from "@/lib/server-data";
import { eth } from "@/lib/format";

type Props = { searchParams: Promise<{ a?: string }> };

/** Per-coin title, description and share image for X / Telegram / Discord previews. */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { a } = await searchParams;
  if (!a) return {};
  const coin = await serverCoin(a);
  const image = `/api/og/?a=${a}`;
  if (!coin) {
    return { title: "Coin · Genesis testnet", openGraph: { images: [image] }, twitter: { card: "summary_large_image", images: [image] } };
  }
  const title = `${coin.name} ($${coin.symbol}) · Genesis testnet`;
  const description =
    (coin.meta.description ? `${coin.meta.description} · ` : "") +
    `MC ${eth(coin.marketCap, 3)} ETH · ${coin.graduated ? "graduated" : `${Math.round(coin.progress * 100)}% to graduation`}`;
  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function Page() {
  return <CoinView />;
}
