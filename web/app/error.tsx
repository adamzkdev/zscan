"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-muted">The data source didn&apos;t respond. It&apos;s usually temporary.</p>
      <button onClick={reset} className="mt-6 rounded-lg bg-link px-4 py-2 text-sm font-medium text-white">
        Try again
      </button>
    </div>
  );
}
