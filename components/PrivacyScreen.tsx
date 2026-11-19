"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { DEFAULT_PRIVACY, PRIVACY_KEY, type PrivacySettings } from "@/lib/privacy-screen";

/* ------------------------------------------------------------------ store */

type State = PrivacySettings & { /** Phone currently lying face down. */ flipped: boolean };

const SERVER: State = { ...DEFAULT_PRIVACY, flipped: false };
let state: State | null = null;
const listeners = new Set<() => void>();

function load(): PrivacySettings {
  try {
    const p = JSON.parse(localStorage.getItem(PRIVACY_KEY) ?? "{}");
    return { hide: p.hide === true, addresses: p.addresses === true, flip: p.flip === true };
  } catch {
    return { ...DEFAULT_PRIVACY };
  }
}

function snapshot(): State {
  return (state ??= { ...load(), flipped: false });
}

// Keeps other tabs in step.
const onStorage = (e: StorageEvent) => e.key === PRIVACY_KEY && set(load(), false);

function subscribe(cb: () => void) {
  if (!listeners.size) window.addEventListener("storage", onStorage);
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
    if (!listeners.size) window.removeEventListener("storage", onStorage);
  };
}

function set(patch: Partial<State>, persist = true) {
  const next = { ...snapshot(), ...patch };
  state = next;
  if (persist) {
    try {
      const { hide, addresses, flip } = next;
      localStorage.setItem(PRIVACY_KEY, JSON.stringify({ hide, addresses, flip }));
    } catch {}
  }
  const c = document.documentElement.classList;
  c.toggle("hide-amounts", next.hide || next.flipped);
  c.toggle("hide-addresses", next.addresses);
  listeners.forEach((l) => l());
}

export function setPrivacy(patch: Partial<PrivacySettings>) {
  set(patch);
}

function toggleHide() {
  set({ hide: !snapshot().hide });
}

export function usePrivacy(): State {
  return useSyncExternalStore(subscribe, snapshot, () => SERVER);
}

/** Amounts are blurred right now (setting on, or phone face down). */
export function useAmountsHidden() {
  const s = usePrivacy();
  return s.hide || s.flipped;
}

/** Addresses are blurred right now. */
export function useAddressesHidden() {
  const s = usePrivacy();
  return s.addresses && (s.hide || s.flipped);
}

/* ------------------------------------------------------------------ phone flip */

type PermissionApi = { requestPermission?: () => Promise<"granted" | "denied"> };
const orientationApi = () => (typeof DeviceOrientationEvent === "undefined" ? undefined : (DeviceOrientationEvent as unknown as PermissionApi));

/** Phones and tablets with an orientation sensor; never desktops. */
function canFlip() {
  return orientationApi() !== undefined && matchMedia("(pointer: coarse) and (hover: none)").matches;
}
const noop = () => () => {};
function useCanFlip() {
  return useSyncExternalStore(noop, canFlip, () => false);
}

/** Turns "flip to hide" on; iOS asks for motion access, which needs this user gesture. */
async function enableFlip(): Promise<string | null> {
  const api = orientationApi();
  if (typeof api?.requestPermission === "function") {
    try {
      if ((await api.requestPermission()) !== "granted") return "Motion access was not allowed.";
    } catch {
      return "Motion access was not allowed.";
    }
  }
  setPrivacy({ flip: true });
  return null;
}

/** Shift+H, and the face-down sensor when enabled. Mounted once, in the header. */
function usePrivacyEffects(flip: boolean) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.shiftKey || e.ctrlKey || e.metaKey || e.altKey || e.repeat || e.key.toLowerCase() !== "h") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      toggleHide();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!flip || !canFlip()) return;
    let down = false;
    // Face down: beta near ±180 with little sideways tilt. A gap between the two thresholds keeps
    // small wobbles from toggling.
    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta == null) return;
      const b = Math.abs(e.beta);
      const g = Math.abs(e.gamma ?? 0);
      if (!down && b > 150 && g < 35) {
        down = true;
        set({ flipped: true }, false);
      } else if (down && b < 120) {
        down = false;
        set({ flipped: false }, false);
      }
    };
    window.addEventListener("deviceorientation", onOrientation);
    // iOS grants motion access per page: ask again on the first tap (no prompt once granted).
    const api = orientationApi();
    const regrant = () => void api?.requestPermission?.().catch(() => {});
    if (typeof api?.requestPermission === "function") document.addEventListener("click", regrant, { once: true });
    return () => {
      window.removeEventListener("deviceorientation", onOrientation);
      document.removeEventListener("click", regrant);
      if (snapshot().flipped) set({ flipped: false }, false);
    };
  }, [flip]);
}

/* ------------------------------------------------------------------ UI */

export function EyeIcon({ off = false, size = 15 }: { off?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {off ? (
        <>
          <path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-2.6 3.4M6.6 6.6C3.9 8.4 2.5 12 2.5 12S6 19 12 19a9.7 9.7 0 0 0 5.4-1.6" />
          <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
        </>
      ) : (
        <>
          <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: React.ReactNode; hint?: React.ReactNode }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="min-w-0">
        <span id={id} className="text-sm text-text">
          {label}
        </span>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors ${checked ? "border-link bg-link" : "border-border-strong bg-surface-2"}`}
      >
        <span className={`inline-block size-3.5 rounded-full shadow-sm transition-transform ${checked ? "translate-x-[18px] bg-white" : "translate-x-[2px] bg-faint"}`} />
      </button>
    </div>
  );
}

/** The privacy-screen settings, shared by the header popover and the mobile menu. */
export function PrivacySettingsList() {
  const s = usePrivacy();
  const phone = useCanFlip();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="divide-y divide-border">
      <Switch
        checked={s.hide}
        onChange={(v) => setPrivacy({ hide: v })}
        label={
          <>
            Hide amounts <kbd className="ml-1 rounded border border-border px-1 font-mono text-[10px] text-muted">Shift+H</kbd>
          </>
        }
        hint="Blurs ZEC and fiat amounts and balances."
      />
      <Switch checked={s.addresses} onChange={(v) => setPrivacy({ addresses: v })} label="Also hide addresses" />
      {phone && (
        <Switch
          checked={s.flip}
          onChange={async (v) => {
            setError(null);
            if (!v) return setPrivacy({ flip: false });
            const err = await enableFlip();
            if (err) setError(err);
          }}
          label="Flip to hide"
          hint={error ?? "Hides amounts while the phone lies face down."}
        />
      )}
    </div>
  );
}

/** Header eye button (toggles hiding) with a small options popover on wide screens. */
export function PrivacyToggle() {
  const s = usePrivacy();
  const hidden = s.hide || s.flipped;
  const [open, setOpen] = useState(false);
  const [announce, setAnnounce] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  usePrivacyEffects(s.flip);

  // Screen readers hear the change, including from the keyboard shortcut (not on first render).
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setAnnounce(hidden ? "Amounts hidden" : "Amounts shown");
  }, [hidden]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative flex">
      <button
        type="button"
        onClick={toggleHide}
        aria-pressed={hidden}
        aria-label="Hide amounts"
        aria-keyshortcuts="Shift+H"
        title={hidden ? "Amounts hidden (Shift+H to show)" : "Hide amounts (Shift+H)"}
        className={`grid size-8 place-items-center rounded-lg border lg:rounded-r-none ${hidden ? "border-link/40 bg-link/10 text-link" : "border-border bg-surface text-muted hover:text-text"}`}
      >
        <EyeIcon off={hidden} />
      </button>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Privacy screen options"
        title="Privacy screen options"
        className={`hidden h-8 w-5 place-items-center rounded-r-lg border border-l-0 lg:grid ${hidden ? "border-link/40 bg-link/10 text-link" : "border-border bg-surface text-muted hover:text-text"}`}
      >
        <svg width="9" height="9" viewBox="0 0 24 24" aria-hidden>
          <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="3" />
        </svg>
      </button>
      {open && (
        <div role="dialog" aria-label="Privacy screen" className="absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border border-border bg-surface px-4 py-2 text-left shadow-lg">
          <p className="pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-faint">Privacy screen</p>
          <PrivacySettingsList />
          <p className="border-t border-border py-2 text-xs text-muted">For screens others can see. Saved in this browser only.</p>
        </div>
      )}
      <span role="status" className="sr-only">
        {announce}
      </span>
    </div>
  );
}
