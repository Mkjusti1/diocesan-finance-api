import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Plus, Copy, Check, User } from 'lucide-react';
import { GET_PARISHES, CREATE_USER } from '@/graphql/queries';

export function Users() {
  const [modal, setModal] = useState(false);
  const [newToken, setNewToken] = useState(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'PRIEST', parishId: '' });
  const [parishSearch, setParishSearch] = useState('');

  const { data: parishData } = useQuery(GET_PARISHES);
  const filteredParishes = (parishData?.parishes || []).filter(p =>
    p.name.toLowerCase().includes(parishSearch.toLowerCase())
  );
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
    setParishSearch('');
  };

  const copyToken = () => {
    navigator.clipboard.writeText(newToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const roles = [
    { role: 'ADMIN', desc: 'Full system access. Manages parishes, uploads remittances, and creates users.', color: '#D3542A' },
    { role: 'BISHOP', desc: 'Read-only access to all parishes and financial dashboards.', color: '#8B4C39' },
    { role: 'PRIEST', desc: 'Access limited to their own parish remittance records.', color: '#C89B6E' },
  ];

  const inputStyle = {
    width: '100%', height: '40px', borderRadius: '8px',
    border: '1px solid #F5E3D7', padding: '0 12px',
    fontSize: '13px', backgroundColor: 'white',
    outline: 'none', boxSizing: 'border-box', color: '#1a0a06'
  };

  const labelStyle = {
    display: 'block', fontSize: '11px', fontWeight: 700,
    color: '#8B4C39', textTransform: 'uppercase',
    letterSpacing: '0.06em', marginBottom: '6px'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1a0a06', marginBottom: '4px' }}>Users</h1>
          <p style={{ fontSize: '13px', color: '#A7A68B' }}>Manage system access</p>
        </div>
        <button onClick={() => setModal(true)} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          height: '40px', padding: '0 16px', borderRadius: '8px',
          backgroundColor: '#D3542A', color: 'white',
          border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600
        }}>
          <Plus size={15} /> Add User
        </button>
      </div>

      {/* Priest token */}
      {newToken && (
        <div style={{
          borderRadius: '12px', padding: '20px',
          border: '1px solid #C89B6E', backgroundColor: '#FFF9F2'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
              backgroundColor: '#F5E3D7', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <User size={16} color="#8B4C39" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#8B4C39', marginBottom: '4px' }}>Priest account created</p>
              <p style={{ fontSize: '12px', color: '#A7A68B', marginBottom: '12px' }}>
                Share this one-time token with the priest. It will not be shown again.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <code style={{
                  flex: 1, fontSize: '11px', fontFamily: 'monospace',
                  padding: '10px 12px', borderRadius: '8px', wordBreak: 'break-all',
                  backgroundColor: 'white', border: '1px solid #F5E3D7', color: '#8B4C39'
                }}>
                  {newToken}
                </code>
                <button onClick={copyToken} style={{
                  width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
                  border: '1px solid #F5E3D7', backgroundColor: copied ? '#F5E3D7' : 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#8B4C39'
                }}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Role cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }} className="roles-grid">
        {roles.map(({ role, desc, color }) => (
          <div key={role} style={{
            backgroundColor: 'white', borderRadius: '12px',
            border: '1px solid #F5E3D7', padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {role}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#A7A68B', lineHeight: 1.6 }}>{desc}</p>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
          backgroundColor: 'rgba(0,0,0,0.4)'
        }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', width: '100%', maxWidth: '420px' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #F5E3D7' }}>
              <p style={{ fontSize: '15px', fontWeight: 700, color: '#8B4C39' }}>Create User</p>
              <p style={{ fontSize: '12px', color: '#A7A68B', marginTop: '2px' }}>
                Priests receive a one-time login token
              </p>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Full Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Role *</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="PRIEST">Priest</option>
                  <option value="BISHOP">Bishop</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              {form.role !== 'PRIEST' && <>
                <div>
                  <label style={labelStyle}>Email *</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Password *</label>
                  <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required style={inputStyle} />
                </div>
              </>}
              {form.role === 'PRIEST' && (
                <div>
                  <label style={labelStyle}>Parish *</label>
                  <select value={form.parishId} onChange={e => setForm(f => ({ ...f, parishId: e.target.value }))} required
                    style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="">Select parish</option>
                    {parishData?.parishes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button type="submit" style={{
                  flex: 1, height: '42px', borderRadius: '8px',
                  backgroundColor: '#D3542A', color: 'white',
                  border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600
                }}>Create User</button>
                <button type="button" onClick={() => setModal(false)} style={{
                  flex: 1, height: '42px', borderRadius: '8px',
                  backgroundColor: 'white', color: '#8B4C39',
                  border: '1px solid #F5E3D7', cursor: 'pointer', fontSize: '13px', fontWeight: 600
                }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
