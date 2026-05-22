import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', // <-- ADD THIS EXACT LINE
  // leave any other settings you already have in here alone
};

export default nextConfig;
