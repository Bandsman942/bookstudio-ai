import type { NextConfig } from 'next';
const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@bookstudio/domain', '@bookstudio/database'],
  poweredByHeader: false,
  // Keep offline OFL WOFF files available inside the Vercel serverless exporter.
  outputFileTracingIncludes: {'/api/v1/books/**': ['./node_modules/@fontsource/ibm-plex-sans/files/*.woff']},
  async headers() {
    return [{source:'/:path*', headers:[
      {key:'X-Content-Type-Options',value:'nosniff'},
      {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
      {key:'X-Frame-Options',value:'DENY'},
      {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},
    ]}];
  },
};
export default config;
