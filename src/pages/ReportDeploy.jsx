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
  const [deploying, setDeploying] = useState(false);

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
      await saveMagazine(docId, { issueName, publishDate: new Date().toISOString(), articles: allDrafts, video: {}, campaign: campaignData, webCampaign: selSecurity });
      alert('서버에 배포되었습니다.');
      setDraftArticles({ main: null, macro: [], platform: [], auto: [], ai: [], security: [] });
      setIssueName(''); load();
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
    const mag = { issueName: issueName || '임시 호수', articles: draftArticles, campaign: selCampaign ? campaigns.find(v => v.id === selCampaign) : null, webCampaign: selSecurity };
    await sendEmail(mag);
  };

  const exportPdf = () => {
    const element = document.getElementById('history-container');
    if(!element) return;
    html2pdf().set({ margin: 1, filename: `OASIS_History.pdf`, jsPDF: { format: 'letter', orientation: 'portrait' } }).from(element).save();
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
          <button className="btn" style={{ background:'#3b82f6', color:'white', fontWeight:'bold' }} onClick={previewCurrentDrafts}><i className="fas fa-search"></i> 메일 발송 미리보기</button>
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
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button className="btn btn-primary" onClick={previewCurrentDrafts} style={{ padding:'15px 30px', fontSize:16, background:'#3b82f6' }}><i className="fas fa-eye"></i> 1. 배포 전 미리보기</button>
          <button className="btn btn-dark" onClick={deploy} disabled={deploying} style={{ padding:'15px 30px', fontSize:16 }}>
            {deploying ? '배포 중...' : '🚀 2. 라이브 서버 배포'}
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
                      <button className="btn" style={{ background:'#f1f5f9', color:'#475569', padding:'6px 12px', fontSize:11, flex:1 }} onClick={() => alert('기사 관리 팝업(준비중)')}>관리</button>
                    </div>
                    <button className="btn btn-danger" style={{ padding:'6px 12px', fontSize:11, width:'100%', background:'#fef2f2', color:'#ef4444', borderColor:'#fecaca' }} onClick={() => deleteReport(m.id)}>삭제</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
