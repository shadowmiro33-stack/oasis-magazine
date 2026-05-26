import React, { Suspense, lazy, useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { getCampaigns, getSecurityBanners } from './services/dataService';
import Sidebar from './components/Sidebar';
import LoginOverlay from './components/LoginOverlay';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const NewsCrawler = lazy(() => import('./pages/NewsCrawler'));
const ReportDeploy = lazy(() => import('./pages/ReportDeploy'));
const CompanyList = lazy(() => import('./pages/CompanyList'));
const CampaignManager = lazy(() => import('./pages/CampaignManager'));
const SecurityBanner = lazy(() => import('./pages/SecurityBanner'));
const Subscribers = lazy(() => import('./pages/Subscribers'));
const Settings = lazy(() => import('./pages/Settings'));
const ApiSettings = lazy(() => import('./pages/ApiSettings'));

function FullPageLoading({ label = 'Loading...' }) {
  return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#0f172a' }}>
      <div style={{ textAlign:'center', color:'white' }}>
        <div style={{ fontSize:32, fontWeight:900, marginBottom:10 }}>OASIS <span style={{ color:'#3b82f6' }}>R&D</span></div>
        <div style={{ fontSize:13, color:'#94a3b8' }}>{label}</div>
      </div>
    </div>
  );
}

function PageLoading() {
  return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:360, color:'#64748b', fontWeight:800 }}>
      Loading page...
    </div>
  );
}

export default function AdminApp() {
  const { user, userName, loading, login, logout } = useAuth();
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [draftArticles, setDraftArticles] = useState({ main: null, macro: [], platform: [], auto: [], ai: [], security: [] });
  const [issueName, setIssueName] = useState('');
  const [selCampaign, setSelCampaign] = useState('');
  const [selSecurity, setSelSecurity] = useState('');
  const [video, setVideo] = useState({ url: '', title: '', source: '', desc: '' });
  const [campaigns, setCampaigns] = useState([]);
  const [secBanners, setSecBanners] = useState([]);

  React.useEffect(() => {
    if (!['news', 'deploy'].includes(activeMenu)) return;
    const loadShared = async () => {
      const [c, s] = await Promise.all([getCampaigns(), getSecurityBanners()]);
      setCampaigns(c);
      setSecBanners(s);
    };
    loadShared();
  }, [activeMenu]);

  const companies = JSON.parse(localStorage.getItem('oasis_companies') || '[]');

  if (loading) return <FullPageLoading label="Checking session..." />;
  if (!user) return <LoginOverlay onLogin={login} />;

  const renderPage = () => {
    switch (activeMenu) {
      case 'dashboard': return <Dashboard draftArticles={draftArticles} />;
      case 'news': return <NewsCrawler draftArticles={draftArticles} setDraftArticles={setDraftArticles} companies={companies} issueName={issueName} selCampaign={selCampaign} selSecurity={selSecurity} video={video} setVideo={setVideo} campaigns={campaigns} secBanners={secBanners} />;
      case 'deploy': return <ReportDeploy draftArticles={draftArticles} setDraftArticles={setDraftArticles} issueName={issueName} setIssueName={setIssueName} selCampaign={selCampaign} setSelCampaign={setSelCampaign} selSecurity={selSecurity} setSelSecurity={setSelSecurity} video={video} setVideo={setVideo} campaigns={campaigns} setCampaigns={setCampaigns} secBanners={secBanners} setSecBanners={setSecBanners} />;
      case 'company': return <CompanyList />;
      case 'campaign': return <CampaignManager />;
      case 'security': return <SecurityBanner />;
      case 'subscribe': return <Subscribers />;
      case 'settings': return <Settings />;
      case 'api': return <ApiSettings />;
      default: return <Dashboard draftArticles={draftArticles} />;
    }
  };

  return (
    <div className="admin-shell">
      <Sidebar activeMenu={activeMenu} onMenuChange={setActiveMenu} userName={userName} onLogout={logout} />
      <main className="main-content">
        <Suspense fallback={<PageLoading />}>
          {renderPage()}
        </Suspense>
      </main>
    </div>
  );
}
