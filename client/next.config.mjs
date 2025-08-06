/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_IMAGE_HOST: process.env.NEXT_PUBLIC_IMAGE_HOST,
  },
  reactStrictMode: false,
  images: {
    remotePatterns: [
      // {
      //   hostname: process.env.NEXT_PUBLIC_IMAGE_HOST,
      //   pathname: "/**",
      //   protocol: "https",
      // },
      {
        hostname: "localhost",
        pathname: "/files/**",
        protocol: "http",
      },
    ],
  },
};

export default nextConfig;
