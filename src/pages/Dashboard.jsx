import React, { useEffect, useMemo, useState } from 'react';
import { getAllMagazines, getAllSubscribers } from '../services/dataService';

const CATEGORY_META = {
  main: { label: '1면', title: '핸지 돋보기', color: '#ef4444' },
  macro: { label: '경제', title: '경제·비즈니스', color: '#3b82f6' },
  platform: { label: '산업', title: '산업·플랫폼', color: '#f59e0b' },
  auto: { label: '자동차', title: '자동차·모빌리티', color: '#10b981' },
  ai: { label: 'AI', title: 'AI·테크', color: '#8b5cf6' },
  security: { label: '보안', title: '보안·리스크', color: '#06b6d4' },
};

const LIST_CATEGORIES = ['macro', 'platform', 'auto', 'ai', 'security'];

const INTEREST_ALIASES = {
  macro: ['macro', 'economy', '경제'],
  platform: ['platform', 'biz', 'business', '비즈'],
  auto: ['auto', 'mobility', 'industry', '산업'],
  ai: ['ai', '인공지능'],
  security: ['security', 'secure', '보안'],
};

const emptyStats = {
  reports: 0,
  subscribers: 0,
  totalArticles: 0,
  missingImages: 0,
  missingLinks: 0,
  missingInsights: 0,
};

const countDrafts = (draftArticles = {}) => ({
  main: draftArticles.main ? 1 : 0,
  macro: (draftArticles.macro || []).length,
  platform: (draftArticles.platform || []).length,
  auto: (draftArticles.auto || []).length,
  ai: (draftArticles.ai || []).length,
  security: (draftArticles.security || []).length,
});

const sumValues = (values) => Object.values(values).reduce((sum, value) => sum + value, 0);

const getDraftArticleList = (draftArticles = {}) => ([
  draftArticles.main ? { ...draftArticles.main, category: draftArticles.main.category || 'main' } : null,
  ...LIST_CATEGORIES.flatMap(key => (draftArticles[key] || []).map(article => ({ ...article, category: article.category || key }))),
]).filter(article => article?.title);

const getUniqueArticles = (articles = []) => {
  const seen = new Set();
  return articles.filter(article => {
    const key = [article?.link, article?.title].filter(Boolean).join('|');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getExcerpt = (value = '', maxLength = 80) => {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trim()}...`;
};

const getReportDate = (report) => {
  if (!report) return '';
  return report.publishDateId
    || String(report.id || '').match(/^\d{4}-\d{2}-\d{2}/)?.[0]
    || '';
};

const getDaysSince = (dateId) => {
  if (!dateId) return null;
  const published = new Date(`${dateId}T00:00:00`);
  if (Number.isNaN(published.getTime())) return null;
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.floor((todayStart - published) / 86400000));
};

const normalizeInterestKeys = (interests = []) => {
  if (!Array.isArray(interests) || interests.length === 0) return LIST_CATEGORIES;
  const raw = interests.map(item => String(item || '').trim().toLowerCase()).filter(Boolean);
  const keys = LIST_CATEGORIES.filter(key => raw.some(value => (
    value === key || INTEREST_ALIASES[key].some(alias => value.includes(alias.toLowerCase()))
  )));
  return keys.length ? keys : LIST_CATEGORIES;
};

export default function Dashboard({ draftArticles }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [lastLoadedAt, setLastLoadedAt] = useState('');
  const [stats, setStats] = useState(emptyStats);
  const [latestReport, setLatestReport] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [interestData, setInterestData] = useState([]);
  const [brandRank, setBrandRank] = useState([]);
  const [recentReports, setRecentReports] = useState([]);

  const draftCounts = useMemo(() => countDrafts(draftArticles), [draftArticles]);
  const draftArticleList = useMemo(() => getDraftArticleList(draftArticles), [draftArticles]);
  const draftsTotal = sumValues(draftCounts);
  const draftReadyCategories = LIST_CATEGORIES.filter(key => draftCounts[key] > 0);
  const draftMissingCategories = LIST_CATEGORIES.filter(key => draftCounts[key] === 0);

  const mailConfigured = typeof window !== 'undefined' && !!window.localStorage?.getItem('OASIS_APPS_SCRIPT_URL');
  const apiConfigured = typeof window !== 'undefined' && !!window.localStorage?.getItem('GEMINI_API_KEY');
  const latestDate = getReportDate(latestReport);
  const daysSinceLatest = getDaysSince(latestDate);
  const hookSourceArticles = draftArticleList.length ? draftArticleList : (latestReport?.articles || []);
  const hookTopStories = getUniqueArticles([...hookSourceArticles])
    .sort((a, b) => Number(!!b.isImportant) - Number(!!a.isImportant))
    .slice(0, 3);
  const customerHooks = [
    {
      title: '오늘의 3줄 브리핑',
      desc: hookTopStories.length
        ? hookTopStories.map((article, index) => `${index + 1}. ${article.title}`).join(' / ')
        : '대표 기사 3개를 먼저 구성하면 메일 상단에서 바로 읽히는 요약으로 노출됩니다.',
      color: '#2563eb',
    },
    {
      title: '비즈니스 온도',
      desc: draftReadyCategories.length
        ? `${draftReadyCategories.map(key => CATEGORY_META[key].label).join(', ')} 이슈가 준비됐습니다. 고객에게 오늘 시장 분위기를 한눈에 보여줄 수 있습니다.`
        : '카테고리별 기사 흐름을 관심·주의·리스크 톤으로 보여주면 구독자가 빠르게 훑어볼 수 있습니다.',
      color: '#ea580c',
    },
    {
      title: '핸지의 한 줄 시선',
      desc: hookTopStories[0]?.insight
        ? getExcerpt(hookTopStories[0].insight, 96)
        : '단순 기사 링크보다 “그래서 우리 고객에게 왜 중요한가”를 한 줄로 붙이면 클릭 이유가 생깁니다.',
      color: '#0f766e',
    },
  ];

  const loadStats = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [magazines, subscribers] = await Promise.all([
        getAllMagazines(),
        getAllSubscribers(),
      ]);

      const allArticles = magazines.flatMap(report => (
        (report.articles || []).map(article => ({
          ...article,
          reportId: report.id,
          issueName: report.issueName || report.id,
          reportDate: getReportDate(report),
        }))
      ));

      const categoryMap = {};
      const brandMap = {};
      allArticles.forEach(article => {
        const category = article.category || 'auto';
        const brand = article.brand || '미분류';
        categoryMap[category] = (categoryMap[category] || 0) + 1;
        brandMap[brand] = (brandMap[brand] || 0) + 1;
      });

      const interestMap = {};
      subscribers.forEach(subscriber => {
        normalizeInterestKeys(subscriber.interests).forEach(key => {
          interestMap[key] = (interestMap[key] || 0) + 1;
        });
      });

      const articleTotal = allArticles.length || 1;
      const subscriberTotal = subscribers.length || 1;

      setStats({
        reports: magazines.length,
        subscribers: subscribers.length,
        totalArticles: allArticles.length,
        missingImages: allArticles.filter(article => !article.img).length,
        missingLinks: allArticles.filter(article => !article.link).length,
        missingInsights: allArticles.filter(article => !article.insight).length,
      });
      setLatestReport(magazines[0] || null);
      setCategoryData(Object.keys(CATEGORY_META).map(key => ({
        key,
        ...CATEGORY_META[key],
        count: categoryMap[key] || 0,
        pct: Math.round(((categoryMap[key] || 0) / articleTotal) * 100),
      })));
      setInterestData(LIST_CATEGORIES.map(key => ({
        key,
        ...CATEGORY_META[key],
        count: interestMap[key] || 0,
        pct: Math.round(((interestMap[key] || 0) / subscriberTotal) * 100),
      })));
      setBrandRank(Object.entries(brandMap).sort((a, b) => b[1] - a[1]).slice(0, 7));
      setRecentReports(magazines.slice(0, 6));
      setLastLoadedAt(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }));
    } catch (error) {
      console.error('Dashboard load failed', error);
      setLoadError(error.message || '대시보드 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const actionItems = [
    draftsTotal === 0 && { tone: 'danger', title: '대기열이 비어 있습니다', desc: '뉴스 수집 탭에서 발행 후보 기사를 먼저 구성하세요.' },
    draftsTotal > 0 && !draftCounts.main && { tone: 'warning', title: '1면 기사가 없습니다', desc: '메일과 웹 매거진의 첫 인상을 정할 대표 기사를 지정하세요.' },
    draftMissingCategories.length > 0 && draftsTotal > 0 && { tone: 'warning', title: '비어 있는 카테고리가 있습니다', desc: draftMissingCategories.map(key => CATEGORY_META[key].label).join(', ') },
    !mailConfigured && { tone: 'danger', title: '메일 발송 URL 미설정', desc: 'API 관리 탭에서 Apps Script 웹앱 URL을 등록해야 발송할 수 있습니다.' },
    !apiConfigured && { tone: 'info', title: 'Gemini API 키 미설정', desc: '서버 분석 실패 시 분석 품질이 제한될 수 있습니다.' },
    stats.missingImages > 0 && { tone: 'info', title: '이미지 없는 기사 존재', desc: `누적 기사 중 ${stats.missingImages}건은 썸네일이 없습니다.` },
  ].filter(Boolean);

  if (actionItems.length === 0) {
    actionItems.push({ tone: 'success', title: '발행 준비 상태가 좋습니다', desc: '대기열, 메일 설정, 주요 데이터가 모두 정상 범위입니다.' });
  }

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h2>운영 대시보드</h2>
          <p>오늘 발행 준비, 구독자 관심사, 콘텐츠 품질 상태를 한 번에 확인합니다.</p>
        </div>
        <button className="btn btn-dark" onClick={loadStats} disabled={loading} style={{ fontSize: 12, padding: '10px 18px' }}>
          <i className={`fas ${loading ? 'fa-circle-notch fa-spin' : 'fa-sync-alt'}`} /> 새로고침
        </button>
      </div>

      {loadError && (
        <div style={{ background:'#fef2f2', color:'#b91c1c', border:'1px solid #fecaca', borderRadius:8, padding:14, marginBottom:20, fontSize:13, fontWeight:800 }}>
          {loadError}
        </div>
      )}

      <section style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:16, marginBottom:20 }}>
        <StatusCard
          label="최신 발행"
          value={latestReport?.issueName || latestReport?.id || '없음'}
          meta={latestDate ? `${latestDate}${daysSinceLatest !== null ? ` · ${daysSinceLatest}일 전` : ''}` : '발행 이력 없음'}
          accent="#2563eb"
        />
        <StatusCard
          label="발행 대기 기사"
          value={`${draftsTotal}건`}
          meta={draftCounts.main ? '1면 지정 완료' : '1면 미지정'}
          accent={draftsTotal > 0 ? '#059669' : '#dc2626'}
        />
        <StatusCard
          label="구독자"
          value={`${stats.subscribers}명`}
          meta="관심사 기반 선택 발송 대상"
          accent="#7c3aed"
        />
        <StatusCard
          label="발송 준비"
          value={mailConfigured ? '가능' : '확인 필요'}
          meta={`${mailConfigured ? '메일 URL 연결됨' : '메일 URL 없음'} · ${apiConfigured ? 'AI 키 있음' : 'AI 키 없음'}`}
          accent={mailConfigured ? '#0f766e' : '#ea580c'}
        />
      </section>

      <section style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:20, marginBottom:20 }}>
        <Panel title="오늘의 운영 체크" icon="fas fa-clipboard-check" subText={lastLoadedAt ? `${lastLoadedAt} 기준` : ''}>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {actionItems.map((item, index) => (
              <ActionItem key={`${item.title}-${index}`} {...item} />
            ))}
          </div>
        </Panel>

        <Panel title="대기열 구성" icon="fas fa-layer-group" subText={`${draftReadyCategories.length}/5개 카테고리 채움`}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(6, minmax(0, 1fr))', gap:8 }}>
            {Object.keys(CATEGORY_META).map(key => (
              <MiniCategory key={key} meta={CATEGORY_META[key]} count={draftCounts[key] || 0} />
            ))}
          </div>
          <div style={{ marginTop:16, fontSize:12, color:'#64748b', lineHeight:1.6 }}>
            메일 발송은 구독자 관심 카테고리별로 필터링됩니다. 관심 항목이 없는 구독자는 전체 카테고리를 받습니다.
          </div>
        </Panel>
      </section>

      <section style={{ marginBottom:20 }}>
        <Panel title="고객 호기심 포인트" icon="fas fa-lightbulb" subText="웹/메일에서 구독을 당길 요소">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:12 }}>
            {customerHooks.map(item => (
              <HookCard key={item.title} {...item} />
            ))}
          </div>
        </Panel>
      </section>

      <section style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:20, marginBottom:20 }}>
        <Panel title="누적 기사 카테고리" icon="fas fa-chart-bar" subText={`${stats.totalArticles}건`}>
          <MetricBars items={categoryData} emptyText="아직 발행된 기사가 없습니다." />
        </Panel>

        <Panel title="구독자 관심 분포" icon="fas fa-users" subText={`${stats.subscribers}명`}>
          <MetricBars items={interestData} emptyText="아직 구독자가 없습니다." />
        </Panel>
      </section>

      <section style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(320px, 1fr))', gap:20 }}>
        <Panel title="최근 발행 리포트" icon="fas fa-history" subText="최신순 6개">
          <div style={{ overflowX:'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>발행일</th>
                  <th>호수</th>
                  <th>기사</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {recentReports.length === 0 ? (
                  <tr><td colSpan="4" style={{ textAlign:'center', color:'#94a3b8', padding:28 }}>발행 이력이 없습니다.</td></tr>
                ) : recentReports.map((report, index) => (
                  <tr key={report.id}>
                    <td style={{ fontWeight:800 }}>{getReportDate(report) || report.id}</td>
                    <td>{report.issueName || report.id}</td>
                    <td>{report.articles?.length || 0}건</td>
                    <td>
                      <span className={index === 0 ? 'badge badge-blue' : 'badge'} style={index === 0 ? undefined : { background:'#f1f5f9', color:'#64748b' }}>
                        {index === 0 ? 'LATEST' : 'ARCHIVE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="상위 언급 기업" icon="fas fa-building" subText="누적 기사 기준">
          {brandRank.length === 0 ? (
            <EmptyState text="집계할 기업 데이터가 없습니다." />
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {brandRank.map(([brand, count], index) => (
                <BrandRow key={brand} rank={index + 1} brand={brand} count={count} max={brandRank[0][1]} />
              ))}
            </div>
          )}
        </Panel>
      </section>
    </div>
  );
}

function StatusCard({ label, value, meta, accent }) {
  return (
    <div className="card" style={{ border:'1px solid #e2e8f0', boxShadow:'0 8px 24px rgba(15,23,42,0.05)', padding:20 }}>
      <div style={{ fontSize:12, fontWeight:900, color:accent, marginBottom:8 }}>{label}</div>
      <div style={{ fontSize:24, fontWeight:900, color:'#0f172a', lineHeight:1.25, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }} title={value}>
        {value}
      </div>
      <div style={{ fontSize:12, color:'#64748b', marginTop:8, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }} title={meta}>
        {meta}
      </div>
    </div>
  );
}

function Panel({ title, icon, subText, children }) {
  return (
    <div className="card" style={{ border:'1px solid #e2e8f0', boxShadow:'0 8px 24px rgba(15,23,42,0.05)' }}>
      <div className="card-title" style={{ marginBottom:16 }}>
        <div><i className={icon} style={{ color:'#3b82f6' }} /> {title}</div>
        {subText && <span style={{ fontSize:11, color:'#94a3b8', fontWeight:900 }}>{subText}</span>}
      </div>
      {children}
    </div>
  );
}

function ActionItem({ tone, title, desc }) {
  const palette = {
    success: ['#ecfdf5', '#047857', 'fa-circle-check'],
    danger: ['#fef2f2', '#b91c1c', 'fa-circle-exclamation'],
    warning: ['#fffbeb', '#b45309', 'fa-triangle-exclamation'],
    info: ['#eff6ff', '#1d4ed8', 'fa-circle-info'],
  }[tone] || ['#f8fafc', '#475569', 'fa-circle-info'];

  return (
    <div style={{ display:'flex', gap:12, padding:12, borderRadius:8, background:palette[0], color:palette[1] }}>
      <i className={`fas ${palette[2]}`} style={{ marginTop:2 }} />
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:900 }}>{title}</div>
        <div style={{ fontSize:12, lineHeight:1.5, opacity:0.86 }}>{desc}</div>
      </div>
    </div>
  );
}

function MiniCategory({ meta, count }) {
  return (
    <div style={{ border:'1px solid #e2e8f0', borderRadius:8, padding:'12px 8px', textAlign:'center', background: count > 0 ? '#ffffff' : '#f8fafc' }}>
      <div style={{ width:10, height:10, borderRadius:'50%', background: count > 0 ? meta.color : '#cbd5e1', margin:'0 auto 8px' }} />
      <div style={{ fontSize:11, color:'#64748b', fontWeight:900, marginBottom:4 }}>{meta.label}</div>
      <div style={{ fontSize:20, color:'#0f172a', fontWeight:900 }}>{count}</div>
    </div>
  );
}

function HookCard({ title, desc, color }) {
  return (
    <div style={{ border:'1px solid #e2e8f0', borderRadius:8, background:'#ffffff', padding:16, minHeight:142, display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ width:10, height:10, borderRadius:'50%', background:color, flex:'0 0 auto' }} />
        <strong style={{ color:'#0f172a', fontSize:14, fontWeight:900 }}>{title}</strong>
      </div>
      <p style={{ margin:0, color:'#475569', fontSize:13, lineHeight:1.6, fontWeight:800, wordBreak:'keep-all' }}>{desc}</p>
    </div>
  );
}

function MetricBars({ items, emptyText }) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  if (!total) return <EmptyState text={emptyText} />;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {items.map(item => (
        <div key={item.key}>
          <div style={{ display:'flex', justifyContent:'space-between', gap:12, marginBottom:5 }}>
            <span style={{ fontSize:12, fontWeight:900, color:'#334155' }}>{item.title}</span>
            <span style={{ fontSize:12, fontWeight:900, color:item.color }}>{item.count}건 · {item.pct}%</span>
          </div>
          <div style={{ height:10, background:'#f1f5f9', borderRadius:8, overflow:'hidden' }}>
            <div style={{ width:`${Math.max(item.pct, item.count ? 3 : 0)}%`, height:'100%', background:item.color, borderRadius:8 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function BrandRow({ rank, brand, count, max }) {
  const width = Math.max(8, Math.round((count / max) * 100));

  return (
    <div style={{ display:'grid', gridTemplateColumns:'28px minmax(80px, 120px) 1fr 36px', gap:10, alignItems:'center' }}>
      <span style={{ fontSize:12, fontWeight:900, color: rank <= 3 ? '#2563eb' : '#94a3b8', textAlign:'center' }}>{rank}</span>
      <span style={{ fontSize:13, fontWeight:900, color:'#334155', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={brand}>{brand}</span>
      <div style={{ height:22, background:'#f1f5f9', borderRadius:8, overflow:'hidden' }}>
        <div style={{ width:`${width}%`, height:'100%', background:'#3b82f6', borderRadius:8 }} />
      </div>
      <span style={{ fontSize:12, fontWeight:900, color:'#475569', textAlign:'right' }}>{count}</span>
    </div>
  );
}

function EmptyState({ text }) {
  return <div style={{ textAlign:'center', padding:28, color:'#94a3b8', fontSize:13, fontWeight:800 }}>{text}</div>;
}
