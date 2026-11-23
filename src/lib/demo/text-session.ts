export interface MarkedRange {
  start: number;
  end: number;
  original: string;
}

export interface TextSession {
  text: string;
  selectionStart: number;
  selectionEnd: number;
  mark?: MarkedRange;
}

export function createTextSession(text = ''): TextSession {
  return { text, selectionStart: text.length, selectionEnd: text.length };
}

function replaceRange(session: TextSession, start: number, end: number, value: string): TextSession {
  const text = session.text.slice(0, start) + value + session.text.slice(end);
  const cursor = start + value.length;
  return { text, selectionStart: cursor, selectionEnd: cursor };
}

export function insertText(session: TextSession, value: string): TextSession {
  const settled = finishMarkedText(session);
  return replaceRange(settled, settled.selectionStart, settled.selectionEnd, value);
}

export function updateMarkedText(session: TextSession, value: string): TextSession {
  if (session.mark) {
    const next = replaceRange(session, session.mark.start, session.mark.end, value);
    return { ...next, mark: { ...session.mark, end: session.mark.start + value.length } };
  }
  const start = session.selectionStart;
  const original = session.text.slice(session.selectionStart, session.selectionEnd);
  const next = replaceRange(session, session.selectionStart, session.selectionEnd, value);
  return { ...next, mark: { start, end: start + value.length, original } };
}

export function commitMarkedText(session: TextSession, value: string): TextSession {
  if (!session.mark) return insertText(session, value);
  return replaceRange(session, session.mark.start, session.mark.end, value);
}

export function finishMarkedText(session: TextSession): TextSession {
  if (!session.mark) return session;
  const { mark: _mark, ...settled } = session;
  return settled;
}

export function cancelMarkedText(session: TextSession): TextSession {
  if (!session.mark) return session;
  return replaceRange(session, session.mark.start, session.mark.end, session.mark.original);
}

export function setSelection(session: TextSession, start: number, end = start): TextSession {
  const settled = finishMarkedText(session);
  const lower = Math.max(0, Math.min(start, settled.text.length));
  const upper = Math.max(lower, Math.min(end, settled.text.length));
  return { ...settled, selectionStart: lower, selectionEnd: upper };
}

function codePointBoundaries(text: string): number[] {
  const boundaries = [0];
  let offset = 0;
  for (const character of text) {
    offset += character.length;
    boundaries.push(offset);
  }
  return boundaries;
}

export function deleteBackward(session: TextSession): TextSession {
  const settled = finishMarkedText(session);
  if (settled.selectionStart !== settled.selectionEnd) {
    return replaceRange(settled, settled.selectionStart, settled.selectionEnd, '');
  }
  if (settled.selectionStart === 0) return settled;
  const previous = codePointBoundaries(settled.text).filter((value) => value < settled.selectionStart).at(-1) ?? 0;
  return replaceRange(settled, previous, settled.selectionStart, '');
}

export function moveCursor(session: TextSession, amount: number): TextSession {
  if (!amount) return finishMarkedText(session);
  const settled = finishMarkedText(session);
  if (settled.selectionStart !== settled.selectionEnd) {
    const edge = amount < 0 ? settled.selectionStart : settled.selectionEnd;
    return { ...settled, selectionStart: edge, selectionEnd: edge };
  }
  const boundaries = codePointBoundaries(settled.text);
  let index = boundaries.findIndex((value) => value >= settled.selectionStart);
  if (index < 0) index = boundaries.length - 1;
  const target = boundaries[Math.max(0, Math.min(boundaries.length - 1, index + amount))];
  return { ...settled, selectionStart: target, selectionEnd: target };
}
