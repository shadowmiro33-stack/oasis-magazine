import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import './styles/global.css';

const AdminApp = lazy(() => import('./AdminApp'));

function LegacyMagazineFrame() {
  return (
    <iframe
      title="OASIS R&D Magazine"
      src="/legacy-index.html"
      style={{ width:'100vw', height:'100vh', border:0, display:'block', background:'white' }}
    />
  );
}

function AppLoading() {
  return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#0f172a' }}>
      <div style={{ textAlign:'center', color:'white' }}>
        <div style={{ fontSize:32, fontWeight:900, marginBottom:10 }}>OASIS <span style={{ color:'#3b82f6' }}>R&D</span></div>
        <div style={{ fontSize:13, color:'#94a3b8' }}>Loading admin console...</div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LegacyMagazineFrame />} />
      <Route
        path="/admin"
        element={(
          <Suspense fallback={<AppLoading />}>
            <AdminApp />
          </Suspense>
        )}
      />
      <Route
        path="/admin.html"
        element={(
          <Suspense fallback={<AppLoading />}>
            <AdminApp />
          </Suspense>
        )}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
