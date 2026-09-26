/** The ZEC token mark: a gold coin with the Zcash "Z". */
export function ZecIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={`inline-block shrink-0 ${className}`} role="img" aria-label="ZEC">
      <circle cx="16" cy="16" r="16" fill="#F4B728" />
      <g fill="#231F20">
        <rect x="14.75" y="6.2" width="2.5" height="4" />
        <rect x="10" y="10" width="12" height="2.7" />
        <polygon points="18.9,12.7 22,12.7 13.1,19.3 10,19.3" />
        <rect x="10" y="19.3" width="12" height="2.7" />
        <rect x="14.75" y="22" width="2.5" height="3.8" />
      </g>
    </svg>
  );
}
