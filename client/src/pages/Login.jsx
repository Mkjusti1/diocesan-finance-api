import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client/react';
import { Landmark } from 'lucide-react';
import { LOGIN } from '@/graphql/queries';
import { useAuth } from '@/context/AuthContext';
import { gql } from '@apollo/client/core';

const LOGIN_WITH_TOKEN = gql`
  mutation LoginWithToken($token: String!) {
    loginWithToken(token: $token) {
      token
      user { id name email role parishId }
    }
  }
`;

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mode, setMode] = useState('password'); // 'password' | 'token'
  const [form, setForm] = useState({ email: '', password: '', token: '' });
  const [error, setError] = useState('');

  const [loginMutation, { loading: loadingPassword }] = useMutation(LOGIN, {
    onCompleted: ({ login: data }) => { login(data.token, data.user); navigate(data.user.role === 'PRIEST' ? '/remittances' : '/'); },
    onError: (err) => setError(err.message),
  });

  const [loginWithToken, { loading: loadingToken }] = useMutation(LOGIN_WITH_TOKEN, {
    onCompleted: ({ loginWithToken: data }) => { login(data.token, data.user); navigate(data.user.role === 'PRIEST' ? '/remittances' : '/'); },
    onError: (err) => setError(err.message),
  });

  const loading = loadingPassword || loadingToken;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (mode === 'password') {
      loginMutation({ variables: { input: { email: form.email, password: form.password } } });
    } else {
      loginWithToken({ variables: { token: form.token } });
    }
  };

  const inputStyle = {
    width: '100%', height: '42px', borderRadius: '8px',
    border: '1px solid #F5E3D7', padding: '0 12px',
    fontSize: '14px', backgroundColor: 'white',
    outline: 'none', boxSizing: 'border-box', color: '#1a0a06'
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#FFF9F2' }}>

      {/* Left panel — hidden on mobile */}
      <div className="login-left" style={{
        width: '45%', minHeight: '100vh', backgroundColor: '#8B4C39',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '48px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '8px',
            backgroundColor: '#D3542A', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Landmark size={18} color="white" strokeWidth={2} />
          </div>
          <span style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>Diocesan Finance</span>
        </div>

        <div>
          <p style={{ color: 'white', fontSize: '36px', fontWeight: 700, lineHeight: 1.3, marginBottom: '16px' }}>
            Managing God's<br />resources with care
          </p>
          <p style={{ color: '#C89B6E', fontSize: '14px', lineHeight: 1.7, maxWidth: '360px' }}>
            A complete financial management system for tracking parish remittances, collections, and outstanding balances across the diocese.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          {[['Parishes', 'Tracked'], ['Collections', 'Recorded'], ['Reports', 'Generated']].map(([label, sub]) => (
            <div key={label} style={{ borderRadius: '10px', padding: '16px', backgroundColor: 'rgba(255,255,255,0.08)' }}>
              <p style={{ color: 'white', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>{label}</p>
              <p style={{ color: '#C89B6E', fontSize: '11px' }}>{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 32px' }}>
        <div style={{ width: '100%', maxWidth: '360px' }}>
          <h2 style={{ fontSize: '26px', fontWeight: 700, color: '#1a0a06', marginBottom: '8px' }}>Welcome back</h2>
          <p style={{ fontSize: '14px', color: '#A7A68B', marginBottom: '28px' }}>Sign in to your account to continue</p>

          {/* Toggle */}
          <div style={{
            display: 'flex', backgroundColor: '#F5E3D7', borderRadius: '10px',
            padding: '4px', marginBottom: '24px'
          }}>
            {[['password', 'Email & Password'], ['token', 'Priest Token']].map(([m, label]) => (
              <button key={m} type="button" onClick={() => { setMode(m); setError(''); }}
                style={{
                  flex: 1, height: '34px', borderRadius: '7px', border: 'none',
                  fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.15s',
                  backgroundColor: mode === m ? 'white' : 'transparent',
                  color: mode === m ? '#8B4C39' : '#A7A68B',
                  boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.1)' : 'none'
                }}>
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {mode === 'password' ? (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#3d1e12', marginBottom: '6px' }}>
                    Email address
                  </label>
                  <input type="email" placeholder="admin@diocese.com" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#3d1e12', marginBottom: '6px' }}>
                    Password
                  </label>
                  <input type="password" placeholder="••••••••" value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required style={inputStyle} />
                </div>
              </>
            ) : (
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#3d1e12', marginBottom: '6px' }}>
                  One-time login token
                </label>
                <input type="text" placeholder="Paste your token here" value={form.token}
                  onChange={e => setForm(f => ({ ...f, token: e.target.value }))} required
                  style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '12px' }} />
                <p style={{ fontSize: '12px', color: '#A7A68B', marginTop: '6px' }}>
                  Your token was provided by the diocesan admin
                </p>
              </div>
            )}

            {error && (
              <div style={{
                backgroundColor: '#F5E3D7', color: '#8B4C39',
                borderRadius: '8px', padding: '10px 14px', fontSize: '13px'
              }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', height: '44px', borderRadius: '8px',
              backgroundColor: loading ? '#c0795e' : '#D3542A',
              color: 'white', fontWeight: 600, fontSize: '14px',
              border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '4px'
            }}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
    <style>{`
        @media (max-width: 767px) {
          .login-left { display: none !important; }
        }
      `}</style>
  );
}
