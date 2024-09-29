const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        
        fs: false,
      
            "pdfjs-dist": require.resolve("pdfjs-dist/build/pdf.worker.entry"),
        net: false,
        tls: false,
        canvas: false,
      };
    }

    config.resolve.alias['pdfjs-dist'] = path.join(__dirname, 'node_modules/pdfjs-dist/build/pdf.js');

    return config;
  },
};



module.exports = nextConfig;
