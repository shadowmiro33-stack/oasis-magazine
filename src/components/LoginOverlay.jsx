import React, { useState } from 'react';

export default function LoginOverlay({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError(false);
    try {
      await onLogin(email, password);
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={styles.brand}>AUTOHANDS R&D</div>
        <h2 style={styles.title}>OASIS MASTER ADMIN</h2>
        <input
          type="email"
          placeholder="관리자 ID (이메일)"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={styles.input}
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyPress={handleKeyPress}
          style={{ ...styles.input, marginBottom: 30 }}
        />
        <button
          onClick={handleLogin}
          disabled={loading}
          style={styles.btn}
        >
          {loading ? '접속 중...' : '시스템 접속'}
        </button>
        {error && (
          <p style={styles.error}>로그인 정보가 올바르지 않습니다.</p>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0,
    width: '100%', height: '100%',
    background: 'rgba(15,23,42,0.95)',
    zIndex: 9999,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    background: 'white',
    padding: '50px 40px',
    borderRadius: 24,
    width: 400,
    textAlign: 'center',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
  },
  brand: {
    fontSize: 12, fontWeight: 900, color: '#3b82f6',
    letterSpacing: 2, marginBottom: 10,
  },
  title: { margin: '0 0 30px', fontWeight: 900 },
  input: {
    width: '100%', padding: 12,
    border: '1px solid #cbd5e1', borderRadius: 8,
    fontSize: 14, outline: 'none', marginBottom: 15,
    boxSizing: 'border-box', fontFamily: 'inherit',
  },
  btn: {
    background: '#1e293b', color: 'white',
    border: 'none', width: '100%', padding: 16,
    borderRadius: 8, fontSize: 16, fontWeight: 'bold',
    cursor: 'pointer', fontFamily: 'inherit',
  },
  error: {
    color: '#ef4444', fontSize: 12, marginTop: 15, fontWeight: 'bold',
  },
};
