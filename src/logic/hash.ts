/**
 * Computes a deterministic stable 32-character hex hash for an offer
 * based on canonical MLB ID, normalized clean title, and seller name.
 * This guarantees the exact same deal yields the identical hash regardless of transient URL params.
 */
export function generateStableHash(mlbId: string, title: string, sellerName: string): string {
  const cleanMlb = (mlbId || '').trim().toUpperCase();
  const cleanTitle = (title || '')
    .toLowerCase()
    .replace(/[^\w\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  const cleanSeller = (sellerName || '').toLowerCase().trim();

  const rawKey = `${cleanMlb}|${cleanTitle}|${cleanSeller}`;

  // Deterministic FNV-1a 64-bit + Murmur-inspired mixing into a 32-hex character string
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  let h3 = 0x85ebca6b;
  let h4 = 0xc2b2ae35;

  for (let i = 0; i < rawKey.length; i++) {
    const code = rawKey.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 0x01000193);
    h2 = Math.imul(h2 ^ (code << 3), 0x27d4eb2d);
    h3 = Math.imul(h3 ^ (code >> 2), 0x165667b1);
    h4 = Math.imul(h4 ^ (code + i), 0x45d9f3b);
  }

  const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return `${toHex(h1)}${toHex(h2)}${toHex(h3)}${toHex(h4)}`.toLowerCase();
}
