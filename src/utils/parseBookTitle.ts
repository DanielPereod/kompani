export function parseBookTitle(book: string) {
  if (process.platform === "win32") {
    return Buffer.from(book, 'latin1').toString('utf-8');
  }
  return book;
}
