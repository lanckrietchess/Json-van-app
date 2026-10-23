/* The key for a text: FNV-1a (32 bit) of the whitespace-normalised original plus its length. Must stay identical to LC25.fold.key in the app
   (tests/shorten_keys.test.js checks both against the same texts). Editing a course text changes its key, which retires its old rewrite. */
export const fnv=str=>{let h=0x811c9dc5;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0}return h.toString(16).padStart(8,'0')};
export const normText=t=>String(t==null?'':t).replace(/\s+/g,' ').trim();
export const textKey=t=>{const n=normText(t);return fnv(n)+':'+n.length};
