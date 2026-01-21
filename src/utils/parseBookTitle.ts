export function parseBookTitle(book: string) {
  return Buffer.from(book, 'latin1').toString('utf-8');
}
