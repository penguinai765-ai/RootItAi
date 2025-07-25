/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    // Essential for Firebase Functions (2nd Gen) deployment
    output: 'standalone',

    // Prevents trailing slash issues in Cloud Run
    trailingSlash: true,

    // Disable image optimization for serverless deployment
    images: {
        unoptimized: true
    },

    // Updated: moved from experimental to top-level
    serverExternalPackages: ['firebase-admin'],
};

module.exports = nextConfig;
