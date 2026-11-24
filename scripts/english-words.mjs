// Writes static/core/english.txt: the English completion list the core loads when an
// English keyboard with suggestions is listed. Words come from SCOWL (wordlist-english).
// Rank: most common size levels first; within a level, shorter words first. Lines are
// "word<TAB>rank" sorted by the lowercased word, so the core loads them without sorting.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const root = dirname(require.resolve('wordlist-english/package.json'));
const levels = [10, 20, 35, 40, 50, 55, 60];
const seen = new Set();
const words = [];
for (const level of levels) {
  const batch = ['english', 'american'].flatMap((dialect) => JSON.parse(readFileSync(join(root, `${dialect}-words-${level}.json`), 'utf8')));
  batch.sort((a, b) => a.length - b.length || a.localeCompare(b, 'en'));
  for (const word of batch) {
    if (word.length < 2 || seen.has(word) || !/^[\p{L}']+$/u.test(word)) continue;
    seen.add(word);
    words.push(word);
  }
}
const out = new URL('../static/core/', import.meta.url);
mkdirSync(out, { recursive: true });
const ranked = words.map((word, rank) => ({ word, rank, key: word.toLowerCase() }));
// Code point order, as Swift compares the lowercased keys.
ranked.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : a.rank - b.rank));
writeFileSync(new URL('english.txt', out), ranked.map(({ word, rank }) => `${word}\t${rank}`).join('\n') + '\n');
writeFileSync(new URL('english.LICENSE', out), readFileSync(join(root, 'Copyright'), 'utf8'));
console.log(`english.txt: ${words.length} words`);
