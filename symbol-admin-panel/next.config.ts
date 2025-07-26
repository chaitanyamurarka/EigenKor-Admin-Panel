/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@nextui-org/react', 
    '@nextui-org/theme', 
    '@nextui-org/dom-animation'
  ],
};

export default nextConfig;