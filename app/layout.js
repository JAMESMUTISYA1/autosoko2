import { Archivo_Black, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/contexts/ToastContext";
import { CartProvider } from "@/contexts/CartContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";

const displayFont = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata = {
  title: "AutoSoko — East Africa's Auto Parts Marketplace",
  description:
    "Find genuine, aftermarket, and used auto parts from verified sellers across Kenya, Uganda, Tanzania, Rwanda, Burundi, and South Sudan.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}
    >
      <body className="flex min-h-screen flex-col bg-bg text-fg">
        <SessionProviderWrapper>
          <ToastProvider>
            <CartProvider>
              <WishlistProvider>{children}</WishlistProvider>
            </CartProvider>
          </ToastProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
