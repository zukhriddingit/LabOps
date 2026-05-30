/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // three.js ships ESM; transpiling keeps the App Router build happy.
  transpilePackages: ["three"],
};

export default nextConfig;
