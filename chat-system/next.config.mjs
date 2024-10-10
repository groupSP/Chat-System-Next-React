import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack(config)
    {
        config.resolve.alias['@'] = path.join(__dirname, 'src');
        return config;
    },
    async rewrites()
    {
        return [
            {
                source: '/uploads/:path*',
                destination: '/uploads/:path*',
            },
        ];
    },
};

export default nextConfig;
