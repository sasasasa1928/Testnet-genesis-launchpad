/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  webpack: (config) => {
    // Optional server-side SDKs pulled in by wallet connectors; not used in the browser app.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@coinbase/cdp-sdk": false,
      "pino-pretty": false,
      "@farcaster/mini-app-solana": false,
      "@react-native-async-storage/async-storage": false,
    };
    return config;
  },
};
export default nextConfig;
