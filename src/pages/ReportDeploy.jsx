import React, { useState, useEffect } from 'react';
import { getAllMagazines, saveMagazine, deleteMagazine, getAllSubscribers, getCampaigns, getSecurityBanners } from '../services/dataService';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';
import { getPremiumNewsletterHTML } from '../utils/newsletterTemplate';

export default function ReportDeploy({ draftArticles, setDraftArticles }) {
  const [history, setHistory] = useState([]);
  const [issueName, setIssueName] = useState('');
  const [campaigns, setCampaigns] = useState([]);
  const [secBanners, setSecBanners] = useState([]);
  const [selCampaign, setSelCampaign] = useState('');
  const [selSecurity, setSelSecurity] = useState('');
  const [video, setVideo] = useState({ url: '', title: '', source: '', desc: '' });
  const [deploying, setDeploying] = useState(false);

  // Edit Modal State
  const [editingReport, setEditingReport] = useState(null);
  const [editArticles, setEditArticles] = useState([]);
  const [editIssueName, setEditIssueName] = useState('');
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

  const fetchData = async () => {
    const [mags, camps, secs] = await Promise.all([getAllMagazines(), getCampaigns(), getSecurityBanners()]);
    setHistory(mags); setCampaigns(camps); setSecBanners(secs);
  };
  const load = async () => {
    const [mags, camps, secs] = await Promise.all([getAllMagazines(), getCampaigns(), getSecurityBanners()]);
    setHistory(mags); setCampaigns(camps); setSecBanners(secs);
  };
  useEffect(() => { load(); }, []);

  const allDrafts = [...(draftArticles.main ? [draftArticles.main] : []), ...draftArticles.macro, ...draftArticles.platform, ...draftArticles.auto, ...draftArticles.ai, ...draftArticles.security];

  const deploy = async () => {
    if (!issueName) return alert('호수를 입력하세요.');
    if (allDrafts.length === 0) return alert('배포할 기사가 없습니다.');
    setDeploying(true);
    try {
      const docId = new Date().toISOString().split('T')[0];
      const campaignData = selCampaign ? campaigns.find(v => v.id === selCampaign) || null : null;
      await saveMagazine(docId, { issueName, publishDate: new Date().toISOString(), articles: allDrafts, video, campaign: campaignData, webCampaign: selSecurity });
      alert('서버에 배포되었습니다.');
      setDraftArticles({ main: null, macro: [], platform: [], auto: [], ai: [], security: [] });
      setIssueName(''); setVideo({ url:'', title:'', source:'', desc:'' }); load();
    } catch (e) { alert('배포 실패: ' + e.message); }
    finally { setDeploying(false); }
  };

  const deleteReport = async (docId) => {
    if (!window.confirm('⚠️ 삭제하시겠습니까?')) return;
    await deleteMagazine(docId); alert('삭제되었습니다.'); load();
  };

  const sendEmail = async (mag) => {
    const gmailUser = localStorage.getItem('GMAIL_USER');
    const gmailPass = localStorage.getItem('GMAIL_PASS');
    if (!gmailUser || !gmailPass) return alert('Gmail 계정이 설정되지 않았습니다. API 관리 탭에서 설정해주세요.');
    if (!window.confirm('모든 구독자에게 발송하시겠습니까?')) return;
    try {
      const subs = await getAllSubscribers();
      const emails = subs.map(s => s.email);
      if (emails.length === 0) return alert('구독자가 없습니다.');
      const htmlContent = getPremiumNewsletterHTML(mag.issueName || '', new Date().toLocaleDateString('ko-KR').replace(/\. /g, '.').replace(/\.$/, ''), mag.campaign || mag.webCampaign, mag.articles);
      const response = await fetch('/.netlify/functions/send-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: emails.join(','), subject: `[OASIS R&D] 오늘의 모빌리티 딥다이브 - ISSUE ${mag.issueName}`, html: htmlContent, gmailUser, gmailPass })
      });
      if (!response.ok) throw new Error((await response.json()).error);
      alert(`🎉 ${emails.length}명에게 발송 완료!`);
    } catch (e) { alert('발송 실패: ' + e.message); }
  };

  const previewCurrentDrafts = () => {
    if (allDrafts.length === 0) return alert('배포할 기사가 없습니다.');
    const campaignData = selCampaign ? campaigns.find(v => v.id === selCampaign) || null : null;
    const htmlContent = getPremiumNewsletterHTML(issueName || '임시 호수', new Date().toLocaleDateString('ko-KR').replace(/\. /g, '.').replace(/\.$/, ''), campaignData || selSecurity, draftArticles);
    
    const viewer = window.open('', '_blank', 'width=800,height=1000,scrollbars=yes');
    viewer.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>뉴스레터 미리보기</title></head><body style="margin:0; background-color: #f4f6f8;">' + htmlContent + '</body></html>');
    viewer.document.close();
  };

  const previewPastReport = (mag) => {
    const htmlContent = getPremiumNewsletterHTML(mag.issueName || '', new Date(mag.publishDate || mag.id).toLocaleDateString('ko-KR').replace(/\. /g, '.').replace(/\.$/, ''), mag.campaign || mag.webCampaign, mag.articles);
    const viewer = window.open('', '_blank', 'width=800,height=1000,scrollbars=yes');
    viewer.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>과거 리포트 미리보기 - ' + mag.issueName + '</title></head><body style="margin:0; background-color: #f4f6f8;">' + htmlContent + '</body></html>');
    viewer.document.close();
  };

  const sendCurrentDrafts = async () => {
    if (allDrafts.length === 0) return alert('배포할 기사가 없습니다. 최종 발행 후 메일을 발송하는 것을 권장합니다.');
    const mag = { issueName: issueName || '임시 호수', articles: draftArticles, campaign: selCampaign ? campaigns.find(v => v.id === selCampaign) : null, webCampaign: selSecurity, video };
    await sendEmail(mag);
  };

  const exportPdf = () => {
    const element = document.getElementById('history-container');
    if(!element) return;
    html2pdf().set({ margin: 1, filename: `OASIS_History.pdf`, jsPDF: { format: 'letter', orientation: 'portrait' } }).from(element).save();
  };

  const openEditModal = (mag) => {
    setEditingReport(mag);
    setEditArticles([...(mag.articles || [])]);
    setEditIssueName(mag.issueName || '');
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
    const updated = [...editArticles];
    updated[idx].category = newCat;
    setEditArticles(updated);
  };

  const fetchEditYoutubeMeta = async () => {
    if(!editVideo.url.trim()) return alert("유튜브 링크 URL을 먼저 입력해주세요!");
    try {
      const response = await fetch(`https://noembed.com/embed?url=${editVideo.url}`);
      const data = await response.json();
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
    
    setEditArticles([...editArticles, { 
      category: newArtCat, brand: newArtBrand || '오아시스', title: newArtTitle, link: newArtLink, desc: newArtDesc, insight: newArtInsight, source: newArtSource || '자체 보도', img: newArtImg, isImportant: newArtImportant 
    }]);
    setNewArtTitle(''); setNewArtLink(''); setNewArtSource(''); setNewArtImg(''); setNewArtDesc(''); setNewArtInsight(''); setNewArtImportant(false);
  };

  const saveEditingReport = async () => {
    if(!editIssueName) return alert("호수명은 필수입니다.");
    const campaignData = editSelCampaign ? campaigns.find(v => v.id === editSelCampaign) || { securityImg: editSelCampaign } : null;
    try {
      await saveMagazine(editingReport.id, { 
        ...editingReport, 
        issueName: editIssueName, 
        articles: editArticles, 
        campaign: campaignData, 
        webCampaign: editSelSecurity,
        video: editVideo
      });
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
    let rows = [];
    history.forEach(m => { if (m.articles) m.articles.forEach(a => rows.push({ '발행 호수': m.issueName, '카테고리': a.category, '관련 기업': a.brand, '기사 제목': a.title, '인사이트': a.insight, '원문 링크': a.link })); });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `OASIS_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div><h2>🚀 리포트 배포 및 데이터 추출</h2></div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn" style={{ background:'#75b5ee', color:'white', fontWeight:'bold' }} onClick={sendCurrentDrafts}><i className="fas fa-paper-plane"></i> 뉴스레터 자동 복사 및 발송</button>
          <button className="btn" style={{ background:'#107c41', color:'white' }} onClick={exportExcel}><i className="fas fa-file-excel"></i> Excel</button>
          <button className="btn btn-danger" onClick={exportPdf}><i className="fas fa-file-pdf"></i> PDF</button>
        </div>
      </div>

      {/* Deploy Section */}
      <div className="card" style={{ border:'2px solid #10b981', background:'#f0fdf4', marginBottom:25 }}>
        <div className="card-title" style={{ color:'#75b5ee' }}><i className="fas fa-cloud-upload-alt"></i> 클라우드 DB 최종 발행</div>
        <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:15 }}>
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
        <div style={{ background:'#fefce8', border:'1px solid #fef08a', padding:20, borderRadius:12, marginBottom:20 }}>
          <div style={{ fontSize:13, fontWeight:'bold', color:'#a16207', marginBottom:12 }}><i className="fab fa-youtube"></i> 메거진 메인 유튜브 자동 세팅</div>
          <div style={{ display:'flex', gap:10, marginBottom:10 }}>
            <input value={video.url} onChange={e => setVideo({...video, url:e.target.value})} placeholder="유튜브 링크 URL" style={{ flex:1, padding:10, borderRadius:8, border:'1px solid #fcd34d' }} />
            <button className="btn" onClick={async () => {
              if(!video.url) return alert("URL을 입력하세요.");
              try {
                const res = await fetch(`https://noembed.com/embed?url=${video.url}`);
                const data = await res.json();
                setVideo({...video, title:data.title||'', source:data.author_name||'', desc:data.title||''});
              } catch(e) { alert("불러오기 실패"); }
            }} style={{ background:'#f59e0b', color:'white', fontWeight:'bold', width:120 }}>정보 불러오기</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
            <input value={video.title} onChange={e => setVideo({...video, title:e.target.value})} placeholder="영상 제목" style={{ padding:10, borderRadius:8, border:'1px solid #fcd34d' }} />
            <input value={video.source} onChange={e => setVideo({...video, source:e.target.value})} placeholder="채널명" style={{ padding:10, borderRadius:8, border:'1px solid #fcd34d' }} />
            <input value={video.desc} onChange={e => setVideo({...video, desc:e.target.value})} placeholder="영상 코멘트" style={{ padding:10, borderRadius:8, border:'1px solid #fcd34d' }} />
          </div>
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
      </div>

      {/* History */}
      <div className="card-title" style={{ marginTop:30 }}>📚 지난 리포트 DB</div>
      <div className="card" id="history-container" style={{ padding:0, overflow:'hidden' }}>
        <table>
          <thead><tr><th>발행일</th><th>리포트 호수</th><th>수록 기사수</th><th>상태</th><th style={{ width:200 }}>관리</th></tr></thead>
          <tbody>
            {history.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign:'center', padding:30, color:'#94a3b8' }}>발행된 리포트가 없습니다.</td></tr>
            ) : history.map(m => (
              <tr key={m.id}>
                <td>{m.id}</td>
                <td><b>{m.issueName}</b></td>
                <td>{m.articles?.length || 0}건</td>
                <td><span style={{ color:'#10b981', fontWeight:'bold' }}>배포완료</span></td>
                <td>
                  <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                    <button className="btn btn-primary" style={{ background:'#3b82f6', padding:'6px 12px', fontSize:11, width:'100%' }} onClick={() => previewPastReport(m)}><i className="fas fa-eye"></i> 미리보기</button>
                    <div style={{ display:'flex', gap:5 }}>
                      <button className="btn btn-success" style={{ padding:'6px 12px', fontSize:11, flex:1 }} onClick={() => sendEmail(m)}>발송</button>
                      <button className="btn" style={{ background:'#f1f5f9', color:'#3b82f6', padding:'6px 12px', fontSize:11, flex:1 }} onClick={() => openEditModal(m)}>관리</button>
                    </div>
                    <button className="btn btn-danger" style={{ padding:'6px 12px', fontSize:11, width:'100%', background:'#fef2f2', color:'#ef4444', borderColor:'#fecaca' }} onClick={() => deleteReport(m.id)}>삭제</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingReport && (
        <div style={{ position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(15,23,42,0.85)', zIndex:9000, display:'flex', justifyContent:'center', alignItems:'center' }}>
          <div style={{ background:'white', width:850, maxHeight:'90vh', borderRadius:16, display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <div style={{ padding:'20px 30px', background:'#f8fafc', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h3 style={{ margin:0, color:'#1e293b' }}><i className="fas fa-edit"></i> 배포 리포트 사후 관리</h3>
              <button onClick={closeEditModal} style={{ background:'none', border:'none', fontSize:24, cursor:'pointer', color:'#64748b' }}>&times;</button>
            </div>
            
            <div style={{ padding:30, overflowY:'auto', flex:1 }}>
              <label style={{ fontSize:12, fontWeight:'bold', color:'#64748b' }}>리포트 호수명</label>
              <input type="text" value={editIssueName} onChange={e => setEditIssueName(e.target.value)} style={{ marginBottom:25, fontWeight:'bold', fontSize:16, color:'#3b82f6', width:'100%', padding:10, borderRadius:8, border:'1px solid #cbd5e1' }} />
              
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
                      <option value="main">🔥 1면</option>
                      <option value="macro">🌐 경제</option>
                      <option value="platform">🛒 비즈</option>
                      <option value="auto">🚗 산업</option>
                      <option value="ai">🤖 AI</option>
                      <option value="security">🛡️ 보안</option>
                    </select>
                    <div style={{ flex:1, display:'flex', gap:8, minWidth:0 }}>
                      <input value={art.brand || ''} onChange={e => { const updated = [...editArticles]; updated[idx].brand = e.target.value; setEditArticles(updated); }} placeholder="기업" style={{ width:80, padding:'6px 10px', fontSize:12, borderRadius:6, border:'1px solid #e2e8f0', flexShrink:0 }} />
                      <input value={art.title || ''} onChange={e => { const updated = [...editArticles]; updated[idx].title = e.target.value; setEditArticles(updated); }} placeholder="기사 제목을 입력하세요" style={{ flex:1, padding:'6px 10px', fontSize:13, borderRadius:6, border:'1px solid #e2e8f0', fontWeight:'bold' }} />
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
                      <label style={{ fontSize:12, fontWeight:'bold', cursor:'pointer', color: art.isImportant ? '#ef4444' : '#64748b', display:'flex', alignItems:'center', gap:4 }}>
                        <input type="checkbox" checked={art.isImportant} onChange={() => toggleEditImportant(idx)} style={{ width:15, height:15 }} />⭐중요
                      </label>
                      <button onClick={() => removeEditArticle(idx)} style={{ background:'none', border:'none', color:'#ef4444', fontSize:12, fontWeight:'bold', cursor:'pointer', padding:'5px 10px' }}>삭제</button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background:'#eff6ff', padding:20, borderRadius:12, border:'1px solid #bfdbfe' }}>
                <div style={{ fontSize:13, fontWeight:'bold', color:'#1d4ed8', marginBottom:15 }}><i className="fas fa-plus-circle"></i> 누락된 기사 수동 추가</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                  <select value={newArtCat} onChange={e => setNewArtCat(e.target.value)} style={{ fontWeight:'bold', padding:10, borderRadius:8, border:'1px solid #cbd5e1' }}>
                    <option value="main">🔥 FIRST DIVE (1면)</option>
                    <option value="macro">🌐 MACRO VIEW (경제)</option>
                    <option value="platform">🛒 BIZ & PLATFORM (비즈)</option>
                    <option value="auto">🚗 AUTO TRACK (산업)</option>
                    <option value="ai">🤖 AI STRATEGY (인공지능)</option>
                    <option value="security">🛡️ INFO-SECURE (보안)</option>
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

      {/* Web Preview Modal (New Magazine Preview) */}
      {showWebPreview && (
        <div style={{ position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(15,23,42,0.9)', zIndex:9999, display:'flex', justifyContent:'center', alignItems:'center' }}>
          <div style={{ background:'#f1f5f9', width:'90%', height:'90%', borderRadius:20, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>
            <div style={{ padding:'15px 30px', background:'white', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ background:'#ef4444', color:'white', padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:900 }}>미리보기 모드</span>
                <h3 style={{ margin:0, color:'#1e293b' }}>[배포 예정] {issueName || '미지정 호수'}</h3>
              </div>
              <button onClick={() => setShowWebPreview(false)} style={{ background:'#0f172a', color:'white', border:'none', padding:'8px 20px', borderRadius:8, fontWeight:'bold', cursor:'pointer' }}>닫기</button>
            </div>
            
            <div style={{ padding:40, overflowY:'auto', flex:1 }}>
              {[
                { key: 'main', label: '🔥 FIRST DIVE (1면)' },
                { key: 'macro', label: '🌐 MACRO VIEW' },
                { key: 'platform', label: '🛒 BIZ & PLATFORM' },
                { key: 'auto', label: '🚗 AUTO TRACK' },
                { key: 'ai', label: '🤖 AI STRATEGY' },
                { key: 'security', label: '🛡️ INFO-SECURE' }
              ].map(sec => {
                const articles = sec.key === 'main' ? (draftArticles.main ? [draftArticles.main] : []) : draftArticles[sec.key];
                if (articles.length === 0) return null;
                return (
                  <div key={sec.key} style={{ marginBottom:50 }}>
                    <div style={{ fontSize:20, fontWeight:900, color:'#1e293b', borderBottom:'3px solid #1e293b', paddingBottom:12, marginBottom:25 }}>{sec.label}</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:30 }}>
                      {sec.key === 'security' && selSecurity && (
                        <div style={{ background:'white', borderRadius:16, border:'1px solid #e2e8f0', overflow:'hidden', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.05)', position:'relative', minHeight:280 }}>
                          <div style={{ position:'absolute', top:16, left:16, background:'rgba(0,0,0,0.65)', color:'white', padding:'4px 10px', borderRadius:6, fontSize:11, fontWeight:900, zIndex:10, backdropFilter:'blur(4px)' }}>캠페인</div>
                          <img src={selSecurity} alt="Campaign" style={{ width:'100%', height:'100%', objectFit:'cover', position:'absolute', inset:0 }} />
                        </div>
                      )}
                      {articles.map((a, i) => (
                        <div key={i} style={{ background:'white', borderRadius:16, border:'1px solid #e2e8f0', overflow:'hidden', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                          <div style={{ width:'100%', aspectRatio:'16/9', background:'#f1f5f9' }}>
                            {a.img && <img src={a.img} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />}
                          </div>
                          <div style={{ padding:20 }}>
                            <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                              {a.isImportant && <span style={{ background:'#ef4444', color:'white', padding:'2px 8px', borderRadius:4, fontSize:10, fontWeight:900 }}>HOT</span>}
                              <span style={{ fontSize:11, fontWeight:800, color:'#3b82f6' }}>[{a.brand}]</span>
                            </div>
                            <div style={{ fontSize:16, fontWeight:900, color:'#1e293b', marginBottom:10, lineHeight:1.4 }}>{a.title}</div>
                            <div style={{ fontSize:13, color:'#64748b', lineHeight:1.6 }}>{a.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
