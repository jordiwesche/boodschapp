import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Optimize production builds
  productionBrowserSourceMaps: false,
  // Compress output
  compress: true,
};

// Bundle analyzer - only enable when ANALYZE env var is set
if (process.env.ANALYZE === 'true') {
  const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: true,
  })
  module.exports = withBundleAnalyzer(nextConfig)
} else {
  module.exports = nextConfig
}

export default nextConfig;
