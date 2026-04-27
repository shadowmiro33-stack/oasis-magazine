import React, { useState } from 'react';
import './styles/global.css';
import { useAuth } from './hooks/useAuth';
import Sidebar from './components/Sidebar';
import LoginOverlay from './components/LoginOverlay';
import Dashboard from './pages/Dashboard';
import Subscribers from './pages/Subscribers';
import ApiSettings from './pages/ApiSettings';
import { NewsCrawler, ReportDeploy, CompanyList, CampaignManager, SecurityBanner, Settings } from './pages/PlaceholderPages';

function App() {
  const { user, userName, loading, login, logout } = useAuth();
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [draftArticles] = useState({ main: null, macro: [], platform: [], auto: [], ai: [], security: [] });

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

  if (!user) {
    return <LoginOverlay onLogin={login} />;
  }

  const renderPage = () => {
    switch (activeMenu) {
      case 'dashboard': return <Dashboard draftArticles={draftArticles} />;
      case 'news': return <NewsCrawler />;
      case 'deploy': return <ReportDeploy />;
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
      <main className="main-content">
        {renderPage()}
      </main>
    </>
  );
}

export default App;