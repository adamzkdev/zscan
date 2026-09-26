export function Logo({ size = 28 }: { size?: number }) {
  // A "Z" drawn as a scan line crossing a shield.
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <path
        d="M16 2.5 27.5 7v8.6c0 7-4.8 11.9-11.5 13.9C9.3 27.5 4.5 22.6 4.5 15.6V7L16 2.5Z"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
      />
      <path d="M11 11h10l-10 10h10" fill="none" stroke="var(--text)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.5 16h17" stroke="var(--pool-ironwood)" strokeWidth="1.2" strokeDasharray="2 2" opacity=".8" />
    </svg>
  );
}
