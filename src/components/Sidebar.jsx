import React from 'react';

const menuItems = [
  { id: 'dashboard', icon: 'fas fa-chart-pie', label: '종합 대시보드' },
  { id: 'news', icon: 'fas fa-robot', label: '뉴스 수집 & AI' },
  { id: 'deploy', icon: 'fas fa-paper-plane', label: '리포트 배포 및 관리' },
  // 자동 수집 기능으로 오해될 수 있어 업체 리스트 메뉴는 숨김 처리합니다.
  // { id: 'company', icon: 'fas fa-building', label: '수집 업체 리스트' },
  { id: 'campaign', icon: 'fas fa-mobile-alt', label: '숏츠/릴스 큐레이션 관리' },
  { id: 'security', icon: 'fas fa-shield-alt', label: '보안 캠페인 배너 관리' },
  { id: 'subscribe', icon: 'fas fa-users', label: '뉴스레터 구독자 관리' },
  { id: 'settings', icon: 'fas fa-cog', label: '시스템 환경 설정' },
  { id: 'api', icon: 'fas fa-key', label: 'API 및 보안 설정' },
];

export default function Sidebar({ activeMenu, onMenuChange, userName, onLogout }) {
  return (
    <nav style={styles.sidebar}>
      <div style={styles.logo}>
        OASIS <span style={{ color: '#3b82f6' }}>R&D</span>
      </div>

      <div style={styles.menuList}>
        {menuItems.map(item => (
          <div
            key={item.id}
            onClick={() => onMenuChange(item.id)}
            style={activeMenu === item.id ? styles.menuActive : styles.menu}
          >
            <i className={item.icon} style={{ width: 18, textAlign: 'center' }}></i>
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      <div style={styles.footer}>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 5 }}>Connected as</div>
        <div style={{ fontSize: 14, color: 'white', fontWeight: 'bold', marginBottom: 15 }}>{userName}</div>
        <button onClick={onLogout} style={styles.logoutBtn}>보안 로그아웃</button>
      </div>
    </nav>
  );
}

const styles = {
  sidebar: {
    width: 270,
    background: '#1e293b',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    zIndex: 100,
  },
  logo: {
    padding: '30px 25px 40px',
    fontWeight: 900,
    fontSize: 22,
    letterSpacing: -1,
  },
  menuList: {
    flex: 1,
    overflowY: 'auto',
  },
  menu: {
    padding: '15px 25px',
    cursor: 'pointer',
    transition: '0.3s',
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  menuActive: {
    padding: '15px 25px',
    cursor: 'pointer',
    background: '#3b82f6',
    color: 'white',
    fontSize: 14,
    fontWeight: 700,
    boxShadow: 'inset 4px 0 0 white',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  footer: {
    marginTop: 'auto',
    padding: 30,
    borderTop: '1px solid #334155',
  },
  logoutBtn: {
    background: '#1e293b',
    border: '1px solid #334155',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 'bold',
    width: '100%',
    padding: 8,
    borderRadius: 6,
    fontFamily: 'inherit',
  },
};
