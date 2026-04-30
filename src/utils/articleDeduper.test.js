import { dedupeArticles, isDuplicateArticle, normalizeArticleUrl } from './articleDeduper';

describe('articleDeduper', () => {
  test('normalizes article urls without query parameters or hashes', () => {
    expect(normalizeArticleUrl('https://www.example.com/news/123?utm_source=x#section')).toBe('example.com/news/123');
    expect(normalizeArticleUrl('https://example.com/news/123?fbclid=abc')).toBe('example.com/news/123');
  });

  test('treats the same article url with different parameters as duplicate', () => {
    const existing = [{ title: 'Existing', link: 'https://news.example.com/article/42?utm_source=mail' }];
    const incoming = { title: 'Incoming', link: 'https://news.example.com/article/42?ref=naver' };

    expect(isDuplicateArticle(incoming, existing)).toBe(true);
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
      { title: 'Fresh', link: 'https://news.example.com/article/2?utm=a' },
      { title: 'Fresh duplicate', link: 'https://www.news.example.com/article/2?utm=b#top' },
    ];

    const result = dedupeArticles(items, existing);

    expect(result.unique).toEqual([{ title: 'Fresh', link: 'https://news.example.com/article/2?utm=a' }]);
    expect(result.duplicateCount).toBe(2);
  });
});
