export const dynamic = 'force-dynamic';
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center px-6 py-24">
        <div className="text-center max-w-sm">
          <p className="font-mono text-xs text-muted mb-3">ERROR 404</p>
          <h1 className="font-display text-3xl mb-3">Page Not Found</h1>
          <p className="text-sm text-muted mb-8">
            The page you're looking for doesn't exist or may have been moved.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/"
              className="bg-accent text-white text-sm font-semibold px-5 py-2.5 rounded-sm hover:bg-accent/90 transition-colors"
            >
              Back to Home
            </Link>
            <Link
              href="/search"
              className="border border-fg text-sm font-medium px-5 py-2.5 rounded-sm hover:bg-fg hover:text-bg transition-colors"
            >
              Browse Parts
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
