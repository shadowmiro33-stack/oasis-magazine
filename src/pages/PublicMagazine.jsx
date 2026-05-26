import React, { useEffect, useState } from 'react';
import { collection, doc, getDocs, query, setDoc } from 'firebase/firestore';
import { db } from '../api/firebase';
import { getAnalyticsSettings } from '../services/dataService';
import { initGoogleAnalytics, trackArticleClick, trackMagazinePageView } from '../utils/analytics';
import { normalizeExternalUrl, normalizeImageUrl, sanitizeMagazineUrls } from '../utils/urlSanitizer';
import './PublicMagazine.css';

const fallbackArticleImage = 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400';
const fallbackMainImage = 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=800';

const categories = [
  { key: 'macro', title: '경제·비즈니스', label: '경제', icon: '🌐', accent: '#2563eb', soft: '#dbeafe', description: '시장, 정책, 기업 흐름과 투자 환경의 변화를 빠르게 확인합니다.' },
  { key: 'platform', title: '산업·플랫폼', label: '비즈', icon: '🛒', accent: '#d97706', soft: '#fef3c7', description: '산업과 플랫폼 사업자의 움직임을 고객 관점에서 모읍니다.' },
  { key: 'auto', title: '자동차·모빌리티', label: '자동차', icon: '🚗', accent: '#059669', soft: '#d1fae5', description: '자동차, 중고차, 모빌리티 생태계 뉴스를 정리합니다.' },
  { key: 'ai', title: 'AI·테크', label: 'AI', icon: '🤖', accent: '#7c3aed', soft: '#ede9fe', description: 'AI 기술과 제품 전략의 실무 신호를 읽습니다.' },
  { key: 'security', title: '보안·리스크', label: '보안', icon: '🛡️', accent: '#0f766e', soft: '#ccfbf1', description: '보안 위협, 리스크 대응, 사내 캠페인까지 함께 봅니다.' },
];

const fallbackCategory = { key: 'main', title: '핸지 브리프', label: '브리프', icon: 'O', accent: '#1f2937', soft: '#f3f4f6' };
const categoryLookup = categories.reduce((acc, category) => ({ ...acc, [category.key]: category }), {});
const getCategoryMeta = (key) => categoryLookup[key] || fallbackCategory;

const getDateToken = (value) => String(value || '').match(/\d{4}-\d{2}-\d{2}/)?.[0] || '';

const getReportDate = (report) => {
  if (!report) return '';
  return getDateToken(report.id) || getDateToken(report.publishDateId) || getDateToken(report.publishDate) || getDateToken(report.date);
};

const formatLocalDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getSafeImageUrl = (url, fallback = fallbackArticleImage) => {
  return normalizeImageUrl(url, { fallback, blockedHosts: ['nateimg.co.kr'] });
};

const getSafeArticleUrl = (url) => {
  return normalizeExternalUrl(url, { fallback: '' });
};

const getArticleSource = (article = {}) => article.source || article.brand || 'OASIS';

const openNativeDatePicker = (event) => {
  if (typeof event.currentTarget.showPicker !== 'function') return;
  try {
    event.currentTarget.showPicker();
  } catch (_) {
    // Some browsers throw if the native picker is already opening.
  }
};

const getYoutubeEmbed = (url) => {
  if (!url) return '';
  let id = '';
  if (url.includes('youtu.be/')) id = url.split('youtu.be/')[1].split('?')[0];
  else if (url.includes('v=')) id = url.split('v=')[1].split('&')[0];
  else if (url.includes('embed/')) id = url.split('embed/')[1].split('?')[0];
  return id ? `https://www.youtube.com/embed/${id}?autoplay=0&rel=0` : '';
};

function ArticleCard({ item, onOpen, slider }) {
  const thumb = getSafeImageUrl(item.img);
  const category = getCategoryMeta(item.category);

  if (item.isCampaign) {
    return (
      <article className={`pm-card pm-campaign ${slider ? 'pm-slider-card' : ''}`} style={{ '--accent': getCategoryMeta('security').accent, '--accent-soft': getCategoryMeta('security').soft }}>
        <img src={thumb} alt="보안 캠페인" onError={event => { event.currentTarget.src = fallbackArticleImage; }} />
        <span>보안 캠페인</span>
      </article>
    );
  }

  return (
    <article
      className={`pm-card ${slider ? 'pm-slider-card' : ''}`}
      style={{ '--accent': category.accent, '--accent-soft': category.soft }}
      onClick={() => onOpen(item)}
      role="button"
      tabIndex={0}
      onKeyDown={event => { if (event.key === 'Enter') onOpen(item); }}
    >
      <div className="pm-card-image">
        <img src={thumb} alt={item.title || category.label} onError={event => { event.currentTarget.src = fallbackArticleImage; }} />
      </div>
      <div className="pm-card-body">
        <div className="pm-card-meta">
          <span>{item.isImportant && <b>HOT</b>}{item.brand ? `[${item.brand}]` : 'R&D'}</span>
          <span>출처: {getArticleSource(item)}</span>
        </div>
        <h3>{item.title}</h3>
        <p>{item.desc}</p>
        {item.insight && (
          <div className="pm-insight">
            <strong>핸지의 시선</strong>
            <span>{item.insight}</span>
          </div>
        )}
      </div>
    </article>
  );
}

function EmptyState({ onSubscribe }) {
  return (
    <section className="pm-empty-state">
      <span>OASIS</span>
      <h1>아직 발행된 리포트가 없습니다</h1>
      <p>관리자에서 리포트를 배포하면 핸지가 고른 오늘의 브리핑이 이곳에 정리됩니다.</p>
      <button type="button" onClick={onSubscribe}>뉴스레터 미리 구독하기</button>
    </section>
  );
}

function SubscribeModal({ onClose }) {
  const [email, setEmail] = useState('');
  const [interests, setInterests] = useState(categories.map(category => category.label));
  const [submitting, setSubmitting] = useState(false);

  const toggle = (label) => {
    setInterests(prev => prev.includes(label) ? prev.filter(item => item !== label) : [...prev, label]);
  };

  const submit = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      alert('올바른 이메일 주소를 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      await setDoc(doc(db, 'subscribers', cleanEmail), {
        email: cleanEmail,
        interests,
        subscribeDate: new Date().toISOString(),
        status: 'active'
      }, { merge: true });
      alert('구독 신청이 완료되었습니다.');
      onClose();
    } catch (error) {
      alert(`구독 신청 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pm-modal" onClick={onClose}>
      <div className="pm-subscribe" onClick={event => event.stopPropagation()}>
        <div className="pm-subscribe-head">
          <h3>OASIS 뉴스레터 구독</h3>
          <button type="button" onClick={onClose} aria-label="닫기"><i className="fas fa-times" /></button>
        </div>
        <div className="pm-interest-grid">
          {categories.map(category => (
            <button key={category.key} type="button" className={interests.includes(category.label) ? 'active' : ''} onClick={() => toggle(category.label)}>
              <span>{category.icon}</span>
              {category.label}
            </button>
          ))}
        </div>
        <input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="이메일 주소를 입력해주세요" />
        <button type="button" className="pm-primary" onClick={submit} disabled={submitting}>{submitting ? '저장 중...' : '구독 완료하기'}</button>
      </div>
    </div>
  );
}

export default function PublicMagazine() {
  const [reports, setReports] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [activeCategory, setActiveCategory] = useState(new URLSearchParams(window.location.search).get('category') || '');
  const [loading, setLoading] = useState(true);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [gaMeasurementId, setGaMeasurementId] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [snapshot, analyticsSettings] = await Promise.all([
          getDocs(query(collection(db, 'magazines'))),
          getAnalyticsSettings().catch(() => ({})),
        ]);
        const measurementId = initGoogleAnalytics(analyticsSettings.measurementId);
        setGaMeasurementId(measurementId);
        const loaded = snapshot.docs
          .map(item => sanitizeMagazineUrls({ id: item.id, ...item.data() }))
          .sort((a, b) => b.id.localeCompare(a.id));
        setReports(loaded);
        setSelectedDate(currentDate => {
          if (!loaded[0]) return currentDate || formatLocalDate();
          const latestDate = getReportDate(loaded[0]) || formatLocalDate();
          return loaded.some(report => report.id === currentDate || report.id.startsWith(`${currentDate}_`))
            ? currentDate
            : latestDate;
        });
      } catch (error) {
        console.error('Magazine load failed:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const nextUrl = activeCategory ? `?category=${activeCategory}` : window.location.pathname;
    if (window.location.search !== (activeCategory ? `?category=${activeCategory}` : '')) {
      window.history.pushState(null, '', nextUrl);
    }
  }, [activeCategory]);

  const currentReport = reports.find(report => report.id === selectedDate || report.id.startsWith(`${selectedDate}_`)) || reports[0];
  const currentArticles = currentReport?.articles || [];
  const mainArticle = currentArticles.find(article => article.category === 'main');
  const issueName = currentReport?.issueName || currentReport?.id?.split('_')[1] || 'NO. --';
  const videoEmbed = getYoutubeEmbed(currentReport?.video?.url);
  const currentIssueDate = getReportDate(currentReport);
  const contentArticles = currentArticles.filter(article => article.category !== 'main');
  const activeCategoryMeta = getCategoryMeta(activeCategory);
  const coveredCategoryCount = categories.filter(category => currentArticles.some(article => article.category === category.key)).length;
  const topSource = currentArticles.find(article => article.source)?.source || 'OASIS';

  useEffect(() => {
    if (loading) return;
    trackMagazinePageView({
      title: activeCategory ? `${activeCategory} articles` : '핸지가 보는 세상',
      issueId: currentReport?.id || '',
      issueName,
      category: activeCategory || 'overview',
    }, gaMeasurementId);
  }, [activeCategory, currentReport?.id, gaMeasurementId, issueName, loading]);

  const openArticle = (articleOrUrl) => {
    const article = typeof articleOrUrl === 'string' ? { link: articleOrUrl } : articleOrUrl || {};
    const safeUrl = getSafeArticleUrl(article.link || article.url);
    if (!safeUrl || safeUrl === '#') {
      alert('해당 컨텐츠는 원문이 존재하지 않습니다.');
      return;
    }
    trackArticleClick(article, {
      issueId: article.issueDate || currentReport?.id || '',
      issueName,
      surface: activeCategory ? 'category_list' : article.category === 'main' ? 'main_article' : 'overview_card',
    }, gaMeasurementId);
    const opened = window.open(safeUrl, '_blank', 'noopener,noreferrer');
    if (opened) opened.opener = null;
  };

  const categoryItems = (categoryKey) => {
    if (activeCategory) {
      return reports.flatMap(report => {
        const issueDate = report.id;
        const articles = (report.articles || []).filter(article => article.category === categoryKey).map(article => ({ ...article, issueDate }));
        return articles;
      }).sort((a, b) => (b.issueDate || '').localeCompare(a.issueDate || ''));
    }
    const items = currentArticles.filter(article => article.category === categoryKey);
    return items;
  };

  const renderCategorySection = (category, compact = true) => {
    if (!category) return null;
    const items = categoryItems(category.key);
    if (!items.length) return null;

    if (activeCategory) {
      const grouped = items.reduce((acc, item) => {
        const date = item.issueDate?.split('_')[0] || '기타';
        acc[date] = acc[date] || [];
        acc[date].push(item);
        return acc;
      }, {});

      return (
        <section className="pm-section" key={category.key} style={{ '--accent': category.accent, '--accent-soft': category.soft }}>
          {Object.entries(grouped).map(([date, group]) => (
            <div key={date} className="pm-date-group">
              <h3><i className="far fa-calendar-check" /> {date} 발행 리포트</h3>
              <div className="pm-grid">{group.map((item, index) => <ArticleCard key={`${date}-${index}`} item={item} onOpen={openArticle} />)}</div>
            </div>
          ))}
        </section>
      );
    }

    return (
      <section className="pm-section" key={category.key} style={{ '--accent': category.accent, '--accent-soft': category.soft }}>
        <div className="pm-section-head">
          <div>
            <h2>{category.icon} {category.title}</h2>
            <p>{category.description}</p>
          </div>
          {compact && <button type="button" onClick={() => setActiveCategory(category.key)}>전체 보기 <i className="fas fa-arrow-right" /></button>}
        </div>
        <div className="pm-grid pm-scroll-grid">
          {items.slice(0, 3).map((item, index) => <ArticleCard key={index} item={item} onOpen={openArticle} slider />)}
          {compact && (
            <article className="pm-more-card" onClick={() => setActiveCategory(category.key)}>
              <i className="fas fa-arrow-right" />
              <strong>전체 리포트 보기</strong>
              <span>{category.title} 히스토리 더보기</span>
            </article>
          )}
        </div>
      </section>
    );
  };

  return (
    <div className="pm-page">
      <header className="pm-nav">
        <div className="pm-nav-inner">
          <button className="pm-brand" type="button" onClick={() => setActiveCategory('')}>
            <span>O</span>
            <strong>OASIS</strong>
          </button>
          <div className="pm-nav-actions">
            <input
              className="pm-date-input"
              type="date"
              value={currentIssueDate || selectedDate || formatLocalDate()}
              onClick={openNativeDatePicker}
              onChange={event => { setSelectedDate(event.target.value); setActiveCategory(''); }}
            />
            <span>{issueName}</span>
            <button type="button" onClick={() => setSubscribeOpen(true)}>구독하기 <i className="far fa-envelope" /></button>
          </div>
        </div>
        <nav className="pm-tabs">
          <button className={!activeCategory ? 'active' : ''} type="button" onClick={() => setActiveCategory('')}><i className="fas fa-home" /> OVERVIEW</button>
          {categories.map(category => (
            <button key={category.key} className={activeCategory === category.key ? 'active' : ''} type="button" style={{ '--accent': category.accent }} onClick={() => setActiveCategory(category.key)}>
              {category.title} <span>{category.label}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className="pm-main">
        {loading ? (
          <div className="pm-loading"><i className="fas fa-circle-notch fa-spin" /> 인사이트 리포트를 구성하고 있습니다...</div>
        ) : !reports.length ? (
          <EmptyState onSubscribe={() => setSubscribeOpen(true)} />
        ) : activeCategory ? (
          <>
            <div className="pm-list-head" style={{ '--accent': activeCategoryMeta.accent, '--accent-soft': activeCategoryMeta.soft }}>
              <button type="button" onClick={() => setActiveCategory('')}><i className="fas fa-arrow-left" /></button>
              <div>
                <h1>{activeCategoryMeta.icon} {activeCategoryMeta.title}</h1>
                <p>{activeCategoryMeta.description || '최신 등록일 기준 일자별 정렬'}</p>
              </div>
              <span>총 {categoryItems(activeCategory).length}건</span>
            </div>
            {renderCategorySection(activeCategoryMeta, false)}
          </>
        ) : (
          <>
            <section className="pm-issue-strip">
              <div>
                <span>{currentIssueDate || 'LATEST'} · {issueName}</span>
                <h1>핸지가 보는 세상</h1>
                <p>오토핸즈의 아침을 시작하는 스마트한 리포트.</p>
              </div>
              <dl>
                <div><dt>기사</dt><dd>{contentArticles.length}</dd></div>
                <div><dt>카테고리</dt><dd>{coveredCategoryCount}</dd></div>
                <div><dt>대표 출처</dt><dd>{topSource}</dd></div>
              </dl>
            </section>

            {videoEmbed && (
              <section className="pm-video">
                <div><iframe title="featured video" src={videoEmbed} allowFullScreen /></div>
                <aside>
                  <span><i className="fab fa-youtube" /> {currentReport?.video?.source || 'YouTube'}</span>
                  <h2>{currentReport?.video?.title}</h2>
                  <p>{currentReport?.video?.desc}</p>
                </aside>
              </section>
            )}

            {mainArticle && (
              <section className="pm-main-article" onClick={() => openArticle(mainArticle)} role="button" tabIndex={0} onKeyDown={event => { if (event.key === 'Enter') openArticle(mainArticle); }}>
                <div className="pm-main-img">
                  <img src={getSafeImageUrl(mainArticle.img, fallbackMainImage)} alt={mainArticle.title || '대표 기사'} onError={event => { event.currentTarget.src = fallbackMainImage; }} />
                </div>
                <div className="pm-main-copy">
                  <span>핸지 돋보기</span>
                  <h1>{mainArticle.title}</h1>
                  <div className="pm-card-meta"><b>{mainArticle.brand}</b><small>출처: {getArticleSource(mainArticle)}</small></div>
                  <p>{mainArticle.desc}</p>
                  {mainArticle.insight && <div className="pm-insight"><strong>오토핸즈의 시선</strong><span>{mainArticle.insight}</span></div>}
                </div>
              </section>
            )}

            {categories.map(category => renderCategorySection(category))}

            <section className="pm-subscribe-band">
              <img src="/bear.png" alt="" />
              <div>
                <h2>뉴스... 어떤 것부터 봐야 할지 막막한가요?</h2>
                <p>쏟아지는 뉴스 속, 핸지가 고객님에게 필요한 비즈니스 이슈만 골라 드려요.</p>
              </div>
              <button type="button" onClick={() => setSubscribeOpen(true)}>이메일로 뉴스 받기</button>
            </section>
          </>
        )}
      </main>

      <footer className="pm-footer">
        <strong>OASIS · 핸지가 보는 세상</strong>
        <p>오토핸즈의 아침을 시작하는 스마트한 리포트.</p>
      </footer>

      {subscribeOpen && <SubscribeModal onClose={() => setSubscribeOpen(false)} />}
    </div>
  );
}
