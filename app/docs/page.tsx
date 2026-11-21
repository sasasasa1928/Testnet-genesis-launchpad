import Link from "next/link";
import { CHAIN, EXPLORER, FACTORIES, FACTORY, POINTS, PROTOCOL_FEE_PCT } from "@/lib/config";

export const metadata = { title: "Docs · Genesis testnet" };

export default function Docs() {
  return (
    <article className="docs">
      <h1><span className="silver-text">Genesis testnet docs</span></h1>
      <p>
        Genesis is a token launchpad: launch a coin, trade it on a bonding curve, and graduate it to a DEX. This testnet runs the same
        flow on <b>{CHAIN.name}</b> (chain ID <code>{CHAIN.id}</code>) with free test ETH, so you can try everything before mainnet.
      </p>

      <h2>1. Get test ETH</h2>
      <p>Grab free Sepolia ETH from the <Link href="/faucet/" className="silver-text">faucet page</Link>. Connect with any EVM wallet or sign in with email through Privy.</p>

      <h2>2. Launch a coin</h2>
      <ul>
        <li>Every coin has a fixed supply of <b>1,000,000,000</b> tokens.</li>
        <li><b>800M</b> are sold on the bonding curve; the remaining <b>200M</b> are paired with the raised ETH at graduation.</li>
        <li>Launching is free apart from gas. You can make an initial buy in the same transaction.</li>
      </ul>

      <h2>3. Trade on the curve</h2>
      <p>
        Prices follow a constant-product curve with virtual reserves (0.1 ETH and 1.073B tokens at start). Each buy raises the price; each sell lowers it.
        Sells don&apos;t need a separate approval transaction.
      </p>

      <h2>4. Graduation</h2>
      <p>
        When all 800M curve tokens are sold (about <b>0.29 ETH</b> raised on testnet), the coin graduates and curve trading closes. The
        raised ETH and the remaining 200M tokens become DEX liquidity. If a DEX router is configured, the pool is created automatically
        and the LP tokens are burned; otherwise the liquidity is held by the Genesis treasury for migration.
      </p>

      <h2>Fees</h2>
      <ul>
        <li>The creator picks a total trade fee from <b>1%</b> to <b>10%</b> at launch.</li>
        <li>The protocol always takes <b>{PROTOCOL_FEE_PCT}%</b>; the creator side gets the rest (0.3% to 9.3%).</li>
        <li>The creator side can go to the creator&apos;s wallet, another wallet, <b>holders</b>, buyback &amp; burn, or a split of wallet / holders / burn.</li>
        <li><b>Holder rewards:</b> the holders&apos; share of each trade is split by balance across everyone holding the coin. Rewards build up per holder and can be claimed anytime from the coin page or My coins. The bonding curve, burn address and DEX pool never earn. Buying gives you a share of future fees only, not past ones.</li>
        <li>Creator fees build up in the contract; claim them from <Link href="/my-coins/" className="silver-text">My coins</Link>.</li>
        <li>On testnet, fees are paid in Sepolia ETH. On mainnet they&apos;re priced in ZRO.</li>
      </ul>

      <h2>Points</h2>
      <ul>
        <li>Launch a coin: <b>+{POINTS.launch}</b></li>
        <li>Trade: <b>+1</b> per 0.001 ETH of volume</li>
        <li>Your coin graduates: <b>+{POINTS.graduation}</b></li>
      </ul>
      <p>Testnet points track testing activity only and carry no monetary value.</p>

      <h2>Contract</h2>
      <p>
        GenesisFactory:{" "}
        {FACTORY ? (
          <a className="silver-text mono" href={`${EXPLORER}/address/${FACTORY}`} target="_blank" rel="noreferrer">{FACTORY}</a>
        ) : (
          <code>not deployed yet</code>
        )}
      </p>
      {FACTORIES.filter((f) => !f.current).length > 0 && (
        <p>
          Previous contracts (their coins are still listed and tradable):{" "}
          {FACTORIES.filter((f) => !f.current).map((f) => (
            <a key={f.address} className="mono" style={{ display: "block" }} href={`${EXPLORER}/address/${f.address}`} target="_blank" rel="noreferrer">{f.address}</a>
          ))}
        </p>
      )}
      <p>
        Main events: <code>TokenCreated</code>, <code>Trade</code>, <code>Graduated</code>, <code>BuybackBurn</code>, <code>Claimed</code>.
        Read functions: <code>getTokens(offset, limit)</code>, <code>curves(token)</code>, <code>quoteBuy</code>, <code>quoteSell</code>, <code>ethToGraduate</code>.
      </p>

      <h2>Disclaimer</h2>
      <p>Testnet only. Test ETH and testnet coins have no value. Genesis is independent and not affiliated with LayerZero Labs.</p>
    </article>
  );
}
