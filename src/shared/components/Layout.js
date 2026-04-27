import React from 'react';
import { useNavigate } from 'react-router-dom';

const Layout = ({ children, config }) => {
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <header className="brutalist-card" style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: config.mainColor, color: 'white' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px' }}>{config.title}</h1>
          <p style={{ margin: 0, opacity: 0.9 }}>{config.subTitle}</p>
        </div>
        <button 
          className="brutalist-button" 
          onClick={() => navigate(`/${config.id}/admin`)}
          style={{ fontSize: '14px' }}
        >
          관리자
        </button>
      </header>

      {/* Main Content */}
      <main>
        {children}
      </main>

      {/* Footer */}
      <footer style={{ marginTop: '50px', textAlign: 'center', padding: '20px', borderTop: '3px solid black' }}>
        <p>© 2026 AUTOHANDS - OASIS Magazine Group</p>
      </footer>
    </div>
  );
};

export default Layout;