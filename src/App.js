import React, { useState } from 'react';
import './styles/global.css';
import { useAuth } from './hooks/useAuth';
import { getCampaigns, getSecBanners } from './services/dataService';
import Sidebar from './components/Sidebar';
import LoginOverlay from './components/LoginOverlay';
import Dashboard from './pages/Dashboard';
import NewsCrawler from './pages/NewsCrawler';
import ReportDeploy from './pages/ReportDeploy';
import CompanyList from './pages/CompanyList';
import CampaignManager from './pages/CampaignManager';
import SecurityBanner from './pages/SecurityBanner';
import Subscribers from './pages/Subscribers';
import Settings from './pages/Settings';
import ApiSettings from './pages/ApiSettings';

function App() {
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
    const loadShared = async () => {
      const c = await getCampaigns();
      setCampaigns(c);
      const s = await getSecBanners();
      setSecBanners(s);
    };
    loadShared();
  }, []);

  const companies = JSON.parse(localStorage.getItem('oasis_companies') || '[]');

  if (loading) {
    return (
      <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#0f172a' }}>
        <div style={{ textAlign:'center', color:'white' }}>
          <div style={{ fontSize:32, fontWeight:900, marginBottom:10 }}>OASIS <span style={{ color:'#3b82f6' }}>R&D</span></div>
          <div style={{ fontSize:13, color:'#94a3b8' }}>시스템 로딩 중...</div>
        </div>
      </div>
    );
  }

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
    <>
      <Sidebar activeMenu={activeMenu} onMenuChange={setActiveMenu} userName={userName} onLogout={logout} />
      <main className="main-content">{renderPage()}</main>
    </>
  );
}

export default App;