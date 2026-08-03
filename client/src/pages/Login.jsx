import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client/react';
import { LOGIN } from '@/graphql/queries';
import { useAuth } from '@/context/AuthContext';
import dioceseLogo from '@/assets/diocese-logo.jpg';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [loginMutation, { loading }] = useMutation(LOGIN, {
    onCompleted: ({ login: data }) => {
      login(data.token, data.user);
      navigate('/');
    },
    onError: (err) => setError(err.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    loginMutation({ variables: { input: { email: form.email, password: form.password } } });
  };

  const inputStyle = {
    width: '100%', height: '44px', borderRadius: '8px',
    border: '1px solid #F5E3D7', padding: '0 12px',
    fontSize: '15px', backgroundColor: 'white',
    outline: 'none', boxSizing: 'border-box', color: '#1a0a06'
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#FFF9F2' }}>

      {/* Left panel — desktop only */}
      {!isMobile && (
        <div style={{
          width: '45%', minHeight: '100vh', backgroundColor: '#8B4C39',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '48px', flexShrink: 0, gap: '24px'
        }}>
          {/* Diocese Logo */}
          <img
            src={dioceseLogo}
            alt="Catholic Diocese of Aguleri"
            style={{
              width: '160px', height: '160px', borderRadius: '50%',
              objectFit: 'cover', border: '4px solid #C89B6E',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
            }}
          />

          {/* Title */}
          <div style={{ textAlign: 'center' }}>
            <p style={{
              color: 'white', fontSize: '32px', fontWeight: 900,
              letterSpacing: '0.02em', lineHeight: 1.1, marginBottom: '8px'
            }}>
              CADIAG FINANCE
            </p>

          </div>
        </div>
      )}

      {/* Right panel */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: isMobile ? '40px 24px' : '48px 32px',
        minHeight: '100vh'
      }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>

          {/* Mobile logo + title */}
          {isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
              <img
                src={dioceseLogo}
                alt="Catholic Diocese of Aguleri"
                style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #C89B6E' }}
              />
              <div>
                <p style={{ fontWeight: 900, fontSize: '16px', color: '#1a0a06', lineHeight: 1.1 }}>CADIAG FINANCE</p>
                
              </div>
            </div>
          )}

          <h2 style={{ fontSize: isMobile ? '26px' : '24px', fontWeight: 700, color: '#1a0a06', marginBottom: '6px' }}>
            Welcome back
          </h2>
          <p style={{ fontSize: '14px', color: '#A7A68B', marginBottom: '28px' }}>
            Sign in to your account to continue
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#3d1e12', marginBottom: '6px' }}>
                Email address
              </label>
              <input type="email" placeholder="admin@diocese.com" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#3d1e12', marginBottom: '6px' }}>
                Password
              </label>
              <input type="password" placeholder="••••••••" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required style={inputStyle} />
            </div>

            {error && (
              <div style={{
                backgroundColor: '#F5E3D7', color: '#8B4C39',
                borderRadius: '8px', padding: '10px 14px', fontSize: '13px'
              }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', height: '48px', borderRadius: '10px',
              backgroundColor: loading ? '#c0795e' : '#D3542A',
              color: 'white', fontWeight: 700, fontSize: '15px',
              border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '4px'
            }}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
