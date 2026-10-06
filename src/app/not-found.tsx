import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center px-4 text-center">
      <p className="text-7xl sm:text-8xl font-display font-bold tracking-tight">
        4<span className="italic text-amber-400">0</span>4
      </p>
      <h1 className="mt-4 font-display text-2xl sm:text-3xl font-bold">
        This page wandered off
      </h1>
      <p className="mt-3 max-w-sm text-sm sm:text-base text-zinc-400 leading-relaxed">
        The page you&apos;re looking for doesn&apos;t exist or may have been
        moved. The collection, however, is right where you left it.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <Link
          href="/"
          className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-amber-600 hover:bg-amber-500 text-white font-semibold transition-colors"
        >
          Back to the store
        </Link>
      </div>
      <p className="mt-10 text-xs text-zinc-600">
        ONE N ONLY · Faisalabad, Pakistan · Cash on Delivery
      </p>
    </div>
  );
}
