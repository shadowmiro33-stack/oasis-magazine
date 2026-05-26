import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import './styles/global.css';
import PublicMagazine from './pages/PublicMagazine';

const AdminApp = lazy(() => import('./AdminApp'));

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
      <Route path="/" element={<PublicMagazine />} />
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
