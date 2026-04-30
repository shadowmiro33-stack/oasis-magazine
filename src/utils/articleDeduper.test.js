import { dedupeArticles, isDuplicateArticle, normalizeArticleUrl } from './articleDeduper';

describe('articleDeduper', () => {
  test('normalizes article urls without tracking parameters or hashes', () => {
    expect(normalizeArticleUrl('https://www.example.com/news/123?utm_source=x#section')).toBe('example.com/news/123');
    expect(normalizeArticleUrl('https://example.com/news/123?fbclid=abc')).toBe('example.com/news/123');
  });

  test('keeps article identity parameters in normalized urls', () => {
    expect(normalizeArticleUrl('https://www.example.com/news/view?id=123&utm_source=x')).toBe('example.com/news/view?id=123');
    expect(normalizeArticleUrl('https://example.com/news/view?aid=9&oid=1#section')).toBe('example.com/news/view?aid=9&oid=1');
  });

  test('treats the same article url with different tracking parameters as duplicate', () => {
    const existing = [{ title: 'Existing', link: 'https://news.example.com/article/42?utm_source=mail' }];
    const incoming = { title: 'Incoming', link: 'https://news.example.com/article/42?utm_campaign=naver' };

    expect(isDuplicateArticle(incoming, existing)).toBe(true);
  });

  test('allows urls with different article query parameters', () => {
    const existing = [{ title: 'Existing', link: 'https://news.example.com/view?idxno=100' }];
    const incoming = { title: 'Incoming', link: 'https://news.example.com/view?idxno=200' };

    expect(isDuplicateArticle(incoming, existing)).toBe(false);
  });

  test('allows the same title when the urls are different', () => {
    const existing = [{ title: 'Market update', link: 'https://news.example.com/article/1' }];
    const incoming = { title: 'Market update', link: 'https://news.example.com/article/2' };

    expect(isDuplicateArticle(incoming, existing)).toBe(false);
  });

  test('dedupes imported batches against existing and within the batch by normalized url', () => {
    const existing = [{ title: 'Existing', link: 'https://news.example.com/article/1?utm=old' }];
    const items = [
      { title: 'Already published', link: 'https://news.example.com/article/1?utm=new' },
      { title: 'Fresh', link: 'https://news.example.com/article/2?id=10&utm_source=a' },
      { title: 'Fresh duplicate', link: 'https://www.news.example.com/article/2?id=10&utm_source=b#top' },
    ];

    const result = dedupeArticles(items, existing);

    expect(result.unique).toEqual([{ title: 'Fresh', link: 'https://news.example.com/article/2?id=10&utm_source=a' }]);
    expect(result.duplicateCount).toBe(2);
  });
});
