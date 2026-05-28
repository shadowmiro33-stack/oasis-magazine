import {
  buildNewsletterSendPlan,
  getSubscriberCategoryKeys,
} from './newsletterRecipients';

describe('newsletter recipient category mapping', () => {
  it('maps current public subscriber labels to newsletter category keys', () => {
    expect(getSubscriberCategoryKeys({ interests: ['경제'] })).toEqual(['macro']);
    expect(getSubscriberCategoryKeys({ interests: ['비즈'] })).toEqual(['platform']);
    expect(getSubscriberCategoryKeys({ interests: ['자동차'] })).toEqual(['auto']);
    expect(getSubscriberCategoryKeys({ interests: ['AI'] })).toEqual(['ai']);
    expect(getSubscriberCategoryKeys({ interests: ['보안'] })).toEqual(['security']);
  });

  it('keeps full platform labels from leaking into auto through the legacy 산업 alias', () => {
    expect(getSubscriberCategoryKeys({ interests: ['산업·플랫폼'] })).toEqual(['platform']);
  });

  it('uses stable interest keys when newly saved subscribers include them', () => {
    expect(getSubscriberCategoryKeys({ interestKeys: ['auto'], interests: ['자동차'] })).toEqual(['auto']);
  });

  it('treats interest keys as authoritative when legacy labels disagree', () => {
    expect(getSubscriberCategoryKeys({ interestKeys: ['auto'], interests: ['비즈'] })).toEqual(['auto']);
  });

  it('builds send plan groups from legacy label-only subscriber interests', () => {
    const plan = buildNewsletterSendPlan([
      { email: 'car@example.com', interests: ['자동차'], status: 'active' },
      { email: 'ai@example.com', interests: ['AI'], status: 'active' },
    ], {
      main: { category: 'main', title: 'Top story' },
      macro: [],
      platform: [],
      auto: [{ category: 'auto', title: 'Auto story' }],
      ai: [{ category: 'ai', title: 'AI story' }],
      security: [],
    });

    expect(plan.deliverableCount).toBe(2);
    expect(plan.groups.map(group => group.key).sort()).toEqual(['ai', 'auto']);
    expect(plan.groups.find(group => group.key === 'auto').emails).toEqual(['car@example.com']);
  });
});
