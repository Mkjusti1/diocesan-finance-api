import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Plus, Copy, Check, User } from 'lucide-react';
import { GET_PARISHES, CREATE_USER } from '@/graphql/queries';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function Select({ className, ...props }) {
  return (
    <select className={`h-10 rounded-lg border px-3 text-sm bg-white focus:outline-none ${className}`}
      style={{ borderColor: '#F5E3D7', color: '#3d1e12' }} {...props} />
  );
}

export function Users() {
  const [modal, setModal] = useState(false);
  const [newToken, setNewToken] = useState(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'PRIEST', parishId: '' });

  const { data: parishData } = useQuery(GET_PARISHES);
  const [createUser] = useMutation(CREATE_USER);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const input = {
      name: form.name, role: form.role,
      ...(form.role !== 'PRIEST' && { email: form.email, password: form.password }),
      ...(form.role === 'PRIEST' && { parishId: form.parishId }),
    };
    const { data } = await createUser({ variables: { input } });
    if (data.createUser.priestToken) setNewToken(data.createUser.priestToken);
    setModal(false);
    setForm({ name: '', email: '', password: '', role: 'PRIEST', parishId: '' });
  };

  const copyToken = () => {
    navigator.clipboard.writeText(newToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Users</h1>
          <p className="text-sm mt-0.5" style={{ color: '#A7A68B' }}>Manage system access</p>
        </div>
        <Button onClick={() => setModal(true)}
          className="h-10 px-4 text-sm font-medium text-white rounded-lg flex items-center gap-2"
          style={{ backgroundColor: '#D3542A' }}>
          <Plus className="h-4 w-4" /> Add User
        </Button>
      </div>

      {/* Priest token card */}
      {newToken && (
        <div className="rounded-xl border p-5" style={{ backgroundColor: '#FFF9F2', borderColor: '#C89B6E' }}>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                 style={{ backgroundColor: '#F5E3D7' }}>
              <User className="h-4 w-4" style={{ color: '#8B4C39' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: '#8B4C39' }}>Priest account created</p>
              <p className="text-xs mt-0.5 mb-3" style={{ color: '#A7A68B' }}>
                Share this one-time token with the priest to log in. It will not be shown again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs rounded-lg px-3 py-2.5 font-mono break-all border"
                      style={{ backgroundColor: 'white', borderColor: '#F5E3D7', color: '#8B4C39' }}>
                  {newToken}
                </code>
                <button onClick={copyToken}
                  className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-colors border"
                  style={{ borderColor: '#F5E3D7', backgroundColor: copied ? '#F5E3D7' : 'white', color: '#8B4C39' }}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Role info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { role: 'ADMIN', desc: 'Full system access. Manages parishes, uploads remittances, and creates users.', bg: '#D3542A' },
          { role: 'BISHOP', desc: 'Read-only access to all parishes and financial dashboards.', bg: '#8B4C39' },
          { role: 'PRIEST', desc: 'Access limited to their own parish remittance records.', bg: '#C89B6E' },
        ].map(({ role, desc, bg }) => (
          <Card key={role}>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: bg }} />
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: bg }}>{role}</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: '#A7A68B' }}>{desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-5 border-b" style={{ borderColor: '#F5E3D7' }}>
              <h2 className="text-base font-bold" style={{ color: '#8B4C39' }}>Create User</h2>
              <p className="text-xs mt-0.5" style={{ color: '#A7A68B' }}>
                Priests receive a one-time login token instead of a password
              </p>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#8B4C39' }}>Full Name *</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required className="h-10 rounded-lg" style={{ borderColor: '#F5E3D7' }} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#8B4C39' }}>Role *</label>
                <Select className="w-full" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="PRIEST">Priest</option>
                  <option value="BISHOP">Bishop</option>
                  <option value="ADMIN">Admin</option>
                </Select>
              </div>
              {form.role !== 'PRIEST' && <>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#8B4C39' }}>Email *</label>
                  <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    required className="h-10 rounded-lg" style={{ borderColor: '#F5E3D7' }} />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#8B4C39' }}>Password *</label>
                  <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    required className="h-10 rounded-lg" style={{ borderColor: '#F5E3D7' }} />
                </div>
              </>}
              {form.role === 'PRIEST' && (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#8B4C39' }}>Parish *</label>
                  <Select className="w-full" value={form.parishId} onChange={e => setForm(f => ({ ...f, parishId: e.target.value }))} required>
                    <option value="">Select parish</option>
                    {parishData?.parishes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </Select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1 h-11 font-semibold text-white rounded-lg"
                  style={{ backgroundColor: '#D3542A' }}>Create User</Button>
                <Button type="button" variant="outline" className="flex-1 h-11 rounded-lg"
                  style={{ borderColor: '#F5E3D7', color: '#8B4C39' }}
                  onClick={() => setModal(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
