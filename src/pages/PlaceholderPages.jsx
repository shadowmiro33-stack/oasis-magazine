import React from 'react';

// Placeholder pages - 이후 admin.html에서 1:1 이식 예정
export function NewsCrawler() {
  return (
    <div className="animate-fade">
      <div className="page-header"><div><h2>🤖 뉴스 수집 및 AI 분석기</h2><p>Gemini 2.5 Flash 기반 심층 기사 분석</p></div></div>
      <div className="card" style={{ textAlign:'center', padding:60, color:'#94a3b8' }}>
        <i className="fas fa-robot" style={{ fontSize:48, marginBottom:15, display:'block' }}></i>
        <p style={{ fontSize:16, fontWeight:'bold' }}>Phase 2에서 마이그레이션 예정</p>
        <p style={{ fontSize:13, marginTop:5 }}>기존 admin.html의 AI 분석 + 기사 등록 + 대기열 기능이 이식됩니다.</p>
      </div>
    </div>
  );
}

export function ReportDeploy() {
  return (
    <div className="animate-fade">
      <div className="page-header"><div><h2>🚀 리포트 배포 및 데이터 추출</h2></div></div>
      <div className="card" style={{ textAlign:'center', padding:60, color:'#94a3b8' }}>
        <i className="fas fa-paper-plane" style={{ fontSize:48, marginBottom:15, display:'block' }}></i>
        <p style={{ fontSize:16, fontWeight:'bold' }}>Phase 2에서 마이그레이션 예정</p>
        <p style={{ fontSize:13, marginTop:5 }}>배포, 히스토리 관리, 편집 모달, 뉴스레터 발송 기능이 이식됩니다.</p>
      </div>
    </div>
  );
}

export function CompanyList() {
  return (
    <div className="animate-fade">
      <div className="page-header"><div><h2>🏢 모니터링 대상 업체 관리</h2></div></div>
      <div className="card" style={{ textAlign:'center', padding:60, color:'#94a3b8' }}>
        <i className="fas fa-building" style={{ fontSize:48, marginBottom:15, display:'block' }}></i>
        <p style={{ fontSize:16, fontWeight:'bold' }}>Phase 2에서 마이그레이션 예정</p>
      </div>
    </div>
  );
}

export function CampaignManager() {
  return (
    <div className="animate-fade">
      <div className="page-header"><div><h2>📱 숏츠 / 릴스 큐레이션 관리</h2></div></div>
      <div className="card" style={{ textAlign:'center', padding:60, color:'#94a3b8' }}>
        <i className="fas fa-mobile-alt" style={{ fontSize:48, marginBottom:15, display:'block' }}></i>
        <p style={{ fontSize:16, fontWeight:'bold' }}>Phase 2에서 마이그레이션 예정</p>
      </div>
    </div>
  );
}

export function SecurityBanner() {
  return (
    <div className="animate-fade">
      <div className="page-header"><div><h2>🛡️ 보안 캠페인 배너 관리</h2></div></div>
      <div className="card" style={{ textAlign:'center', padding:60, color:'#94a3b8' }}>
        <i className="fas fa-shield-alt" style={{ fontSize:48, marginBottom:15, display:'block' }}></i>
        <p style={{ fontSize:16, fontWeight:'bold' }}>Phase 2에서 마이그레이션 예정</p>
      </div>
    </div>
  );
}

export function Settings() {
  return (
    <div className="animate-fade">
      <div className="page-header"><div><h2>⚙️ 시스템 환경 및 테마 설정</h2></div></div>
      <div className="card" style={{ textAlign:'center', padding:60, color:'#94a3b8' }}>
        <i className="fas fa-cog" style={{ fontSize:48, marginBottom:15, display:'block' }}></i>
        <p style={{ fontSize:16, fontWeight:'bold' }}>Phase 2에서 마이그레이션 예정</p>
      </div>
    </div>
  );
}
