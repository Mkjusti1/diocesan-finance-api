import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Plus, Copy, Check } from 'lucide-react';
import { GET_PARISHES, CREATE_USER } from '@/graphql/queries';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { gql } from '@apollo/client';

const GET_USERS = gql`query { users: parishes { id name } }`;

const roleColors = { ADMIN: 'default', BISHOP: 'secondary', PRIEST: 'outline' };

export function Users() {
  const [modal, setModal] = useState(false);
  const [newToken, setNewToken] = useState(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'PRIEST', parishId: '' });

  const { data: parishData } = useQuery(GET_PARISHES);
  const [createUser] = useMutation(CREATE_USER);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const input = { ...form, parishId: form.parishId || undefined };
    if (form.role !== 'PRIEST') delete input.parishId;

    const { data } = await createUser({ variables: { input } });
    if (data.createUser.priestToken) {
      setNewToken(data.createUser.priestToken);
    }
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
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage system users</p>
        </div>
        <Button onClick={() => setModal(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add User
        </Button>
      </div>

      {/* Priest token display */}
      {newToken && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <p className="text-sm font-medium text-green-800 mb-2">
              Priest account created. Share this login token:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-white border rounded px-3 py-2 break-all">{newToken}</code>
              <Button size="sm" variant="outline" onClick={copyToken}>
                {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <p className="text-xs text-green-700 mt-2">This token won't be shown again.</p>
          </CardContent>
        </Card>
      )}

      {/* Create modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold mb-4">Create User</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-sm font-medium block mb-1">Full Name *</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Role *</label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                >
                  <option value="PRIEST">Priest</option>
                  <option value="BISHOP">Bishop</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              {form.role !== 'PRIEST' && (
                <>
                  <div>
                    <label className="text-sm font-medium block mb-1">Email *</label>
                    <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Password *</label>
                    <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
                  </div>
                </>
              )}
              {form.role === 'PRIEST' && (
                <div>
                  <label className="text-sm font-medium block mb-1">Parish *</label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={form.parishId}
                    onChange={e => setForm(f => ({ ...f, parishId: e.target.value }))}
                    required
                  >
                    <option value="">Select parish</option>
                    {parishData?.parishes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1">Create</Button>
                <Button type="button" variant="outline" className="flex-1" onClick={() => setModal(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
