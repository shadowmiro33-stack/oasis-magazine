import React, { useState } from 'react';
import { getAllMagazines, getPolicies, savePolicies } from '../services/dataService';
import MagazineWebPreview from '../components/MagazineWebPreview';
import { analyzeTextLocally, getChromeSummarizerStatus, htmlToArticle } from '../utils/localAnalyzer';

const DEFAULT_THUMB = 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=300';

export default function NewsCrawler({ draftArticles, setDraftArticles, companies, issueName, selCampaign, selSecurity, video, setVideo, campaigns, secBanners }) {
  const [showWebPreview, setShowWebPreview] = useState(false);
  const [policies, setPoliciesState] = useState([]);
  const [publishedArticles, setPublishedArticles] = useState([]);
  const [policyForm, setPolicyForm] = useState({ company:'', url:'', keyword:'' });
  const [aiInput, setAiInput] = useState({ url:'', title:'', brand:'', source:'', desc:'', insight:'', img:'', category:'auto', isImportant:false });
  const [aiLoading, setAiLoading] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState('');
  const [analysisResult, setAnalysisResult] = useState('');
  const [analysisMode, setAnalysisMode] = useState('auto');
  const [chromeStatus, setChromeStatus] = useState('checking');
  const [manualText, setManualText] = useState('');
  const [jsonInput, setJsonInput] = useState('');
  const [toast, setToast] = useState(null);

  const [fetchingYt, setFetchingYt] = useState(false);

  React.useEffect(() => {
    loadPolicies();
    loadPublishedArticles();
    refreshChromeStatus();
  }, []);

  const loadPolicies = async () => { setPoliciesState(await getPolicies()); };
  const loadPublishedArticles = async () => {
    try {
      const magazines = await getAllMagazines();
      const articles = magazines.flatMap(mag => (mag.articles || []).map(article => ({
        ...article,
        issueName: mag.issueName || mag.issue || mag.id
      })));
      setPublishedArticles(articles);
    } catch (_) {
      setPublishedArticles([]);
    }
  };

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setToast(null), 3200);
  };

  const refreshChromeStatus = async () => {
    setChromeStatus('checking');
    const status = await getChromeSummarizerStatus();
    setChromeStatus(status);
  };

  const savePolicy = async () => {
    if (!policyForm.url || !policyForm.keyword) return showToast('필수 입력값을 확인해주세요.', 'error');
    const updated = [...policies, { id: Date.now(), company: policyForm.company || companies?.[0]?.name || '', url: policyForm.url, keyword: policyForm.keyword }];
    await savePolicies(updated);
    setPolicyForm({ company:'', url:'', keyword:'' });
    loadPolicies();
    showToast('추적 정책을 추가했습니다.', 'success');
  };

  const deletePolicy = async (id) => {
    await savePolicies(policies.filter(p => p.id !== id));
    loadPolicies();
  };

  const runAI = async () => {
    if (!aiInput.url) return showToast('분석할 기사 URL을 입력하세요.', 'error');
    setAiLoading(true);
    setAnalysisResult('');
    setAnalysisStatus('브라우저에서 기사 본문을 읽고 Chrome 내장 AI를 확인 중입니다.');
    try {
      const response = await fetch(aiInput.url, { mode: 'cors' });
      if (!response.ok) throw new Error(`기사 페이지 접근 실패 (${response.status})`);
      const html = await response.text();
      const article = htmlToArticle(html, aiInput.url);
      if (!article.text || article.text.length < 80) throw new Error('본문을 충분히 읽지 못했습니다.');
      setAnalysisStatus(analysisMode === 'chrome' ? 'Chrome 내장 AI만 사용해 분석합니다.' : analysisMode === 'fallback' ? '자동정리 방식으로 분석합니다.' : 'Chrome 내장 AI를 우선 사용하고, 불가하면 자동정리로 전환합니다.');
      const data = await analyzeTextLocally({ ...article, mode: analysisMode });
      setAiInput(prev => ({ ...prev, title: data.title||'', brand: data.brand||'', source: data.source||'', desc: data.desc||'', insight: data.insight||'', img: data.img||'' }));
      const label = data.analyzer || '자동정리 fallback';
      setAnalysisResult(label);
      setAnalysisStatus(`${label}로 분석 완료`);
      showToast(`${label}로 기사 분석을 완료했습니다.`, 'success');
    } catch (e) {
      setAnalysisStatus(e.message.includes('Chrome Summarizer') ? 'Chrome Summarizer API를 사용할 수 없습니다. 자동정리 모드로 바꾸거나 본문을 붙여넣어 주세요.' : '브라우저에서 URL 본문을 읽지 못했습니다. 본문을 복사해 수동 분석을 사용해주세요.');
      showToast(e.message.includes('Chrome Summarizer') ? 'Chrome 내장 AI를 사용할 수 없습니다.' : 'URL 직접 분석 실패: 본문 복사 후 수동 분석을 사용해주세요.', 'error');
    }
    finally { setAiLoading(false); }
  };

  const runManualAI = async () => {
    if (!manualText.trim()) return showToast('분석할 기사 내용을 붙여넣어 주세요.', 'error');
    setAiLoading(true);
    setAnalysisResult('');
    setAnalysisStatus(analysisMode === 'chrome' ? 'Chrome 내장 AI만 사용해 분석합니다.' : analysisMode === 'fallback' ? '자동정리 방식으로 분석합니다.' : 'Chrome 내장 AI를 우선 사용하고, 불가하면 자동정리로 전환합니다.');
    try {
      const data = await analyzeTextLocally({ text: manualText, mode: analysisMode });
      setAiInput(prev => ({ ...prev, title: data.title||'', brand: data.brand||'', source: data.source||'', desc: data.desc||'', insight: data.insight||'', img: data.img||'' }));
      setManualText('');
      const label = data.analyzer || '자동정리 fallback';
      setAnalysisResult(label);
      setAnalysisStatus(`${label}로 분석 완료`);
      showToast(`${label}로 기사 분석을 완료했습니다.`, 'success');
    } catch (e) {
      setAnalysisStatus('Chrome Summarizer API를 사용할 수 없습니다. 자동정리 모드로 바꿔 다시 실행해 주세요.');
      showToast('분석 실패: ' + e.message, 'error');
    }
    finally { setAiLoading(false); }
  };

  const normalizeUrl = (url = '') => {
    const trimmed = String(url || '').trim().replace(/&amp;/g, '&');
    if (trimmed.startsWith('//')) return `https:${trimmed}`;
    return trimmed;
  };

  const normalizeCategory = (value = '') => {
    const raw = String(value || '').toLowerCase();
    if (raw.includes('macro') || raw.includes('경제')) return 'macro';
    if (raw.includes('platform') || raw.includes('biz') || raw.includes('비즈')) return 'platform';
    if (raw.includes('ai') || raw.includes('인공지능')) return 'ai';
    if (raw.includes('security') || raw.includes('secure') || raw.includes('info') || raw.includes('보안')) return 'security';
    if (raw.includes('main') || raw.includes('first') || raw.includes('메인')) return 'main';
    return 'auto';
  };

  const normalizeImportedArticle = (item) => ({
    category: normalizeCategory(item.category),
    brand: item.brand || item.company || item.tags?.[0] || '산업일반',
    source: item.source || '',
    title: item.title || '',
    link: normalizeUrl(item.link || item.url || item.originallink || ''),
    img: normalizeUrl(item.img || item.thumbnail_url || item.thumbnailUrl || item.image || item.image_url || ''),
    desc: item.desc || item.summary || item.description || '',
    insight: item.insight || '',
    isImportant: !!item.isImportant
  });

  const importJsonArticles = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      const items = Array.isArray(parsed) ? parsed : (parsed.articles || parsed.items || []);
      if (!Array.isArray(items) || items.length === 0) throw new Error('기사 배열을 찾지 못했습니다.');
      const valid = items.map(normalizeImportedArticle).filter(item => item.title && item.link);
      if (valid.length === 0) throw new Error('title/link가 있는 기사가 없습니다.');
      const unique = [];
      let duplicateCount = 0;
      const importedLinks = new Set();
      valid.forEach(item => {
        const linkKey = normalizeDuplicateKey(item.link);
        if (linkKey && importedLinks.has(linkKey)) {
          duplicateCount += 1;
          return;
        }
        if (linkKey) importedLinks.add(linkKey);
        unique.push(item);
      });
      if (unique.length === 0) throw new Error('새로 가져올 기사가 없습니다. 모두 중복입니다.');
      setDraftArticles(prev => {
        const next = {
          main: prev.main,
          macro: [...(prev.macro || [])],
          platform: [...(prev.platform || [])],
          auto: [...(prev.auto || [])],
          ai: [...(prev.ai || [])],
          security: [...(prev.security || [])]
        };
        unique.forEach(item => {
          const cat = ['main', 'macro', 'platform', 'auto', 'ai', 'security'].includes(item.category) ? item.category : 'auto';
          if (cat === 'main' && !next.main) next.main = { ...item, category: 'main' };
          else next[cat === 'main' ? 'auto' : cat].push({ ...item, category: cat === 'main' ? 'auto' : cat });
        });
        return next;
      });
      setJsonInput('');
      showToast(`${unique.length}건을 발행 대기열에 가져왔습니다.${duplicateCount ? ` 중복 ${duplicateCount}건은 제외했습니다.` : ''}`, 'success');
    } catch (e) {
      showToast('JSON 가져오기 실패: ' + e.message, 'error');
    }
  };

  const fetchYoutubeMeta = async () => {
    if(!video.url) return showToast("유튜브 링크 URL을 먼저 입력해주세요.", 'error');
    try {
      setFetchingYt(true);
      const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(video.url)}`);
      const data = await res.json();
      if(data.error) {
        showToast("정보를 불러오지 못했습니다. 유튜브 링크를 확인해주세요.", 'error');
      } else {
        setVideo({ ...video, title: data.title || '', source: data.author_name || '', desc: data.title || '' });
        showToast("유튜브 영상 정보를 불러왔습니다.", 'success');
      }
    } catch(e) { showToast("네트워크 오류가 발생했습니다.", 'error'); } 
    finally { setFetchingYt(false); }
  };

  const addToDraft = () => {
    if (!aiInput.title) return showToast('추가할 기사 내용이 없습니다.', 'error');
    if (aiInput.isImportant) {
      const all = [...(draftArticles.main ? [draftArticles.main] : []), ...draftArticles.macro, ...draftArticles.platform, ...draftArticles.auto, ...draftArticles.ai, ...draftArticles.security];
      if (all.filter(a => a.isImportant).length >= 3) { showToast('중요 기사는 최대 3개까지만 가능합니다.', 'error'); return; }
    }
    const article = { ...aiInput, link: aiInput.url };
    if (isDuplicateArticle(article)) {
      showToast('이미 발행 대기열에 있는 기사입니다.', 'error');
      return;
    }
    const cat = aiInput.category;
    if (cat === 'main') setDraftArticles(prev => ({ ...prev, main: article }));
    else setDraftArticles(prev => ({ ...prev, [cat]: [...(prev[cat]||[]), article] }));
    setAiInput({ url:'', title:'', brand:'', source:'', desc:'', insight:'', img:'', category:'auto', isImportant:false });
    setAnalysisResult('');
    setAnalysisStatus('');
    showToast('발행 대기열에 기사를 추가했습니다.', 'success');
  };

  const allDrafts = [...(draftArticles.main ? [draftArticles.main] : []), ...draftArticles.macro, ...draftArticles.platform, ...draftArticles.auto, ...draftArticles.ai, ...draftArticles.security];
  const allKnownArticles = [...allDrafts, ...publishedArticles];

  const normalizeDuplicateKey = (value = '') => value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?/, '')
    .replace(/[?#].*$/, '')
    .replace(/\/$/, '');

  const isDuplicateArticle = (article, list = allKnownArticles) => {
    const linkKey = normalizeDuplicateKey(article.link);
    const titleKey = normalizeDuplicateKey(article.title);
    return list.some(item => {
      const itemLink = normalizeDuplicateKey(item.link);
      const itemTitle = normalizeDuplicateKey(item.title);
      if (linkKey && itemLink) return linkKey === itemLink;
      return !linkKey && !itemLink && titleKey && itemTitle && titleKey === itemTitle;
    });
  };

  const deleteArticle = (index) => {
    const target = allDrafts[index];
    if (draftArticles.main === target) setDraftArticles(prev => ({ ...prev, main: null }));
    else {
      ['macro','platform','auto','ai','security'].forEach(c => {
        if (draftArticles[c]?.includes(target)) setDraftArticles(prev => ({ ...prev, [c]: prev[c].filter(a => a !== target) }));
      });
    }
  };

  const setMainArticle = (index) => {
    const target = allDrafts[index];
    ['macro','platform','auto','ai','security'].forEach(c => {
      if (draftArticles[c]?.includes(target)) setDraftArticles(prev => ({ ...prev, [c]: prev[c].filter(a => a !== target) }));
    });
    setDraftArticles(prev => ({ ...prev, main: { ...target, category: 'main' } }));
  };

  const updateDraftArticle = (index, patch) => {
    const target = allDrafts[index];
    if (!target) return;
    if (draftArticles.main === target) {
      setDraftArticles(prev => ({ ...prev, main: { ...prev.main, ...patch } }));
      return;
    }
    ['macro','platform','auto','ai','security'].forEach(c => {
      if (draftArticles[c]?.includes(target)) {
        setDraftArticles(prev => ({
          ...prev,
          [c]: prev[c].map(article => article === target ? { ...article, ...patch } : article)
        }));
      }
    });
  };

  const showPreview = aiInput.title || aiInput.brand || aiInput.desc;

  const catLabel = { main:'🔥 1면', macro:'🌐 경제', platform:'🛒 비즈', auto:'🚗 산업', ai:'🤖 AI', security:'🛡️ 보안' };
  const catColor = { main:'#ef4444', macro:'#6366f1', platform:'#f59e0b', auto:'#3b82f6', ai:'#8b5cf6', security:'#10b981' };

  return (
    <div className="animate-fade">
      {toast && (
        <div style={{
          position:'fixed', top:20, right:20, zIndex:20000,
          background: toast.type === 'error' ? '#fef2f2' : toast.type === 'success' ? '#ecfdf5' : '#eff6ff',
          color: toast.type === 'error' ? '#b91c1c' : toast.type === 'success' ? '#047857' : '#1d4ed8',
          border: `1px solid ${toast.type === 'error' ? '#fecaca' : toast.type === 'success' ? '#a7f3d0' : '#bfdbfe'}`,
          borderRadius:12, padding:'12px 16px', boxShadow:'0 16px 40px rgba(15,23,42,0.18)',
          fontSize:13, fontWeight:900, maxWidth:360
        }}>
          <i className={`fas ${toast.type === 'error' ? 'fa-circle-exclamation' : toast.type === 'success' ? 'fa-circle-check' : 'fa-circle-info'}`} style={{ marginRight:8 }}></i>
          {toast.message}
        </div>
      )}
      <div className="page-header"><div><h2>🤖 뉴스 수집 및 AI 분석기</h2></div></div>

      {/* YouTube */}
      <div className="card" style={{ border:'2px solid #f59e0b', background:'#fffbeb', marginBottom:25 }}>
        <div className="card-title" style={{ color:'#b45309', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div><i className="fab fa-youtube"></i> 매거진 메인 유튜브 자동 세팅</div>
        </div>
        <div style={{ display:'flex', gap:10, marginBottom:10 }}>
          <input value={video.url} onChange={e => setVideo({...video, url:e.target.value})} placeholder="유튜브 영상 URL (YouTube Link)" style={{ flex:1, padding:10, borderRadius:8, border:'1px solid #e2e8f0' }} />
          <button className="btn" onClick={fetchYoutubeMeta} disabled={fetchingYt} style={{ background:'#f59e0b', color:'white', fontWeight:'bold', width:120 }}>{fetchingYt ? '...' : '정보 불러오기'}</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
          <input value={video.title} onChange={e => setVideo({...video, title:e.target.value})} placeholder="영상 제목 (자동 입력)" style={{ padding:10, borderRadius:8, border:'1px solid #e2e8f0' }} />
          <input value={video.source} onChange={e => setVideo({...video, source:e.target.value})} placeholder="채널명 (자동 입력)" style={{ padding:10, borderRadius:8, border:'1px solid #e2e8f0' }} />
          <input value={video.desc} onChange={e => setVideo({...video, desc:e.target.value})} placeholder="간략 코멘트" style={{ padding:10, borderRadius:8, border:'1px solid #e2e8f0' }} />
        </div>
      </div>

      {/* Policies */}
      <div className="card" style={{ marginBottom:25 }}>
        <div className="card-title">
          <div><i className="fas fa-crosshairs"></i> 추적 정책 및 기사 수집 제어</div>
        </div>
        <div style={{ display:'flex', gap:10, marginBottom:15 }}>
          <input value={policyForm.url} onChange={e => setPolicyForm({...policyForm, url:e.target.value})} placeholder="대상 언론사 URL" style={{ flex:1 }} />
          <input value={policyForm.keyword} onChange={e => setPolicyForm({...policyForm, keyword:e.target.value})} placeholder="추적 키워드" style={{ flex:1 }} />
          <button className="btn btn-dark" onClick={savePolicy}>정책 추가</button>
        </div>
        {policies.map(p => (
          <div key={p.id} style={{ background:'#f8fafc', border:'1px solid #e2e8f0', padding:'12px 20px', borderRadius:8, marginBottom:8, display:'flex', justifyContent:'space-between', fontSize:14 }}>
            <span><b>[{p.company}]</b> {p.url} / <b>{p.keyword}</b></span>
            <button className="btn btn-outline" style={{ padding:'4px 12px', fontSize:11, color:'#ef4444', borderColor:'#ef4444' }} onClick={() => deletePolicy(p.id)}>삭제</button>
          </div>
        ))}
      </div>

      {/* AI Analysis */}
      <div className="card" style={{ border:'2px solid #3b82f6', background:'#f8fafc', marginBottom:25 }}>
        <div className="card-title" style={{ color:'#3b82f6' }}><div><i className="fas fa-brain"></i> 무료 로컬 기사 분석</div></div>
        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          {[
            { id:'auto', label:'자동', hint:'Chrome 내장 AI 우선' },
            { id:'chrome', label:'Chrome 내장 AI', hint:'미지원 시 실패 표시' },
            { id:'fallback', label:'자동정리만', hint:'서버/API 사용 없음' }
          ].map(mode => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setAnalysisMode(mode.id)}
              style={{
                flex:1, border:'1px solid ' + (analysisMode === mode.id ? '#3b82f6' : '#cbd5e1'),
                background: analysisMode === mode.id ? '#eff6ff' : '#ffffff',
                color: analysisMode === mode.id ? '#1d4ed8' : '#475569',
                borderRadius:10, padding:'10px 12px', fontWeight:900, cursor:'pointer', textAlign:'left'
              }}
            >
              <div style={{ fontSize:13 }}>{mode.label}</div>
              <div style={{ fontSize:10, opacity:0.75, marginTop:3 }}>{mode.hint}</div>
            </button>
          ))}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12, fontSize:12, fontWeight:900, color: chromeStatus === 'unavailable' ? '#b91c1c' : '#047857', background: chromeStatus === 'unavailable' ? '#fef2f2' : '#ecfdf5', border:'1px solid ' + (chromeStatus === 'unavailable' ? '#fecaca' : '#a7f3d0'), borderRadius:10, padding:'9px 12px' }}>
          <i className={`fas ${chromeStatus === 'checking' ? 'fa-spinner fa-spin' : chromeStatus === 'unavailable' ? 'fa-circle-exclamation' : 'fa-circle-check'}`}></i>
          <span>
            Chrome Summarizer API 상태: {chromeStatus === 'checking' ? '확인 중' : chromeStatus === 'unavailable' ? '현재 브라우저에서 사용 불가' : chromeStatus}
          </span>
          <button type="button" onClick={refreshChromeStatus} style={{ marginLeft:'auto', border:'none', background:'transparent', color:'inherit', fontWeight:900, cursor:'pointer' }}>다시 확인</button>
        </div>
        <div style={{ display:'flex', gap:10, marginBottom:10, background:'#eff6ff', padding:20, borderRadius:12 }}>
          <input value={aiInput.url} onChange={e => setAiInput({...aiInput, url:e.target.value})} placeholder="분석할 기사 원문 URL" style={{ flex:1, border:'2px solid #93c5fd', fontWeight:'bold' }} />
          <button className="btn btn-primary" onClick={runAI} disabled={aiLoading} style={{ width:180 }}>
            {aiLoading ? <><i className="fas fa-spinner fa-spin"></i> 분석 중...</> : <><i className="fas fa-magic"></i> AI 분석 실행</>}
          </button>
        </div>
        {(aiLoading || analysisStatus || analysisResult) && (
          <div style={{
            display:'flex', alignItems:'center', gap:10, marginBottom:16,
            background: aiLoading ? '#fff7ed' : analysisResult === 'Chrome 내장 AI' ? '#eef2ff' : '#f8fafc',
            border: `1px solid ${aiLoading ? '#fed7aa' : analysisResult === 'Chrome 내장 AI' ? '#c7d2fe' : '#e2e8f0'}`,
            color: aiLoading ? '#c2410c' : analysisResult === 'Chrome 내장 AI' ? '#4338ca' : '#475569',
            padding:'10px 14px', borderRadius:10, fontSize:12, fontWeight:900
          }}>
            <i className={`fas ${aiLoading ? 'fa-spinner fa-spin' : analysisResult === 'Chrome 내장 AI' ? 'fa-magic' : 'fa-gears'}`}></i>
            <span>{analysisStatus}</span>
            {analysisResult && (
              <span style={{ marginLeft:'auto', background:'white', border:'1px solid currentColor', borderRadius:999, padding:'4px 10px' }}>
                {analysisResult}
              </span>
            )}
          </div>
        )}
        <div style={{ background:'#fefce8', border:'1px solid #fef08a', padding:15, borderRadius:12, marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:900, color:'#a16207', marginBottom:8 }}><i className="fas fa-paste"></i> URL 접근 불가 시 — 기사 본문 복사하여 수동 분석</div>
          <textarea value={manualText} onChange={e => setManualText(e.target.value)} rows="3" placeholder="기사 내용을 여기에 붙여넣으세요. AI가 요약과 인사이트를 자동 생성합니다." style={{ width:'100%', borderRadius:8, border:'1px solid #fcd34d', padding:10, fontFamily:'inherit', fontSize:13, marginBottom:10 }}></textarea>
          <button className="btn" onClick={runManualAI} disabled={aiLoading} style={{ background:'#f59e0b', color:'white', fontWeight:'bold', width:'100%' }}>
            {aiLoading ? <><i className="fas fa-spinner fa-spin"></i> 분석 중...</> : <><i className="fas fa-pen-nib"></i> 붙여넣은 텍스트로 AI 요약 실행</>}
          </button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns: showPreview ? '1fr 380px' : '1fr', gap:30 }}>
          <div>
            <div style={{ fontWeight: 800, color: '#3b82f6', marginBottom: 10, fontSize:14 }}><i className="fas fa-edit"></i> 기사 수동 직접 입력 / AI 결과 수정</div>
            <div style={{ fontSize: 11, color: '#64748b', background: '#f8fafc', padding: '8px 12px', borderRadius: 8, marginBottom: 15, border:'1px solid #e2e8f0' }}>
              💡 AI 분석을 돌리지 않고 아래 폼에 내용을 직접 작성하여 수동으로 등록할 수도 있습니다.
            </div>
            <div className="grid-2" style={{ marginBottom:15 }}>
              <input value={aiInput.brand} onChange={e => setAiInput({...aiInput, brand:e.target.value})} placeholder="관련 기업" />
              <input value={aiInput.source} onChange={e => setAiInput({...aiInput, source:e.target.value})} placeholder="언론사" />
            </div>
            <input value={aiInput.title} onChange={e => setAiInput({...aiInput, title:e.target.value})} placeholder="기사 제목" style={{ marginBottom:15, fontWeight:'bold' }} />
            <input value={aiInput.img} onChange={e => setAiInput({...aiInput, img:e.target.value})} placeholder="썸네일 URL (선택)" style={{ marginBottom:15 }} />
            <textarea value={aiInput.desc} onChange={e => setAiInput({...aiInput, desc:e.target.value})} rows="3" placeholder="기사 핵심 요약" style={{ marginBottom:15, background:'#f1f5f9' }} />
            <textarea value={aiInput.insight} onChange={e => setAiInput({...aiInput, insight:e.target.value})} rows="3" placeholder="R&D 전략 인사이트" style={{ marginBottom:15, borderColor:'#bfdbfe', background:'#eff6ff' }} />
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <select value={aiInput.category} onChange={e => setAiInput({...aiInput, category:e.target.value})} style={{ flex:1, fontWeight:'bold' }}>
                <option value="main">🔥 FIRST DIVE</option><option value="macro">🌐 MACRO VIEW</option>
                <option value="platform">🛒 BIZ & PLATFORM</option><option value="auto">🚗 AUTO TRACK</option>
                <option value="ai">🤖 AI STRATEGY</option><option value="security">🛡️ INFO-SECURE</option>
              </select>
              <label style={{ display:'flex', alignItems:'center', gap:8, background:'#fefce8', border:'1px solid #fef08a', padding:10, borderRadius:8, fontWeight:900, fontSize:13, color:'#a16207', cursor:'pointer', whiteSpace:'nowrap' }}>
                <input type="checkbox" checked={aiInput.isImportant} onChange={e => setAiInput({...aiInput, isImportant:e.target.checked})} style={{ width:16, height:16 }} /> ⭐ 중요 (최대 3개)
              </label>
              <button className="btn btn-dark" style={{ width:150, height:45 }} onClick={addToDraft}>대기열 전송 ⬇️</button>
            </div>
          </div>

          {/* 미리보기 카드 - 이미지 썸네일 + R&D 인사이트 포함 */}
          <div>
            <div style={{ fontSize:13, fontWeight:900, color:'#64748b', marginBottom:10 }}><i className="fas fa-mobile-alt"></i> 모바일 뷰 미리보기</div>
            {showPreview ? (
              <div style={{ border:'1px solid #e2e8f0', borderRadius:12, overflow:'hidden', background:'white', boxShadow:'0 10px 15px -3px rgba(0,0,0,0.1)', display:'flex', flexDirection:'column' }}>
                <div style={{ width:'100%', height:200, background: aiInput.img ? '#f1f5f9' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', position:'relative', display:'flex', justifyContent:'center', alignItems:'center' }}>
                  {aiInput.img ? (
                  <img src={aiInput.img} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_THUMB; }} />
                  ) : (
                    <i className="fas fa-newspaper" style={{ fontSize:40, color:'rgba(255,255,255,0.5)' }}></i>
                  )}
                </div>
                <div style={{ padding:20, flex:1 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, fontSize:11, fontWeight:'bold' }}>
                    <span style={{ color:'#3b82f6', background:'#eff6ff', padding:'4px 8px', borderRadius:4 }}>{aiInput.brand || '기업명'}</span>
                    <span style={{ color:'#64748b' }}>{aiInput.source || '언론사'}</span>
                  </div>
                  <div style={{ fontWeight:900, fontSize:17, marginBottom:12, lineHeight:1.4, color:'#1e293b' }}>{aiInput.title || '기사 제목이 표시됩니다'}</div>
                  <div style={{ fontSize:13, color:'#475569', marginBottom:15, lineHeight:1.5 }}>{aiInput.desc || '요약 내용이 표시됩니다.'}</div>
                  {aiInput.insight && (
                    <div style={{ background:'#f0fdf4', padding:12, borderRadius:8, fontSize:12, color:'#065f46', border:'1px solid #bbf7d0' }}>
                      <b style={{ color:'#047857' }}>💡 R&D 인사이트</b><br/>
                      <span style={{ display:'block', marginTop:5, lineHeight:1.4 }}>{aiInput.insight}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ minHeight:300, border:'2px dashed #cbd5e1', borderRadius:12, display:'flex', justifyContent:'center', alignItems:'center', flexDirection:'column', color:'#94a3b8', fontSize:13, fontWeight:'bold' }}>
                <i className="fas fa-image" style={{ fontSize:30, marginBottom:10 }}></i>AI 분석을 실행하면 미리보기가 생성됩니다
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ border:'2px solid #10b981', background:'#f0fdf4', marginBottom:25 }}>
        <div className="card-title" style={{ color:'#047857' }}><div><i className="fas fa-file-import"></i> Gemini JSON 대량 가져오기</div></div>
        <textarea
          value={jsonInput}
          onChange={e => setJsonInput(e.target.value)}
          rows="7"
          placeholder='[{"category":"auto","brand":"Carvana","title":"...","source":"...","link":"https://...","img":"https://...","desc":"...","insight":"..."}]'
          style={{ width:'100%', borderRadius:12, border:'1px solid #86efac', padding:12, fontFamily:'Consolas, monospace', fontSize:12, marginBottom:10 }}
        />
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
          <div style={{ fontSize:12, color:'#047857', fontWeight:800 }}>
            summary/thumbnail_url 필드도 자동으로 desc/img로 변환합니다. 이 과정은 Netlify Function을 호출하지 않습니다.
          </div>
          <button className="btn btn-success" onClick={importJsonArticles} style={{ minWidth:180, fontWeight:900 }}>
            <i className="fas fa-plus-circle"></i> JSON 기사 가져오기
          </button>
        </div>
      </div>

      {/* Draft List - 썸네일 이미지 + 메인 기사 설정 버튼 포함 */}
      <div className="card">
        <div className="card-title" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div><i className="fas fa-list"></i> 발행 대기 목록 ({allDrafts.length}건)</div>
          <button className="btn" onClick={() => setShowWebPreview(true)} style={{ background:'#3b82f6', color:'white', fontSize:12, padding:'5px 15px' }}>
            <i className="fas fa-eye"></i> 최종 웹 미리보기
          </button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10, padding:20, background:'#f8fafc' }}>
          {allDrafts.length === 0 ? (
            <div style={{ textAlign:'center', padding:50, color:'#cbd5e1', border:'2px dashed #e2e8f0', borderRadius:20 }}>수집된 기사가 없습니다.</div>
          ) : allDrafts.map((a, i) => {
            const thumbImg = a.img && a.img.includes('http') ? a.img : DEFAULT_THUMB;
            return (
              <div key={i} className="card" style={{ display:'flex', gap:15, padding:15, alignItems:'center', border:'1px solid #e2e8f0', borderRadius:15, background:'white' }}>
                <div style={{ width:100, height:70, borderRadius:10, overflow:'hidden', background:'#f1f5f9', flexShrink:0 }}>
                  <img src={thumbImg} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_THUMB; }} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                    <span style={{ fontSize:11, fontWeight:900, color:'#3b82f6' }}>
                      <span style={{ background: catColor[a.category] || '#64748b', color:'white', fontSize:9, padding:'2px 6px', borderRadius:4, marginRight:4 }}>{catLabel[a.category] || a.category}</span>
                      {a.isImportant && <span style={{ background:'#ef4444', color:'white', fontSize:9, padding:'2px 6px', borderRadius:4, marginRight:4 }}>⭐HOT</span>}
                      [{a.brand}]
                    </span>
                    <span style={{ fontSize:10, color:'#94a3b8', fontWeight:'bold' }}>{a.source || 'N/A'}</span>
                  </div>
                  <div style={{ fontWeight:900, fontSize:15, color:'#1e293b', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.title || '(제목 없음 - 내용을 확인하세요)'}</div>
                  <input
                    value={a.img || ''}
                    onChange={e => updateDraftArticle(i, { img: e.target.value })}
                    placeholder="이미지 URL 직접 입력"
                    style={{ marginTop:8, width:'100%', padding:'7px 9px', borderRadius:8, border:'1px solid #cbd5e1', fontSize:11 }}
                  />
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <button className="btn" style={{ padding:'6px 12px', fontSize:11, background:'#f59e0b', color:'white' }} onClick={() => setMainArticle(i)}>메인</button>
                  <button className="btn btn-danger" style={{ padding:'6px 12px', fontSize:11 }} onClick={() => deleteArticle(i)}>삭제</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <MagazineWebPreview
        open={showWebPreview}
        onClose={() => setShowWebPreview(false)}
        modeLabel="최종 미리보기 모드"
        title={`[배포 예정] ${issueName || '미지정 호수'}`}
        articlesSource={allDrafts}
        mainArticle={draftArticles.main}
        video={video}
        securityBanner={selSecurity}
      />

      {/* Legacy inline preview kept disabled while the shared component is active. */}
      {false && showWebPreview && (
        <div style={{ position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(15,23,42,0.9)', zIndex:9999, display:'flex', justifyContent:'center', alignItems:'center' }}>
          <div style={{ background:'#f1f5f9', width:'90%', height:'90%', borderRadius:20, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>
            <div style={{ padding:'15px 30px', background:'white', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ background:'#ef4444', color:'white', padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:900 }}>최종 미리보기 모드</span>
                <h3 style={{ margin:0, color:'#1e293b' }}>[배포 예정] {issueName || '미지정 호수'}</h3>
              </div>
              <button onClick={() => setShowWebPreview(false)} style={{ background:'#0f172a', color:'white', border:'none', padding:'8px 20px', borderRadius:8, fontWeight:'bold', cursor:'pointer' }}>닫기</button>
            </div>
            
            <div style={{ padding:40, overflowY:'auto', flex:1 }}>
              {(() => {
                const sourceData = allDrafts;
                const sourceVideo = video;
                const sourceMain = draftArticles.main;
                const currentSecurityBanner = selSecurity;

                const getCat = (cat) => Array.isArray(sourceData) ? sourceData.filter(a => a.category === cat) : [];

                return (
                  <div style={{ maxWidth:1200, margin:'0 auto' }}>
                    {/* YouTube Section */}
                    {sourceVideo?.url && (
                      <div style={{ display:'flex', background:'#0f172a', borderRadius:24, overflow:'hidden', marginBottom:60, boxShadow:'0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ width:'65%', aspectRatio:'16/9', background:'black' }}>
                          <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:14 }}>
                             [YouTube Player: {sourceVideo.url}]
                          </div>
                        </div>
                        <div style={{ width:'35%', padding:30, display:'flex', flexDirection:'column', justifyContent:'center' }}>
                          <div style={{ color:'#ef4444', fontSize:12, fontWeight:900, marginBottom:10 }}><i className="fab fa-youtube"></i> {sourceVideo.source || 'YouTube'}</div>
                          <h2 style={{ color:'white', fontSize:20, fontWeight:800, marginBottom:15, lineHeight:1.4 }}>{sourceVideo.title}</h2>
                          <p style={{ color:'#94a3b8', fontSize:13, lineHeight:1.6 }}>{sourceVideo.desc}</p>
                        </div>
                      </div>
                    )}

                    {/* Main Article Section */}
                    {sourceMain && (
                      <div style={{ marginBottom:60 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
                          <span style={{ width:6, height:24, background:'#2563eb', borderRadius:10 }}></span>
                          <h2 style={{ fontSize:22, fontWeight:900, color:'#1e293b' }}>오늘의 1면 딥다이브</h2>
                        </div>
                        <div style={{ display:'flex', background:'white', borderRadius:24, overflow:'hidden', border:'1px solid #e2e8f0', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                          <div style={{ width:'50%', height:400, position:'relative' }}>
                            <img src={sourceMain.img || 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=800'} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                            <div style={{ position:'absolute', bottom:0, left:0, padding:30, background:'linear-gradient(transparent, rgba(0,0,0,0.8))', width:'100%' }}>
                              <span style={{ background:'#2563eb', color:'white', padding:'4px 12px', borderRadius:20, fontSize:11, fontWeight:900, marginBottom:10, display:'inline-block' }}>FOCUS</span>
                              <h3 style={{ color:'white', fontSize:26, fontWeight:900 }}>{sourceMain.title}</h3>
                            </div>
                          </div>
                          <div style={{ width:'50%', padding:40, display:'flex', flexDirection:'column', justifyContent:'center' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', borderBottom:'1px solid #f1f5f9', paddingBottom:15, marginBottom:15 }}>
                              <span style={{ color:'#2563eb', fontSize:14, fontWeight:900 }}>{sourceMain.brand}</span>
                              <span style={{ color:'#94a3b8', fontSize:12, fontWeight:700 }}>{sourceMain.source}</span>
                            </div>
                            <p style={{ fontSize:15, color:'#475569', lineHeight:1.7, marginBottom:20 }}>{sourceMain.desc}</p>
                            {sourceMain.insight && (
                              <div style={{ background:'#eff6ff', padding:20, borderRadius:16, border:'1px solid #dbeafe' }}>
                                <div style={{ fontSize:11, fontWeight:900, color:'#2563eb', marginBottom:5 }}><i className="fas fa-lightbulb"></i> R&D INSIGHT</div>
                                <p style={{ fontSize:13, color:'#1e40af', fontWeight:700, lineHeight:1.5 }}>{sourceMain.insight}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Category Grids */}
                    {[
                      { key: 'macro', label: '🌐 MACRO VIEW' },
                      { key: 'platform', label: '🛒 BIZ & PLATFORM' },
                      { key: 'auto', label: '🚗 AUTO TRACK' },
                      { key: 'ai', label: '🤖 AI STRATEGY' },
                      { key: 'security', label: '🛡️ INFO-SECURE' }
                    ].map(sec => {
                      const articles = getCat(sec.key);
                      if (articles.length === 0 && (sec.key !== 'security' || !currentSecurityBanner)) return null;

                      return (
                        <div key={sec.key} style={{ marginBottom:60 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'end', borderBottom:'2px solid #1e293b', paddingBottom:10, marginBottom:25 }}>
                            <h2 style={{ fontSize:18, fontWeight:900, color:'#1e293b' }}>{sec.label}</h2>
                          </div>
                          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:25 }}>
                            {sec.key === 'security' && currentSecurityBanner && (
                              <div style={{ background:'white', borderRadius:20, border:'1px solid #e2e8f0', overflow:'hidden', position:'relative', minHeight:300 }}>
                                <img src={currentSecurityBanner} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                                <div style={{ position:'absolute', bottom:20, left:20, background:'rgba(0,0,0,0.8)', color:'white', padding:'5px 12px', borderRadius:6, fontSize:11, fontWeight:900 }}>🚨 보안 캠페인</div>
                              </div>
                            )}
                            {articles.map((a, i) => (
                              <div key={i} style={{ background:'white', borderRadius:20, border:'1px solid #e2e8f0', overflow:'hidden', display:'flex', flexDirection:'column' }}>
                                <div style={{ width:'100%', aspectRatio:'16/10' }}>
                                  <img src={a.img || 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400'} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                                </div>
                                <div style={{ padding:20, flex:1, display:'flex', flexDirection:'column' }}>
                                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                                    <span style={{ color:'#2563eb', fontSize:11, fontWeight:800 }}>[{a.brand}]</span>
                                    <span style={{ color:'#94a3b8', fontSize:10, fontWeight:700 }}>{a.source}</span>
                                  </div>
                                  <h4 style={{ fontSize:16, fontWeight:900, color:'#1e293b', marginBottom:10, lineHeight:1.4 }}>{a.title}</h4>
                                  <p style={{ fontSize:13, color:'#64748b', lineHeight:1.5, marginBottom:15 }}>{a.desc}</p>
                                  {a.insight && (
                                    <div style={{ marginTop:'auto', paddingTop:15, borderTop:'1px solid #f1f5f9' }}>
                                      <div style={{ fontSize:10, fontWeight:900, color:'#1e293b', marginBottom:5 }}>R&D INSIGHT</div>
                                      <p style={{ fontSize:12, color:'#475569', fontWeight:700 }}>{a.insight}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
