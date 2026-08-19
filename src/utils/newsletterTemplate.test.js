import { getPremiumNewsletterHTML } from './newsletterTemplate';
import { filterNewsletterArticles } from './newsletterRecipients';

const articles = {
  main: {
    category: 'main',
    title: 'Main article',
    link: 'https://example.com/main',
    desc: 'Main article summary',
  },
  macro: [],
  platform: [],
  auto: [],
  ai: [],
  security: [],
};

describe('newsletterTemplate video block', () => {
  it('renders the report YouTube shorts block in email HTML', () => {
    const html = getPremiumNewsletterHTML(
      '1',
      '2026.5.29',
      null,
      articles,
      'https://oasishz.netlify.app/',
      {
        url: 'https://www.youtube.com/shorts/abc123?si=test',
        title: 'Shorts title',
        source: 'OASIS',
        desc: 'Shorts summary',
      }
    );

    expect(html).toContain('OASIS SHORTS');
    expect(html).toContain('https://www.youtube.com/watch?v=abc123');
    expect(html).toContain('https://img.youtube.com/vi/abc123/hqdefault.jpg');
    expect(html).toContain('Shorts title');
  });

  it('prefers a selected shorts campaign over the report video', () => {
    const html = getPremiumNewsletterHTML(
      '1',
      '2026.5.29',
      {
        shortsUrl: 'https://youtu.be/campaign9?feature=shared',
        securityImg: 'https://cdn.example.com/thumb.jpg',
        title: 'Campaign short',
        platform: 'YouTube',
      },
      articles,
      'https://oasishz.netlify.app/',
      {
        url: 'https://www.youtube.com/watch?v=report1',
        title: 'Report video',
      }
    );

    expect(html).toContain('https://www.youtube.com/watch?v=campaign9');
    expect(html).toContain('https://cdn.example.com/thumb.jpg');
    expect(html).toContain('Campaign short');
    expect(html).not.toContain('https://www.youtube.com/watch?v=report1');
  });
});

describe('newsletterTemplate filtered recipient content', () => {
  it('renders the Hangi spotlight together with summary blocks for an interest-filtered recipient', () => {
    const filteredArticles = filterNewsletterArticles({
      main: {
        category: 'main',
        title: 'Hangi spotlight article',
        link: 'https://example.com/spotlight',
        desc: 'Spotlight summary',
      },
      macro: [],
      platform: [],
      auto: [{
        category: 'auto',
        title: 'Mobility article',
        link: 'https://example.com/mobility',
        desc: 'Mobility summary',
      }],
      ai: [{
        category: 'ai',
        title: 'AI article',
        link: 'https://example.com/ai',
        desc: 'AI summary',
      }],
      security: [],
    }, ['auto', 'ai']);

    const html = getPremiumNewsletterHTML('1', '2026.8.19', null, filteredArticles);

    expect(html).toContain("TODAY'S PICK");
    expect(html).toContain('BUSINESS TEMP');
    expect(html).toContain('핸지 돋보기');
    expect(html).toContain('Hangi spotlight article');
  });
});
