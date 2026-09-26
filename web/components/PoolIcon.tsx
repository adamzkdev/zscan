const POOL = {
  ironwood: { color: "var(--pool-ironwood)", letter: "I", name: "Ironwood" },
  orchard: { color: "var(--pool-orchard)", letter: "O", name: "Orchard" },
  sapling: { color: "var(--pool-sapling)", letter: "S", name: "Sapling" },
  sprout: { color: "var(--pool-sprout)", letter: "Sp", name: "Sprout" },
} as const;

export type ShieldedPool = keyof typeof POOL;

export function poolFromName(name: string): ShieldedPool | null {
  const k = name.toLowerCase();
  return k in POOL ? (k as ShieldedPool) : null;
}

/** A shield badge in the pool's color with its initial, e.g. a green "I" for Ironwood. */
export function PoolIcon({ pool, size = 16 }: { pool: ShieldedPool; size?: number }) {
  const p = POOL[pool];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={`${p.name} pool`} className="inline-block shrink-0">
      <path d="M12 1.8 21 5.6v6.2c0 5.6-3.8 9.5-9 10.9-5.2-1.4-9-5.3-9-10.9V5.6l9-3.8Z" fill={p.color} />
      <text x="12" y="15.6" textAnchor="middle" fontSize={p.letter.length > 1 ? 8 : 10.5} fontWeight="700" fill="#fff" fontFamily="ui-sans-serif, system-ui">
        {p.letter}
      </text>
    </svg>
  );
}

/** Pool badge + name, e.g. for From / To cells on shielded transactions. */
export function PoolTag({ name }: { name: string }) {
  const parts = name.split(" + ");
  return (
    <span className="inline-flex items-center gap-1 text-text">
      {parts.map((part) => {
        const p = poolFromName(part);
        return p ? <PoolIcon key={part} pool={p} size={15} /> : null;
      })}
      <span className="text-muted">{name}</span>
    </span>
  );
}
