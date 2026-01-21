export function parseBookTitle(book: string) {
  if (process.platform === "win32") {
    return Buffer.from(book, 'latin1').toString('utf-8');
  }
  return book;
}

export function encodeBookPath(path: string) {
  if (process.platform === "win32") {
    return Buffer.from(path, 'utf-8').toString('latin1');
  }
  return path;
}
