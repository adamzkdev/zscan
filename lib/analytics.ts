/**
 * Plausible page-view counting, with every URL it receives redacted first: long identifiers in
 * the path (addresses, txids, block hashes, keys) become `:hash` / `:id`, and the query string is
 * dropped except campaign tags. Applies to page views, outbound-link and file-download events and
 * the referrer, so Plausible never learns which address or transaction a visitor looked at.
 * Same idea as the API's access logs, which replace them with placeholders.
 */
const REDACT =
  "function(u){try{var x=new URL(u,location.href),q=new URLSearchParams();" +
  'x.pathname=x.pathname.split("/").map(function(s){return /^[0-9a-f]{64}$/i.test(s)?":hash":s.length>=26&&/^[0-9A-Za-z%._-]+$/.test(s)?":id":s}).join("/");' +
  'x.searchParams.forEach(function(v,k){if(/^(utm_\\w+|ref|source)$/.test(k))q.set(k,v)});' +
  'x.search=q.toString();x.hash="";return x.toString()}catch(e){return null}}';

export const PLAUSIBLE_INIT =
  "window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};" +
  `plausible.init({transformRequest:function(p){var R=${REDACT};p.u=R(p.u);if(!p.u)return null;if(p.r)p.r=R(p.r);if(p.p&&p.p.url)p.p.url=R(p.p.url);return p}})`;
