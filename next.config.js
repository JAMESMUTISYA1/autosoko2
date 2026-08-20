/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === "development";

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },

  // Security headers applied to every response. These cover the
  // browser-enforceable half of Document 1's security requirements
  // (OWASP baseline) — the other half (auth, RBAC, rate limiting,
  // input validation) lives server-side per Document 3.
  async headers() {
    // Development needs 'unsafe-eval' for Next.js hot reload and source maps.
    // Production keeps script-src locked down without eval.
    const cspValue = isDev
      ? [
          "default-src 'self'",
          "img-src 'self' https://images.unsplash.com https://res.cloudinary.com data:",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          "connect-src 'self' ws: wss:",
          "frame-ancestors 'none'",
        ].join("; ")
      : [
          "default-src 'self'",
          "img-src 'self' https://images.unsplash.com https://res.cloudinary.com data:",
          "script-src 'self' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          "connect-src 'self'",
          "frame-ancestors 'none'",
        ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          // Prevents the site being framed by another origin (clickjacking)
          { key: "X-Frame-Options", value: "DENY" },
          // Stops the browser guessing content-types (MIME sniffing)
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Limits how much referrer info leaks to other origins
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Disables browser features this site has no reason to use
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
          // Forces HTTPS for a year once a browser has seen it once
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // Conditional Content Security Policy
          {
            key: "Content-Security-Policy",
            value: cspValue,
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;