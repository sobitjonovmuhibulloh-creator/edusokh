/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Dev rejimida telefon/planshetdan mahalliy tarmoq orqali ochish uchun (kompyuter IP manzili)
  allowedDevOrigins: ["172.19.16.150"],
  // three.js ESM modullarini Next.js orqali transpile qilish
  transpilePackages: ["three"],
};

export default nextConfig;
