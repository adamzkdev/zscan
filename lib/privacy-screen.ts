/**
 * Privacy screen ("hide amounts"): settings kept in localStorage, applied as classes on <html> so
 * CSS blurs server-rendered amounts too (see `.amt` / `.addr` in globals.css).
 *
 *   hide-amounts    amounts and balances (ZEC and fiat) are blurred
 *   hide-addresses  addresses too (only takes effect together with hide-amounts)
 */

export const PRIVACY_KEY = "privacy-screen";

export type PrivacySettings = {
  /** Blur amounts and balances. */
  hide: boolean;
  /** Also blur addresses while amounts are hidden. */
  addresses: boolean;
  /** Phones: hide while the phone lies face down. */
  flip: boolean;
};

export const DEFAULT_PRIVACY: PrivacySettings = { hide: false, addresses: false, flip: false };

/** Inline script for <head>: applies saved settings before first paint (no flash of amounts). */
export const PRIVACY_SCRIPT = `try{var p=JSON.parse(localStorage.getItem("${PRIVACY_KEY}")||"{}"),c=document.documentElement.classList;if(p.hide)c.add("hide-amounts");if(p.addresses)c.add("hide-addresses")}catch(e){}`;
