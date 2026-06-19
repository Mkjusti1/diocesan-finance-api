import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client/react';
import { Church } from 'lucide-react';
import { LOGIN } from '@/graphql/queries';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const [loginMutation, { loading }] = useMutation(LOGIN, {
    onCompleted: ({ login: data }) => { login(data.token, data.user); navigate('/'); },
    onError: (err) => setError(err.message),
  });

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#FFF9F2' }}>
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12" style={{ backgroundColor: '#8B4C39' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#D3542A' }}>
            <Church className="h-5 w-5 text-white" />
          </div>
          <span className="font-semibold text-white">Diocesan Finance</span>
        </div>

        <div>
          <p className="text-4xl font-bold text-white leading-snug mb-4">
            Managing God's<br />resources with care
          </p>
          <p className="text-sm leading-relaxed" style={{ color: '#C89B6E' }}>
            A complete financial management system for tracking parish remittances, collections, and outstanding balances across the diocese.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[['Parishes', 'Tracked'], ['Collections', 'Recorded'], ['Reports', 'Generated']].map(([label, sub]) => (
            <div key={label} className="rounded-lg p-4" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
              <p className="text-white font-semibold text-sm">{label}</p>
              <p className="text-xs mt-0.5" style={{ color: '#C89B6E' }}>{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#D3542A' }}>
              <Church className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold text-foreground">Diocesan Finance</span>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1">Welcome back</h2>
          <p className="text-sm mb-8" style={{ color: '#A7A68B' }}>Sign in to your account to continue</p>

          <form onSubmit={(e) => { e.preventDefault(); setError(''); loginMutation({ variables: { input: form } }); }}
                className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Email address</label>
              <Input type="email" placeholder="admin@diocese.com" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Password</label>
              <Input type="password" placeholder="••••••••" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            </div>

            {error && (
              <div className="text-sm px-3 py-2.5 rounded-lg" style={{ backgroundColor: '#F5E3D7', color: '#8B4C39' }}>
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}
                    style={{ backgroundColor: '#D3542A', color: 'white' }}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <p className="text-xs text-center mt-8" style={{ color: '#A7A68B' }}>
            Priests: use your one-time token to sign in
          </p>
        </div>
      </div>
    </div>
  );
}
