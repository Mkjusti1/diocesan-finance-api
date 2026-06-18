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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4"><Church className="h-7 w-7 text-primary" /></div>
            <h1 className="text-2xl font-bold">Diocesan Finance</h1>
            <p className="text-muted-foreground text-sm mt-1">Sign in to your account</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); setError(''); loginMutation({ variables: { input: form } }); }} className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1.5">Email address</label>
              <Input type="email" placeholder="admin@diocese.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Password</label>
              <Input type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            </div>
            {error && <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</div>}
            <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
