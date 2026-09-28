import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
export const gate = readFileSync(join(dir, '../index.html'), 'utf8');
export const board = readFileSync(join(dir, '../_private/board.js'), 'utf8');
export const premios = readFileSync(join(dir, '../premiosganados/index.html'), 'utf8');

function extractConstString(src, name) {
  const prefix = `const ${name} = `;
  const i = src.indexOf(prefix);
  if (i < 0) return '';
  const start = i + prefix.length;
  if (src[start] !== '"') throw new Error(`no string for ${name}`);
  let k = start + 1;
  while (k < src.length) {
    if (src[k] === '\\') {
      k += 2;
      continue;
    }
    if (src[k] === '"') break;
    k += 1;
  }
  return JSON.parse(src.slice(start, k + 1));
}

function stripJsonConsts(src) {
  let out = src;
  for (const name of ['BOARD_CSS', 'BOARD_HTML']) {
    const prefix = `const ${name} = `;
    const i = out.indexOf(prefix);
    if (i < 0) continue;
    const start = i + prefix.length;
    let k = start + 1;
    while (k < out.length) {
      if (out[k] === '\\') {
        k += 2;
        continue;
      }
      if (out[k] === '"') break;
      k += 1;
    }
    const end = out.indexOf('\n', k);
    out = out.slice(0, i) + out.slice(end < 0 ? k + 1 : end + 1);
  }
  return out;
}

export const boardHtml = extractConstString(board, 'BOARD_HTML');
export const boardCss = extractConstString(board, 'BOARD_CSS');
export const html = boardHtml + '\n' + boardCss + '\n' + stripJsonConsts(board) + '\n' + gate;
