"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0A0A0B] text-white antialiased flex items-center justify-center px-4">
        <main className="w-full max-w-lg space-y-5 border border-[#2A2C31] bg-[#16171A] p-8">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#FF1F2E]">
            Studio desk error
          </p>
          <h1 className="text-2xl font-bold text-white">
            Something went wrong loading this view.
          </h1>
          <p className="text-sm leading-relaxed text-[#9AA0A6]">
            Please try reloading this screen. If the problem continues, contact the Hephzibah Media desk.
          </p>
          {error.digest && (
            <p className="font-mono text-xs text-[#9AA0A6]">Reference: {error.digest}</p>
          )}
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-[48px] items-center justify-center rounded-[2px] bg-[#00E5FF] px-5 py-2.5 text-sm font-bold text-[#0A0A0B] cursor-pointer hover:brightness-110 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#00E5FF]"
          >
            Reload screen
          </button>
        </main>
      </body>
    </html>
  );
}
