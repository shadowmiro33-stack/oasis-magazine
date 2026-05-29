import React, { useState, useEffect } from 'react';
import { getAllMagazines, saveMagazine, deleteMagazine, getAllSubscribers } from '../services/dataService';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../api/firebase';
import { getPremiumNewsletterHTML } from '../utils/newsletterTemplate';
import { readJsonResponse } from '../utils/apiEndpoints';
import MagazineWebPreview from '../components/MagazineWebPreview';
import CollapsibleCard from '../components/CollapsibleCard';
import { normalizeExternalUrl, normalizeImageUrl, sanitizeArticleUrls } from '../utils/urlSanitizer';
import { buildNewsletterSendPlan, filterNewsletterArticles, hasNewsletterArticles } from '../utils/newsletterRecipients';

const CATEGORY_OPTIONS = [
  { value: 'main', label: '🔥 1면' },
  { value: 'macro', label: '🌐 경제' },
  { value: 'platform', label: '🛒 비즈' },
  { value: 'auto', label: '🚗 산업' },
  { value: 'ai', label: '🤖 AI' },
  { value: 'security', label: '🛡️ 보안' },
];

const applyArticleCategory = (articles = [], targetIndex, nextCategory) => articles.map((article, index) => {
  if (index === targetIndex) return { ...article, category: nextCategory };
  if (nextCategory === 'main' && article.category === 'main') return { ...article, category: 'auto' };
  return article;
});

const formatLocalDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getReportDateId = (reportId = '') => reportId.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || formatLocalDate();

const formatKoreanDateId = (dateId = formatLocalDate()) => {
  const [year, month, day] = dateId.split('-');
  return `${year}.${Number(month)}.${Number(day)}`;
};

export default function ReportDeploy({ draftArticles, setDraftArticles, issueName, setIssueName, selCampaign, setSelCampaign, selSecurity, setSelSecurity, video, setVideo, campaigns, secBanners }) {
  const [history, setHistory] = useState([]);
  const [deploying, setDeploying] = useState(false);
  const [publishDate, setPublishDate] = useState(formatLocalDate());
  const [expandedRows, setExpandedRows] = useState({}); // historyRow 확장 상태
  const [openSections, setOpenSections] = useState({ deploy:true, history:true });
  const [pastPreviewReport, setPastPreviewReport] = useState(null); // 과거 리포트 웹 미리보기용

  // Edit Modal State
  const [editingReport, setEditingReport] = useState(null);
  const [editArticles, setEditArticles] = useState([]);
  const [editIssueName, setEditIssueName] = useState('');
  const [editPublishDate, setEditPublishDate] = useState('');
  const [editSelCampaign, setEditSelCampaign] = useState('');
  const [editSelSecurity, setEditSelSecurity] = useState('');
  const [newArtCat, setNewArtCat] = useState('main');
  const [newArtBrand, setNewArtBrand] = useState('');
  const [newArtTitle, setNewArtTitle] = useState('');
  const [newArtLink, setNewArtLink] = useState('');
  const [newArtSource, setNewArtSource] = useState('');
  const [newArtImg, setNewArtImg] = useState('');
  const [newArtDesc, setNewArtDesc] = useState('');
  const [newArtInsight, setNewArtInsight] = useState('');
  const [newArtImportant, setNewArtImportant] = useState(false);

  // Edit Video State
  const [editVideo, setEditVideo] = useState({ url: '', title: '', source: '', desc: '' });

  // Web Preview Modal State
  const [showWebPreview, setShowWebPreview] = useState(false);
  const [emailPreview, setEmailPreview] = useState(null);
  const [emailSendPlan, setEmailSendPlan] = useState(null);
  const [selectedEmailMap, setSelectedEmailMap] = useState({});
  const [sendingEmail, setSendingEmail] = useState(false);

  const isSectionOpen = (key) => openSections[key] !== false;
  const toggleSection = (key) => setOpenSections(prev => ({ ...prev, [key]: !isSectionOpen(key) }));

  const fetchData = async () => {
    const mags = await getAllMagazines();
    setHistory(mags);
  };
  
  useEffect(() => { fetchData(); }, []);

  const allDrafts = [...(draftArticles.main ? [draftArticles.main] : []), ...draftArticles.macro, ...draftArticles.platform, ...draftArticles.auto, ...draftArticles.ai, ...draftArticles.security];
  const selectedEmailCount = Object.values(selectedEmailMap).filter(Boolean).length;

  const setRecipientSelection = (emails = [], selected) => {
    setSelectedEmailMap(prev => {
      const next = { ...prev };
      emails.forEach(email => {
        if (selected) next[email] = true;
        else delete next[email];
      });
      return next;
    });
  };

  const toggleRecipientEmail = (email) => {
    setSelectedEmailMap(prev => {
      const next = { ...prev };
      if (next[email]) delete next[email];
      else next[email] = true;
      return next;
    });
  };

  const clearEmailSendPlan = () => {
    setEmailSendPlan(null);
    setSelectedEmailMap({});
  };

  const resizeImageUrlForEmail = (url, maxWidth = 560, maxHeight = 420) => new Promise((resolve) => {
    const safeUrl = normalizeImageUrl(url, { fallback: '' });
    if (!safeUrl) return resolve(url);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      try {
        const scale = Math.min(maxWidth / img.naturalWidth, maxHeight / img.naturalHeight, 1);
        const width = Math.round(img.naturalWidth * scale);
        const height = Math.round(img.naturalHeight * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(async blob => {
          if (!blob) return resolve(safeUrl);
          try {
            const imageRef = ref(storage, `security/email/generated_${Date.now()}.jpg`);
            await uploadBytes(imageRef, blob, { contentType: 'image/jpeg' });
            resolve(await getDownloadURL(imageRef));
          } catch (_) {
            resolve(safeUrl);
          }
        }, 'image/jpeg', 0.86);
      } catch (_) {
        resolve(safeUrl);
      }
    };
    img.onerror = () => resolve(safeUrl);
    img.src = safeUrl;
  });

  const resolveSecurityBanner = (value) => {
    if (!value || typeof value !== 'string') return value;
    return secBanners.find(b => b.url === value || b.emailUrl === value) || value;
  };

  const buildEmailCampaign = async (value) => {
    const campaign = resolveSecurityBanner(value);
    if (!campaign || campaign.shortsUrl) return campaign;
    if (typeof campaign === 'string') {
      return { url: campaign, emailUrl: await resizeImageUrlForEmail(campaign) };
    }
    return { ...campaign, emailUrl: campaign.emailUrl || await resizeImageUrlForEmail(campaign.url) };
  };

  const deploy = async () => {
    if (!issueName) return alert('호수를 입력하세요.');
    if (allDrafts.length === 0) return alert('배포할 기사가 없습니다.');
    const docId = publishDate || formatLocalDate();
    if (history.some(m => m.id === docId) && !window.confirm(`${docId} 리포트가 이미 있습니다. 덮어쓸까요?`)) return;
    setDeploying(true);
    try {
      const campaignData = selCampaign ? campaigns.find(v => v.id === selCampaign) || null : null;
      await saveMagazine(docId, {
        issueName,
        publishDate: new Date().toISOString(),
        publishDateId: docId,
        articles: allDrafts.map(sanitizeArticleUrls),
        video: { ...video, url: normalizeExternalUrl(video.url, { fallback: video.url }) },
        campaign: campaignData,
        webCampaign: normalizeImageUrl(selSecurity, { fallback: selSecurity })
      });
      alert('서버에 배포되었습니다.');
      setDraftArticles({ main: null, macro: [], platform: [], auto: [], ai: [], security: [] });
      setIssueName(''); setPublishDate(formatLocalDate()); setVideo({ url:'', title:'', source:'', desc:'' }); fetchData();
    } catch (e) { alert('배포 실패: ' + e.message); }
    finally { setDeploying(false); }
  };

  const deleteReport = async (docId) => {
    if (!window.confirm('⚠️ 삭제하시겠습니까?')) return;
    await deleteMagazine(docId); alert('삭제되었습니다.'); fetchData();
  };

  const openEmailSendPlan = async (mag) => {
    const appsScriptUrl = localStorage.getItem('OASIS_APPS_SCRIPT_URL');
    const mailToken = localStorage.getItem('OASIS_MAIL_TOKEN') || '';
    if (!appsScriptUrl) return alert('Apps Script 웹앱 URL이 설정되지 않았습니다. API 관리 탭에서 설정해주세요.');
    const safeAppsScriptUrl = normalizeExternalUrl(appsScriptUrl, { fallback: '', forceHttps: false });
    if (!safeAppsScriptUrl) return alert('Apps Script 웹앱 URL 형식이 올바르지 않습니다. API 관리 탭에서 확인해주세요.');

    try {
      const subs = await getAllSubscribers();
      if (subs.length === 0) return alert('구독자가 없습니다.');
      const plan = buildNewsletterSendPlan(subs, mag.articles);
      if (plan.deliverableCount === 0) {
        return alert('발송 가능한 구독자가 없습니다. 구독자 상태, 이메일 주소, 관심 카테고리와 리포트 기사 구성을 확인해주세요.');
      }
      setEmailSendPlan({
        ...plan,
        mag,
        appsScriptUrl: safeAppsScriptUrl,
        mailToken,
      });
      setSelectedEmailMap({});
    } catch (e) {
      alert('발송 계획 생성 실패: ' + e.message);
    }
  };

  const confirmSendEmail = async () => {
    if (!emailSendPlan || sendingEmail) return;
    const selectedEmailSet = new Set(Object.entries(selectedEmailMap).filter(([, selected]) => selected).map(([email]) => email));
    if (selectedEmailSet.size === 0) return alert('발송할 수신자를 선택해주세요. 테스트 발송은 본인 이메일만 체크하면 됩니다.');
    setSendingEmail(true);
    try {
      const { mag, appsScriptUrl, mailToken, groups } = emailSendPlan;
      const emailCampaign = await buildEmailCampaign(mag.campaign);
      let requestedCount = 0;
      let skippedCount = 0;

      for (const group of groups) {
        const selectedGroupEmails = group.emails.filter(email => selectedEmailSet.has(email));
        if (selectedGroupEmails.length === 0) continue;
        const filteredArticles = filterNewsletterArticles(mag.articles, group.keys);
        if (!hasNewsletterArticles(filteredArticles)) {
          skippedCount += selectedGroupEmails.length;
          continue;
        }

        const groupCampaign = (emailCampaign?.shortsUrl || group.keys.includes('security')) ? emailCampaign : null;
        const htmlContent = getPremiumNewsletterHTML(mag.issueName || '', formatKoreanDateId(mag.publishDateId || getReportDateId(mag.id) || publishDate), groupCampaign, filteredArticles, undefined, mag.video);
        await fetch(appsScriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            to: selectedGroupEmails,
            subject: `[OASIS] 핸지가 보는 세상 - ISSUE ${mag.issueName || '임시 호수'}`,
            html: htmlContent,
            token: mailToken,
          })
        });
        requestedCount += selectedGroupEmails.length;
      }

      alert(`메일 발송 요청을 Apps Script로 전달했습니다. 관심 카테고리별로 필터링된 본문을 전송했습니다. 대상: ${requestedCount}명${skippedCount ? ` / 내용 없어 제외: ${skippedCount}명` : ''}`);
      clearEmailSendPlan();
    } catch (e) {
      alert('발송 실패: ' + e.message);
    } finally {
      setSendingEmail(false);
    }
  };

  const previewCurrentDrafts = async () => {
    if (allDrafts.length === 0) return alert('배포할 기사가 없습니다.');
    const campaignData = selCampaign ? campaigns.find(v => v.id === selCampaign) || null : null;
    const emailCampaign = await buildEmailCampaign(campaignData);
    const htmlContent = getPremiumNewsletterHTML(issueName || '임시 호수', formatKoreanDateId(publishDate), emailCampaign, draftArticles, undefined, video);
    setEmailPreview({ title: '핸지가 보는 세상 미리보기', html: htmlContent });
  };

  const previewPastEmail = async (mag) => {
    const emailCampaign = await buildEmailCampaign(mag.campaign);
    const htmlContent = getPremiumNewsletterHTML(mag.issueName || '', formatKoreanDateId(getReportDateId(mag.id)), emailCampaign, mag.articles, undefined, mag.video);
    setEmailPreview({ title: `핸지가 보는 세상 과거호 미리보기 - ${mag.issueName}`, html: htmlContent });
  };

  const previewPastWeb = (mag) => {
    setPastPreviewReport(mag);
    setShowWebPreview(true);
  };

  const sendCurrentDrafts = async () => {
    if (allDrafts.length === 0) return alert('배포할 기사가 없습니다. 최종 발행 후 메일을 발송하는 것을 권장합니다.');
    const mag = { id: publishDate, publishDateId: publishDate, issueName: issueName || '임시 호수', articles: draftArticles, campaign: selCampaign ? campaigns.find(v => v.id === selCampaign) : null, webCampaign: selSecurity, video };
    await openEmailSendPlan(mag);
  };

  const exportPdf = async () => {
    const savePdf = async (element) => {
      const { default: html2pdf } = await import('html2pdf.js');
      html2pdf().set({ margin: 1, filename: `OASIS_History.pdf`, jsPDF: { format: 'letter', orientation: 'portrait' } }).from(element).save();
    };
    const element = document.getElementById('history-container');
    if(!element) {
      setOpenSections(prev => ({ ...prev, history: true }));
      window.setTimeout(() => {
        const openedElement = document.getElementById('history-container');
        if (openedElement) savePdf(openedElement);
      }, 50);
      return;
    }
    savePdf(element);
  };

  const openEditModal = (mag) => {
    setEditingReport(mag);
    setEditArticles([...(mag.articles || [])]);
    setEditIssueName(mag.issueName || '');
    setEditPublishDate(getReportDateId(mag.id));
    setEditSelCampaign(mag.campaign?.id || '');
    setEditSelSecurity(mag.webCampaign || '');
    setEditVideo(mag.video || { url: '', title: '', source: '', desc: '' });
  };

  const closeEditModal = () => setEditingReport(null);

  const toggleEditImportant = (idx) => {
    const updated = [...editArticles];
    if(!updated[idx].isImportant && updated.filter(a => a.isImportant).length >= 3) {
      return alert("⚠️ 중요 기사는 최대 3개까지만 설정할 수 있습니다.");
    }
    updated[idx].isImportant = !updated[idx].isImportant;
    setEditArticles(updated);
  };

  const removeEditArticle = (idx) => {
    const updated = [...editArticles];
    updated.splice(idx, 1);
    setEditArticles(updated);
  };

  const changeEditCategory = (idx, newCat) => {
    setEditArticles(prev => applyArticleCategory(prev, idx, newCat));
  };

  const updateHistoryArticleCategory = async (mag, idx, newCat) => {
    const updatedArticles = applyArticleCategory(mag.articles || [], idx, newCat);
    const updatedReport = { ...mag, articles: updatedArticles };
    setHistory(prev => prev.map(item => item.id === mag.id ? updatedReport : item));
    if (editingReport?.id === mag.id) setEditArticles(updatedArticles);
    try {
      await saveMagazine(mag.id, updatedReport);
    } catch (e) {
      alert('카테고리 저장 실패: ' + e.message);
      fetchData();
    }
  };

  const deleteHistoryArticle = async (mag, idx) => {
    if (!window.confirm('이 기사를 지난 리포트에서 삭제하시겠습니까?')) return;
    const updatedArticles = (mag.articles || []).filter((_, articleIndex) => articleIndex !== idx);
    const updatedReport = { ...mag, articles: updatedArticles };
    setHistory(prev => prev.map(item => item.id === mag.id ? updatedReport : item));
    if (editingReport?.id === mag.id) setEditArticles(updatedArticles);
    try {
      await saveMagazine(mag.id, updatedReport);
      alert('기사를 삭제했습니다.');
    } catch (e) {
      alert('기사 삭제 실패: ' + e.message);
      fetchData();
    }
  };

  const changeEditArticle = (idx, key, value) => {
    const updated = [...editArticles];
    updated[idx] = { ...updated[idx], [key]: value };
    setEditArticles(updated);
  };

  const fetchEditYoutubeMeta = async () => {
    if(!editVideo.url.trim()) return alert("유튜브 링크 URL을 먼저 입력해주세요!");
    try {
      const response = await fetch(`https://noembed.com/embed?url=${editVideo.url}`);
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || `YouTube metadata failed (${response.status})`);
      setEditVideo({
        ...editVideo,
        title: data.title || '',
        source: data.author_name || '',
        desc: data.title || ''
      });
    } catch (e) { alert("유튜브 정보를 가져오지 못했습니다."); }
  };

  const addNewArticleToEdit = () => {
    if(newArtImportant && editArticles.filter(a => a.isImportant).length >= 3) return alert("⚠️ 중요 기사는 최대 3개까지만 가능합니다.");
    if(!newArtTitle || !newArtLink) return alert("제목과 링크는 필수 입력입니다.");
    
    setEditArticles([...editArticles, sanitizeArticleUrls({ 
      category: newArtCat, brand: newArtBrand || '오아시스', title: newArtTitle, link: newArtLink, desc: newArtDesc, insight: newArtInsight, source: newArtSource || '자체 보도', img: newArtImg, isImportant: newArtImportant 
    })]);
    setNewArtTitle(''); setNewArtLink(''); setNewArtSource(''); setNewArtImg(''); setNewArtDesc(''); setNewArtInsight(''); setNewArtImportant(false);
  };

  const saveEditingReport = async () => {
    if(!editIssueName) return alert("호수명은 필수입니다.");
    if(!editPublishDate) return alert("발행일은 필수입니다.");
    const currentDocId = editingReport.id;
    const nextDocId = editPublishDate;
    const isDateChanged = nextDocId !== currentDocId;
    const existsOnDate = history.some(m => m.id === nextDocId && m.id !== currentDocId);
    if (existsOnDate && !window.confirm(`${nextDocId} 리포트가 이미 있습니다. 덮어쓸까요?`)) return;
    const campaignData = editSelCampaign ? campaigns.find(v => v.id === editSelCampaign) || { securityImg: editSelCampaign } : null;
    try {
      const nextReport = {
        issueName: editIssueName,
        publishDate: editingReport.publishDate || new Date().toISOString(),
        publishDateId: nextDocId,
        articles: editArticles.map(sanitizeArticleUrls),
        campaign: campaignData,
        webCampaign: normalizeImageUrl(editSelSecurity, { fallback: editSelSecurity }),
        video: { ...editVideo, url: normalizeExternalUrl(editVideo.url, { fallback: editVideo.url }) }
      };
      await saveMagazine(nextDocId, nextReport);
      if (isDateChanged) await deleteMagazine(currentDocId);
      alert("성공적으로 수정되었습니다!");
      closeEditModal();
      fetchData();
    } catch (e) { alert("저장 실패: " + e.message); }
  };

  const deleteEntireReport = async () => {
    if(!window.confirm("⚠️ 리포트를 전체 삭제하시겠습니까?")) return;
    try {
      await deleteMagazine(editingReport.id);
      alert("삭제되었습니다.");
      closeEditModal();
      fetchData();
    } catch(e) { alert("삭제 실패"); }
  };

  const exportExcel = async () => {
    if (history.length === 0) return alert('데이터가 없습니다.');
    const XLSX = await import('xlsx');
    let rows = [];
    history.forEach(m => { if (m.articles) m.articles.forEach(a => rows.push({ '발행 호수': m.issueName, '카테고리': a.category, '관련 기업': a.brand, '기사 제목': a.title, '인사이트': a.insight, '원문 링크': a.link })); });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `OASIS_Report_${formatLocalDate()}.xlsx`);
  };

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div><h2>🚀 리포트 배포 및 데이터 추출</h2></div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn" style={{ background:'#107c41', color:'white' }} onClick={exportExcel}><i className="fas fa-file-excel"></i> Excel</button>
          <button className="btn btn-danger" onClick={exportPdf}><i className="fas fa-file-pdf"></i> PDF</button>
        </div>
      </div>

      <div style={{ background:'linear-gradient(135deg,#0f172a 0%,#1e40af 100%)', color:'white', borderRadius:18, padding:24, marginBottom:25, boxShadow:'0 18px 45px rgba(15,23,42,0.22)' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr', gap:20, alignItems:'center' }}>
          <div>
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.14)', border:'1px solid rgba(255,255,255,0.18)', borderRadius:999, padding:'7px 12px', fontSize:12, fontWeight:900, marginBottom:14 }}>
              <i className="fas fa-envelope-open-text" /> 핸지가 보는 세상 발송 센터
            </div>
            <h3 style={{ margin:'0 0 10px', fontSize:24, fontWeight:900 }}>메일 발송은 여기서 확인하세요</h3>
            <p style={{ margin:0, color:'#bfdbfe', fontSize:13, fontWeight:800, lineHeight:1.7 }}>
              미리보기로 내용을 확인한 뒤, 관심 항목별 수신자와 기사 구성을 검토하고 최종 발송 요청을 보냅니다.
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0, 1fr))', gap:10 }}>
            <div style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.18)', borderRadius:14, padding:14 }}>
              <div style={{ color:'#bfdbfe', fontSize:11, fontWeight:900, marginBottom:6 }}>발송 기준일</div>
              <div style={{ fontSize:18, fontWeight:900 }}>{publishDate}</div>
            </div>
            <div style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.18)', borderRadius:14, padding:14 }}>
              <div style={{ color:'#bfdbfe', fontSize:11, fontWeight:900, marginBottom:6 }}>호수</div>
              <div style={{ fontSize:18, fontWeight:900 }}>{issueName || '미지정'}</div>
            </div>
            <div style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.18)', borderRadius:14, padding:14 }}>
              <div style={{ color:'#bfdbfe', fontSize:11, fontWeight:900, marginBottom:6 }}>초안 기사</div>
              <div style={{ fontSize:18, fontWeight:900 }}>{allDrafts.length}건</div>
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginTop:20 }}>
          <button className="btn" onClick={previewCurrentDrafts} disabled={allDrafts.length === 0} style={{ background:'#ffffff', color:'#1e40af', fontWeight:900, padding:'13px 20px', minWidth:180 }}>
            <i className="fas fa-eye" /> 메일 미리보기
          </button>
          <button className="btn" onClick={sendCurrentDrafts} disabled={allDrafts.length === 0} style={{ background:'#38bdf8', color:'#082f49', fontWeight:900, padding:'13px 22px', minWidth:220, boxShadow:'0 8px 18px rgba(56,189,248,0.28)' }}>
            <i className="fas fa-paper-plane" /> 발송 대상/계획 확인
          </button>
          <button className="btn" onClick={() => setShowWebPreview(true)} disabled={allDrafts.length === 0} style={{ background:'rgba(255,255,255,0.12)', color:'white', border:'1px solid rgba(255,255,255,0.25)', fontWeight:900, padding:'13px 20px', minWidth:180 }}>
            <i className="fas fa-desktop" /> 웹 미리보기
          </button>
          <span style={{ display:'inline-flex', alignItems:'center', color:'#dbeafe', fontSize:12, fontWeight:800 }}>
            최종 발송은 계획 모달에서 한 번 더 확인합니다.
          </span>
        </div>
      </div>

      {/* Deploy Section */}
      <CollapsibleCard
        title="클라우드 DB 최종 발행"
        icon="fas fa-cloud-upload-alt"
        open={isSectionOpen('deploy')}
        onToggle={() => toggleSection('deploy')}
        style={{ border:'2px solid #10b981', background:'#f0fdf4', marginBottom:25 }}
        titleStyle={{ color:'#75b5ee' }}
      >
        <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:15 }}>
          <input type="date" value={publishDate} onChange={e => setPublishDate(e.target.value)} style={{ width:170, padding:15, fontWeight:'bold', borderRadius:8, border:'1px solid #cbd5e1' }} />
          <input value={issueName} onChange={e => setIssueName(e.target.value)} placeholder="발행 호수 입력 (예: NO.38)" style={{ flex:1, padding:15, fontWeight:'bold' }} />
          <select value={selCampaign} onChange={e => setSelCampaign(e.target.value)} style={{ flex:1, padding:15, fontWeight:'bold', borderColor:'#ec4899' }}>
            <option value="">숏츠/릴스 선택 (없음)</option>
            {campaigns.map(v => <option key={v.id} value={v.id}>{v.title || v.name || '영상'}</option>)}
          </select>
          <select value={selSecurity} onChange={e => setSelSecurity(e.target.value)} style={{ flex:1, padding:15, fontWeight:'bold', borderColor:'#34d399' }}>
            <option value="">보안 캠페인 선택 (없음)</option>
            {secBanners.map(img => <option key={img.id} value={img.url}>{img.name || '배너'}</option>)}
          </select>
        </div>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button className="btn" onClick={previewCurrentDrafts} style={{ padding:'12px 25px', fontSize:14, background:'#6366f1', color:'white', fontWeight:'bold' }}>
            <i className="fas fa-envelope-open-text"></i> ① 메일 발송용 미리보기
          </button>
          <button className="btn" onClick={() => setShowWebPreview(true)} style={{ padding:'12px 25px', fontSize:14, background:'#3b82f6', color:'white', fontWeight:'bold' }}>
            <i className="fas fa-desktop"></i> ② 웹 매거진용 미리보기
          </button>
          <div style={{ borderLeft:'1px solid #cbd5e1', margin:'0 10px' }}></div>
          <button className="btn btn-dark" onClick={deploy} disabled={deploying} style={{ padding:'15px 40px', fontSize:16, fontWeight:900, boxShadow:'0 10px 15px -3px rgba(0,0,0,0.2)' }}>
            {deploying ? '배포 중...' : '🚀 3. 라이브 서버 최종 배포'}
          </button>
        </div>
      </CollapsibleCard>

      {/* History */}
      <CollapsibleCard
        title="지난 리포트 DB"
        icon="fas fa-book-open"
        open={isSectionOpen('history')}
        onToggle={() => toggleSection('history')}
        style={{ padding:0, overflow:'hidden', marginTop:30 }}
        titleStyle={{ padding:'25px 25px 0' }}
      >
      <div id="history-container">
        <table>
          <thead><tr><th style={{ width:40 }}></th><th>발행일</th><th>리포트 호수</th><th>수록 기사수</th><th>상태</th><th style={{ width:200 }}>관리</th></tr></thead>
          <tbody>
            {history.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign:'center', padding:30, color:'#94a3b8' }}>발행된 리포트가 없습니다.</td></tr>
            ) : history.map(m => (
              <React.Fragment key={m.id}>
                <tr style={{ cursor:'pointer' }} onClick={() => setExpandedRows({...expandedRows, [m.id]: !expandedRows[m.id]})}>
                  <td style={{ textAlign:'center' }}>{expandedRows[m.id] ? <i className="fas fa-chevron-up"></i> : <i className="fas fa-chevron-down"></i>}</td>
                  <td>{m.id}</td>
                  <td><b>{m.issueName}</b></td>
                  <td>{m.articles?.length || 0}건</td>
                  <td><span style={{ color:'#10b981', fontWeight:'bold' }}>배포완료</span></td>
                  <td>
                    <div style={{ display:'flex', gap:5 }}>
                      <button className="btn btn-outline" style={{ padding:'4px 8px', fontSize:10, flex:1 }} onClick={(e) => { e.stopPropagation(); openEditModal(m); }}>관리/수정</button>
                      <button className="btn btn-danger" style={{ padding:'4px 8px', fontSize:10, background:'#fef2f2', color:'#ef4444' }} onClick={(e) => { e.stopPropagation(); deleteReport(m.id); }}>삭제</button>
                    </div>
                  </td>
                </tr>
                {expandedRows[m.id] && (
                  <tr>
                    <td colSpan="6" style={{ background:'#f8fafc', padding:20 }}>
                      <div style={{ display:'flex', gap:20 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:12, fontWeight:900, color:'#64748b', marginBottom:10 }}>📑 수록 기사 리스트 / 기사별 삭제</div>
                          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                            {(m.articles || []).length === 0 ? (
                              <div style={{ fontSize:12, color:'#94a3b8', background:'white', padding:'10px 12px', borderRadius:6, border:'1px dashed #cbd5e1' }}>수록된 기사가 없습니다.</div>
                            ) : m.articles.map((a, idx) => (
                              <div key={idx} style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, color:'#1e293b', background:'white', padding:'6px 10px', borderRadius:4, border:'1px solid #e2e8f0' }}>
                                <select
                                  value={a.category || 'auto'}
                                  onClick={e => e.stopPropagation()}
                                  onChange={e => updateHistoryArticleCategory(m, idx, e.target.value)}
                                  style={{ width:108, padding:'5px 6px', borderRadius:6, border:'1px solid #cbd5e1', background:'white', fontSize:11, fontWeight:900, flexShrink:0 }}
                                >
                                  {CATEGORY_OPTIONS.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                  ))}
                                </select>
                                <span style={{ flex:1, minWidth:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.title}</span>
                                <button
                                  type="button"
                                  onClick={e => { e.stopPropagation(); deleteHistoryArticle(m, idx); }}
                                  style={{ border:'none', background:'#fef2f2', color:'#ef4444', borderRadius:6, padding:'5px 8px', fontSize:10, fontWeight:900, cursor:'pointer', flexShrink:0 }}
                                >
                                  기사 삭제
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div style={{ width:180, display:'flex', flexDirection:'column', gap:8 }}>
                          <div style={{ fontSize:12, fontWeight:900, color:'#64748b', marginBottom:2 }}>🔍 미리보기</div>
                          <button className="btn btn-primary" style={{ background:'#6366f1', fontSize:11, padding:'10px' }} onClick={() => previewPastEmail(m)}><i className="fas fa-envelope"></i> 메일 미리보기</button>
                          <button className="btn btn-primary" style={{ background:'#3b82f6', fontSize:11, padding:'10px' }} onClick={() => previewPastWeb(m)}><i className="fas fa-desktop"></i> 웹 미리보기</button>
                          <div style={{ margin:'5px 0' }}></div>
                          <button className="btn btn-success" style={{ fontSize:11, padding:'10px' }} onClick={() => openEmailSendPlan(m)}><i className="fas fa-paper-plane"></i> 재발송 계획</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      </CollapsibleCard>

      {/* Edit Modal */}
      {editingReport && (
        <div style={{ position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(15,23,42,0.85)', zIndex:9000, display:'flex', justifyContent:'center', alignItems:'center' }}>
          <div style={{ background:'white', width:850, maxHeight:'90vh', borderRadius:16, display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <div style={{ padding:'20px 30px', background:'#f8fafc', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h3 style={{ margin:0, color:'#1e293b' }}><i className="fas fa-edit"></i> 배포 리포트 사후 관리</h3>
              <button onClick={closeEditModal} style={{ background:'none', border:'none', fontSize:24, cursor:'pointer', color:'#64748b' }}>&times;</button>
            </div>
            
            <div style={{ padding:30, overflowY:'auto', flex:1 }}>
              <div style={{ display:'grid', gridTemplateColumns:'180px 1fr', gap:10, marginBottom:25 }}>
                <div>
                  <label style={{ fontSize:12, fontWeight:'bold', color:'#64748b', display:'block', marginBottom:5 }}>발행일</label>
                  <input type="date" value={editPublishDate} onChange={e => setEditPublishDate(e.target.value)} style={{ fontWeight:'bold', fontSize:16, color:'#3b82f6', width:'100%', padding:10, borderRadius:8, border:'1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ fontSize:12, fontWeight:'bold', color:'#64748b', display:'block', marginBottom:5 }}>리포트 호수명</label>
                  <input type="text" value={editIssueName} onChange={e => setEditIssueName(e.target.value)} style={{ fontWeight:'bold', fontSize:16, color:'#3b82f6', width:'100%', padding:10, borderRadius:8, border:'1px solid #cbd5e1' }} />
                </div>
              </div>
              
              <div style={{ background:'#f8fafc', padding:20, borderRadius:12, border:'1px solid #e2e8f0', marginBottom:25 }}>
                <div style={{ display:'flex', gap:10 }}>
                  <div style={{ flex:1 }}>
                    <label style={{ fontSize:12, fontWeight:'bold', color:'#64748b', display:'block', marginBottom:5 }}>메일 발송용 (숏츠/릴스)</label>
                    <select value={editSelCampaign} onChange={e => setEditSelCampaign(e.target.value)} style={{ width:'100%', padding:10, fontWeight:'bold', borderRadius:8, border:'1px solid #cbd5e1', background:'white' }}>
                      <option value="">보안 캠페인 배너 선택 안 함 (없음)</option>
                      {campaigns.map(c => <option key={c.id} value={c.id}>{c.title || c.name || '영상'}</option>)}
                    </select>
                  </div>
                  <div style={{ flex:1 }}>
                    <label style={{ fontSize:12, fontWeight:'bold', color:'#64748b', display:'block', marginBottom:5 }}>웹 매거진용 (보안 배너)</label>
                    <select value={editSelSecurity} onChange={e => setEditSelSecurity(e.target.value)} style={{ width:'100%', padding:10, fontWeight:'bold', borderRadius:8, border:'1px solid #cbd5e1', background:'white' }}>
                      <option value="">보안 캠페인 배너 선택 안 함 (없음)</option>
                      {secBanners.map(c => <option key={c.id} value={c.url}>{c.name || '배너'}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ background:'#fefce8', border:'1px solid #fef08a', padding:20, borderRadius:12, marginBottom:25 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:15 }}>
                  <div style={{ fontSize:13, fontWeight:'bold', color:'#a16207' }}><i className="fab fa-youtube"></i> 메인 유튜브 정보 교체</div>
                  <button className="btn" onClick={fetchEditYoutubeMeta} style={{ background:'#f59e0b', color:'white', fontSize:11, padding:'4px 12px' }}>정보 불러오기</button>
                </div>
                <input type="text" value={editVideo.url} onChange={e => setEditVideo({...editVideo, url: e.target.value})} placeholder="유튜브 링크 URL" style={{ marginBottom:10, width:'100%', padding:10, borderRadius:8, border:'1px solid #fcd34d' }} />
                <div style={{ display:'grid', gridTemplateColumns: '1fr 1fr', gap:10, marginBottom:10 }}>
                  <input type="text" value={editVideo.title} onChange={e => setEditVideo({...editVideo, title: e.target.value})} placeholder="영상 제목" style={{ padding:10, borderRadius:8, border:'1px solid #fcd34d' }} />
                  <input type="text" value={editVideo.source} onChange={e => setEditVideo({...editVideo, source: e.target.value})} placeholder="채널명" style={{ padding:10, borderRadius:8, border:'1px solid #fcd34d' }} />
                </div>
                <input type="text" value={editVideo.desc} onChange={e => setEditVideo({...editVideo, desc: e.target.value})} placeholder="영상 코멘트" style={{ width:'100%', padding:10, borderRadius:8, border:'1px solid #fcd34d' }} />
              </div>

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:10 }}>
                <label style={{ fontSize:12, fontWeight:'bold', color:'#64748b' }}>현재 수록된 기사 관리 (중요 뱃지 ON/OFF)</label>
                <span style={{ fontSize:11, color:'#ef4444', fontWeight:'bold' }}>*중요 기사는 최대 3개까지만 체크 가능</span>
              </div>
              
              <div style={{ marginBottom:25, border:'1px solid #e2e8f0', borderRadius:8, overflow:'hidden' }}>
                {editArticles.length === 0 ? (
                  <div style={{ padding:20, textAlign:'center', color:'#94a3b8' }}>수록된 기사가 없습니다.</div>
                ) : editArticles.map((art, idx) => (
                  <div key={idx} style={{ padding:'15px', borderBottom:'1px solid #e2e8f0', display:'flex', gap:15, alignItems:'center', background: idx % 2 === 0 ? '#f8fafc' : 'white' }}>
                    <select value={art.category || 'auto'} onChange={e => changeEditCategory(idx, e.target.value)} style={{ width:100, padding:'6px', fontSize:11, fontWeight:'bold', borderRadius:6, border:'1px solid #cbd5e1', background:'white', cursor:'pointer', flexShrink:0 }}>
                      {CATEGORY_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <div style={{ flex:1, display:'flex', gap:8, minWidth:0 }}>
                      <input value={art.brand || ''} onChange={e => { const updated = [...editArticles]; updated[idx].brand = e.target.value; setEditArticles(updated); }} placeholder="기업" style={{ width:80, padding:'6px 10px', fontSize:12, borderRadius:6, border:'1px solid #e2e8f0', flexShrink:0 }} />
                      <input value={art.title || ''} onChange={e => { const updated = [...editArticles]; updated[idx].title = e.target.value; setEditArticles(updated); }} placeholder="기사 제목을 입력하세요" style={{ flex:1, padding:'6px 10px', fontSize:13, borderRadius:6, border:'1px solid #e2e8f0', fontWeight:'bold' }} />
                    </div>
                    <div style={{ width:180, display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
                      <div style={{ width:44, height:32, border:'1px solid #cbd5e1', borderRadius:6, overflow:'hidden', background:'#e2e8f0' }}>
                        <img src={normalizeImageUrl(art.img, { fallback: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=300' })} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=300'; }} />
                      </div>
                      <input value={art.img || ''} onChange={e => changeEditArticle(idx, 'img', e.target.value)} placeholder="이미지 URL" style={{ width:120, padding:'6px 8px', fontSize:11, borderRadius:6, border:'1px solid #cbd5e1' }} />
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
                      <label style={{ fontSize:12, fontWeight:'bold', cursor:'pointer', color: art.isImportant ? '#ef4444' : '#64748b', display:'flex', alignItems:'center', gap:4 }}>
                        <input type="checkbox" checked={art.isImportant} onChange={() => toggleEditImportant(idx)} style={{ width:15, height:15 }} />⭐중요
                      </label>
                      <button onClick={() => removeEditArticle(idx)} style={{ background:'none', border:'none', color:'#ef4444', fontSize:12, fontWeight:'bold', cursor:'pointer', padding:'5px 10px' }}>기사 삭제</button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background:'#eff6ff', padding:20, borderRadius:12, border:'1px solid #bfdbfe' }}>
                <div style={{ fontSize:13, fontWeight:'bold', color:'#1d4ed8', marginBottom:15 }}><i className="fas fa-plus-circle"></i> 누락된 기사 수동 추가</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                  <select value={newArtCat} onChange={e => setNewArtCat(e.target.value)} style={{ fontWeight:'bold', padding:10, borderRadius:8, border:'1px solid #cbd5e1' }}>
                    {CATEGORY_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <input type="text" value={newArtBrand} onChange={e => setNewArtBrand(e.target.value)} placeholder="관련 기업명 (예: 엔카)" style={{ padding:10, borderRadius:8, border:'1px solid #cbd5e1' }} />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                  <input type="text" value={newArtTitle} onChange={e => setNewArtTitle(e.target.value)} placeholder="기사 제목" style={{ padding:10, borderRadius:8, border:'1px solid #cbd5e1' }} />
                  <input type="text" value={newArtSource} onChange={e => setNewArtSource(e.target.value)} placeholder="언론사 (예: 전자신문)" style={{ padding:10, borderRadius:8, border:'1px solid #cbd5e1' }} />
                </div>
                <input type="text" value={newArtLink} onChange={e => setNewArtLink(e.target.value)} placeholder="원본 뉴스 링크" style={{ marginBottom:10, padding:10, borderRadius:8, border:'1px solid #cbd5e1', width:'100%' }} />
                <input type="text" value={newArtImg} onChange={e => setNewArtImg(e.target.value)} placeholder="썸네일 이미지 URL (선택사항)" style={{ marginBottom:10, padding:10, borderRadius:8, border:'1px solid #cbd5e1', width:'100%' }} />
                <textarea value={newArtDesc} onChange={e => setNewArtDesc(e.target.value)} rows="2" placeholder="기사 요약 내용" style={{ marginBottom:10, width:'100%', borderRadius:8, border:'1px solid #cbd5e1', padding:10, fontFamily:'inherit' }}></textarea>
                <textarea value={newArtInsight} onChange={e => setNewArtInsight(e.target.value)} rows="2" placeholder="R&D 인사이트" style={{ marginBottom:15, width:'100%', borderRadius:8, border:'1px solid #cbd5e1', padding:10, fontFamily:'inherit' }}></textarea>
                <label style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, fontWeight:'bold', marginBottom:15, cursor:'pointer' }}>
                  <input type="checkbox" checked={newArtImportant} onChange={e => setNewArtImportant(e.target.checked)} style={{ width:14, height:14 }} /> ⭐ 이 기사에 '중요(HOT)' 뱃지 달기
                </label>
                <button className="btn btn-primary" style={{ width:'100%' }} onClick={addNewArticleToEdit}>이 리포트에 기사 추가하기</button>
              </div>
            </div>

            <div style={{ padding:'20px 30px', background:'#f8fafc', borderTop:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <button className="btn btn-danger" style={{ background:'#ef4444', color:'white' }} onClick={deleteEntireReport}><i className="fas fa-trash"></i> 리포트 전체 삭제</button>
              <div style={{ display:'flex', gap:10 }}>
                <button className="btn btn-dark" style={{ background:'#64748b' }} onClick={closeEditModal}>취소</button>
                <button className="btn btn-primary" onClick={saveEditingReport}><i className="fas fa-save"></i> 변경사항 최종 서버 반영</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <MagazineWebPreview
        open={showWebPreview}
        onClose={() => { setShowWebPreview(false); setPastPreviewReport(null); }}
        modeLabel={pastPreviewReport ? '과거 리포트 미리보기' : '미리보기 모드'}
        title={pastPreviewReport ? `[과거 리포트] ${pastPreviewReport.issueName}` : `[배포 예정] ${issueName || '미지정 호수'}`}
        articlesSource={pastPreviewReport ? pastPreviewReport.articles : allDrafts}
        video={pastPreviewReport ? pastPreviewReport.video : video}
      />

      {emailSendPlan && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.78)', zIndex:10000, display:'flex', justifyContent:'center', alignItems:'center', padding:18 }}>
          <div style={{ width:'min(1040px, 96vw)', maxHeight:'90vh', background:'#f8fafc', borderRadius:18, overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 24px 70px rgba(0,0,0,0.32)' }}>
            <div style={{ padding:'18px 22px', background:'white', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center', gap:16 }}>
              <div>
                <h3 style={{ margin:0, fontSize:18, color:'#0f172a' }}><i className="fas fa-paper-plane" style={{ color:'#2563eb', marginRight:8 }} />뉴스레터 발송 계획</h3>
                <p style={{ margin:'6px 0 0', color:'#64748b', fontSize:12, fontWeight:800 }}>{emailSendPlan.mag.issueName || '미지정 호수'} · 관심 카테고리별로 다른 본문을 전송합니다.</p>
              </div>
              <button onClick={() => !sendingEmail && clearEmailSendPlan()} disabled={sendingEmail} style={{ border:'none', background:'#e2e8f0', color:'#475569', borderRadius:8, padding:'8px 14px', fontWeight:900, cursor:'pointer' }}>닫기</button>
            </div>

            <div style={{ padding:22, overflow:'auto' }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(145px, 1fr))', gap:12, marginBottom:16 }}>
                <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:12, padding:16 }}>
                  <div style={{ color:'#94a3b8', fontSize:11, fontWeight:900, marginBottom:6 }}>전체 구독자</div>
                  <div style={{ color:'#0f172a', fontSize:28, fontWeight:900 }}>{emailSendPlan.totalSubscribers}</div>
                </div>
                <div style={{ background:'white', border:'1px solid #bfdbfe', borderRadius:12, padding:16 }}>
                  <div style={{ color:'#2563eb', fontSize:11, fontWeight:900, marginBottom:6 }}>선택 가능</div>
                  <div style={{ color:'#1d4ed8', fontSize:28, fontWeight:900 }}>{emailSendPlan.deliverableCount}</div>
                </div>
                <div style={{ background:'white', border:'1px solid #ddd6fe', borderRadius:12, padding:16 }}>
                  <div style={{ color:'#7c3aed', fontSize:11, fontWeight:900, marginBottom:6 }}>선택 대상</div>
                  <div style={{ color:'#6d28d9', fontSize:28, fontWeight:900 }}>{selectedEmailCount}</div>
                </div>
                <div style={{ background:'white', border:'1px solid #ddd6fe', borderRadius:12, padding:16 }}>
                  <div style={{ color:'#7c3aed', fontSize:11, fontWeight:900, marginBottom:6 }}>발송 그룹</div>
                  <div style={{ color:'#6d28d9', fontSize:28, fontWeight:900 }}>{emailSendPlan.groups.length}</div>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:12, marginBottom:16 }}>
                <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:12, padding:16, color:'#64748b', fontSize:12, fontWeight:800, lineHeight:1.7 }}>
                  <strong style={{ color:'#0f172a' }}>제외 내역</strong><br />
                  비활성 {emailSendPlan.inactiveCount}명 · 이메일 오류 {emailSendPlan.invalidEmailCount}명 · 중복 {emailSendPlan.duplicateCount}명 · 받을 기사 없음 {emailSendPlan.skippedNoContentCount}명
                </div>
                <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:12, padding:16, color:'#64748b', fontSize:12, fontWeight:800, lineHeight:1.7 }}>
                  <strong style={{ color:'#0f172a' }}>발송 방식</strong><br />
                  Apps Script에 그룹별 요청을 보냅니다. 보안 캠페인은 보안 관심 그룹에만 포함됩니다.
                </div>
              </div>

              <div style={{ background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:12, padding:16, marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                <div style={{ color:'#9a3412', fontSize:12, fontWeight:900, lineHeight:1.6 }}>
                  기본 선택은 0명입니다. 테스트 발송은 본인 이메일만 체크한 뒤 요청하세요.
                </div>
                <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                  <button
                    type="button"
                    onClick={() => setRecipientSelection(emailSendPlan.groups.flatMap(group => group.emails), true)}
                    disabled={sendingEmail}
                    style={{ border:'none', background:'#0f172a', color:'white', borderRadius:8, padding:'9px 12px', fontSize:12, fontWeight:900, cursor:'pointer' }}
                  >
                    전체 선택
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedEmailMap({})}
                    disabled={sendingEmail}
                    style={{ border:'none', background:'#e2e8f0', color:'#334155', borderRadius:8, padding:'9px 12px', fontSize:12, fontWeight:900, cursor:'pointer' }}
                  >
                    전체 해제
                  </button>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:12 }}>
                {emailSendPlan.groups.map(group => {
                  const selectedInGroup = group.emails.filter(email => selectedEmailMap[email]).length;
                  const isAllSelected = selectedInGroup === group.emails.length && group.emails.length > 0;

                  return (
                    <section key={group.key} style={{ background:'white', border:`1px solid ${selectedInGroup ? '#bfdbfe' : '#e2e8f0'}`, borderRadius:14, overflow:'hidden', boxShadow:selectedInGroup ? '0 12px 30px rgba(37,99,235,0.10)' : 'none' }}>
                      <div style={{ padding:'14px 16px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
                        <div style={{ minWidth:0 }}>
                          <h4 style={{ margin:0, color:'#0f172a', fontSize:15, fontWeight:900, lineHeight:1.35 }}>{group.label}</h4>
                          <p style={{ margin:'6px 0 0', color:'#64748b', fontSize:12, fontWeight:800 }}>
                            기사 {group.articleCount}건 · {group.includesSecurity ? '보안 캠페인 포함' : '캠페인 없음'}
                          </p>
                        </div>
                        <span style={{ flexShrink:0, background:selectedInGroup ? '#2563eb' : '#e2e8f0', color:selectedInGroup ? 'white' : '#475569', borderRadius:999, padding:'5px 9px', fontSize:12, fontWeight:900 }}>
                          {selectedInGroup}/{group.emails.length}명
                        </span>
                      </div>

                      <div style={{ padding:'10px 16px', background:'#f8fafc', borderBottom:'1px solid #e2e8f0', display:'flex', gap:8 }}>
                        <button
                          type="button"
                          onClick={() => setRecipientSelection(group.emails, true)}
                          disabled={sendingEmail || isAllSelected}
                          style={{ flex:1, border:'none', background:isAllSelected ? '#dbeafe' : '#eff6ff', color:'#2563eb', borderRadius:8, padding:'8px 10px', fontSize:12, fontWeight:900, cursor:isAllSelected ? 'default' : 'pointer', opacity:isAllSelected ? 0.7 : 1 }}
                        >
                          그룹 선택
                        </button>
                        <button
                          type="button"
                          onClick={() => setRecipientSelection(group.emails, false)}
                          disabled={sendingEmail || selectedInGroup === 0}
                          style={{ flex:1, border:'none', background:'#f1f5f9', color:'#475569', borderRadius:8, padding:'8px 10px', fontSize:12, fontWeight:900, cursor:selectedInGroup === 0 ? 'default' : 'pointer', opacity:selectedInGroup === 0 ? 0.55 : 1 }}
                        >
                          해제
                        </button>
                      </div>

                      <div style={{ padding:12, maxHeight:210, overflowY:'auto', display:'grid', gap:7 }}>
                        {group.emails.map(email => {
                          const selected = !!selectedEmailMap[email];
                          return (
                            <label key={email} style={{ display:'flex', alignItems:'center', gap:9, background:selected ? '#eff6ff' : '#f8fafc', border:`1px solid ${selected ? '#bfdbfe' : '#e2e8f0'}`, borderRadius:9, padding:'9px 10px', color:'#334155', fontSize:12, fontWeight:800, cursor:sendingEmail ? 'not-allowed' : 'pointer', minWidth:0 }}>
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleRecipientEmail(email)}
                                disabled={sendingEmail}
                                style={{ width:16, height:16, flexShrink:0, accentColor:'#2563eb' }}
                              />
                              <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', minWidth:0 }}>{email}</span>
                            </label>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>

              <div style={{ marginTop:18, display:'flex', justifyContent:'flex-end', gap:10 }}>
                <button type="button" className="btn" onClick={clearEmailSendPlan} disabled={sendingEmail} style={{ background:'#e2e8f0', color:'#334155', fontWeight:900 }}>취소</button>
                <button type="button" className="btn btn-success" onClick={confirmSendEmail} disabled={sendingEmail || selectedEmailCount === 0} style={{ minWidth:220, fontWeight:900, opacity:selectedEmailCount === 0 ? 0.55 : 1 }}>
                  {sendingEmail ? <><i className="fas fa-circle-notch fa-spin" /> 발송 요청 중...</> : <><i className="fas fa-paper-plane" /> 선택한 {selectedEmailCount}명에게 발송 요청</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {emailPreview && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.86)', zIndex:10000, display:'flex', justifyContent:'center', alignItems:'center' }}>
          <div style={{ width:'min(900px, 92vw)', height:'90vh', background:'#f8fafc', borderRadius:16, overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 24px 60px rgba(0,0,0,0.35)' }}>
            <div style={{ padding:'14px 20px', background:'white', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h3 style={{ margin:0, fontSize:16, color:'#1e293b' }}>{emailPreview.title}</h3>
              <button onClick={() => setEmailPreview(null)} style={{ border:'none', background:'#0f172a', color:'white', borderRadius:8, padding:'8px 16px', fontWeight:900, cursor:'pointer' }}>닫기</button>
            </div>
            <iframe
              title={emailPreview.title}
              srcDoc={`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${emailPreview.title}</title></head><body style="margin:0; background-color:#f4f6f8;">${emailPreview.html}</body></html>`}
              style={{ flex:1, border:0, width:'100%', background:'#f4f6f8' }}
            />
          </div>
        </div>
      )}

      {/* Legacy inline preview kept disabled while the shared component is active. */}
      {false && showWebPreview && (
        <div style={{ position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(15,23,42,0.9)', zIndex:9999, display:'flex', justifyContent:'center', alignItems:'center' }}>
          <div style={{ background:'#f1f5f9', width:'90%', height:'90%', borderRadius:20, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>
            <div style={{ padding:'15px 30px', background:'white', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ background:'#ef4444', color:'white', padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:900 }}>미리보기 모드</span>
                <h3 style={{ margin:0, color:'#1e293b' }}>
                  {pastPreviewReport ? `[과거 리포트] ${pastPreviewReport.issueName}` : `[배포 예정] ${issueName || '미지정 호수'}`}
                </h3>
              </div>
              <button onClick={() => { setShowWebPreview(false); setPastPreviewReport(null); }} style={{ background:'#0f172a', color:'white', border:'none', padding:'8px 20px', borderRadius:8, fontWeight:'bold', cursor:'pointer' }}>닫기</button>
            </div>
            
            <div style={{ padding:40, overflowY:'auto', flex:1 }}>
              {/* Actual Magazine Layout Simulation */}
              {(() => {
                const sourceData = pastPreviewReport ? pastPreviewReport.articles : allDrafts;
                const sourceVideo = pastPreviewReport ? pastPreviewReport.video : video;
                const sourceMain = Array.isArray(sourceData) ? sourceData.find(a => a.category === 'main') : sourceData.main;
                const currentSecurityBanner = pastPreviewReport ? (pastPreviewReport.webCampaign || pastPreviewReport.campaign?.securityImg) : selSecurity;

                const getCat = (cat) => Array.isArray(sourceData) ? sourceData.filter(a => a.category === cat) : (sourceData[cat] || []);

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
                            <img src={normalizeImageUrl(sourceMain.img, { fallback: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=800' })} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
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
                                <img src={normalizeImageUrl(currentSecurityBanner, { fallback: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400' })} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                                <div style={{ position:'absolute', bottom:20, left:20, background:'rgba(0,0,0,0.8)', color:'white', padding:'5px 12px', borderRadius:6, fontSize:11, fontWeight:900 }}>🚨 보안 캠페인</div>
                              </div>
                            )}
                            {articles.map((a, i) => (
                              <div key={i} style={{ background:'white', borderRadius:20, border:'1px solid #e2e8f0', overflow:'hidden', display:'flex', flexDirection:'column' }}>
                                <div style={{ width:'100%', aspectRatio:'16/10' }}>
                                  <img src={normalizeImageUrl(a.img, { fallback: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400' })} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
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
