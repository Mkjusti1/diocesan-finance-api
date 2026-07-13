import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client/core';
import { Plus, Copy, Check, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { GET_PARISHES } from '@/graphql/queries';

const GET_ALL_USERS = gql`
  query GetAllUsers {
    allUsers { id name email role parishId priestToken parish { id name } }
  }
`;

const REGENERATE_TOKEN = gql`
  mutation RegenerateToken($userId: ID!) {
    regeneratePriestToken(userId: $userId) { id name priestToken parish { name } }
  }
`;

const CREATE_USER_MUTATION = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) { id name email role parishId priestToken parish { name } }
  }
`;

const DELETE_USER = gql`
  mutation DeleteUser($id: ID!) { deleteUser(id: $id) }
`;

const GENERATE_ALL_TOKENS = gql`
  mutation GenerateAllPriestTokens {
    generateAllPriestTokens { created skipped total }
  }
`;

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} style={{
      width: '28px', height: '28px', borderRadius: '6px', flexShrink: 0,
      border: '1px solid #F5E3D7', backgroundColor: copied ? '#F5E3D7' : 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', color: '#8B4C39'
    }}>
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

function TokenCell({ token, userId, onRegenerate }) {
  const [visible, setVisible] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const handleRegenerate = async () => {
    if (!confirm('Regenerate token? The old token will stop working immediately.')) return;
    setRegenerating(true);
    await onRegenerate(userId);
    setRegenerating(false);
    setVisible(true);
  };

  if (!token) return <span style={{ fontSize: '12px', color: '#A7A68B' }}>No token</span>;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <code style={{
        fontSize: '11px', fontFamily: 'monospace', color: '#8B4C39',
        backgroundColor: '#FFF9F2', padding: '3px 8px', borderRadius: '4px',
        maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis',
        whiteSpace: 'nowrap', display: 'block'
      }}>
        {visible ? token : '••••••••••••••••'}
      </code>
      <button onClick={() => setVisible(v => !v)} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: '#A7A68B', padding: '2px', flexShrink: 0
      }}>
        {visible ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
      {visible && <CopyButton text={token} />}
      <button onClick={handleRegenerate} disabled={regenerating} title="Regenerate token" style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: '#A7A68B', padding: '2px', flexShrink: 0
      }}>
        <RefreshCw size={13} style={{ animation: regenerating ? 'spin 1s linear infinite' : 'none' }} />
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const roleColors = {
  ADMIN: { bg: '#fef3c7', color: '#92400e' },
  BISHOP: { bg: '#dbeafe', color: '#1e40af' },
  PRIEST: { bg: '#F5E3D7', color: '#8B4C39' },
};

export function Users() {
  const [modal, setModal] = useState(false);
  const [parishSearch, setParishSearch] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'PRIEST', parishId: '' });
  const [confirmingBulk, setConfirmingBulk] = useState(false);

  const { data: parishData } = useQuery(GET_PARISHES);
  const { data: usersData, refetch } = useQuery(GET_ALL_USERS);

  const [createUser] = useMutation(CREATE_USER_MUTATION, {
    onCompleted: () => refetch()
  });
  const [deleteUser] = useMutation(DELETE_USER, {
    onCompleted: () => refetch()
  });
  const [regenerateToken] = useMutation(REGENERATE_TOKEN, {
    onCompleted: () => refetch()
  });
  const [generateAllTokens, { loading: bulkGenerating, data: bulkData, error: bulkError }] = useMutation(GENERATE_ALL_TOKENS, {
    onCompleted: () => refetch()
  });

  const filteredParishes = (parishData?.parishes || []).filter(p =>
    p.name.toLowerCase().includes(parishSearch.toLowerCase())
  );

  const selectedParishName = parishData?.parishes.find(p => p.id === form.parishId)?.name || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    const input = {
      name: form.role === 'PRIEST' ? selectedParishName : form.name,
      role: form.role,
      ...(form.role !== 'PRIEST' && { email: form.email, password: form.password }),
      ...(form.role === 'PRIEST' && { parishId: form.parishId }),
    };
    await createUser({ variables: { input } });
    setModal(false);
    setForm({ name: '', email: '', password: '', role: 'PRIEST', parishId: '' });
    setParishSearch('');
  };

  const handleGenerateAll = async () => {
    await generateAllTokens();
    setConfirmingBulk(false);
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Deactivate ${name}? They will no longer be able to log in.`)) return;
    await deleteUser({ variables: { id } });
  };

  const handleRegenerate = async (userId) => {
    await regenerateToken({ variables: { userId } });
  };

  const users = usersData?.allUsers || [];
  const priests = users.filter(u => u.role === 'PRIEST');
  const others = users.filter(u => u.role !== 'PRIEST');

  const inputStyle = {
    width: '100%', height: '40px', borderRadius: '8px',
    border: '1px solid #F5E3D7', padding: '0 12px',
    fontSize: '13px', backgroundColor: 'white',
    outline: 'none', boxSizing: 'border-box', color: '#1a0a06'
  };
  const labelStyle = {
    display: 'block', fontSize: '11px', fontWeight: 700, color: '#8B4C39',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1a0a06', marginBottom: '4px' }}>Users</h1>
          <p style={{ fontSize: '13px', color: '#A7A68B' }}>{users.length} system users</p>
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

      {/* Admin & Bishop users */}
      {others.length > 0 && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #F5E3D7', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #F5E3D7', backgroundColor: '#FFF9F2' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Admin & Bishop Accounts
            </p>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #F5E3D7' }}>
                {['Name', 'Email', 'Role', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', fontWeight: 700, color: '#A7A68B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {others.map((u, idx) => (
                <tr key={u.id} style={{ borderBottom: idx < others.length - 1 ? '1px solid #F5E3D7' : 'none' }}>
                  <td style={{ padding: '12px 20px', fontSize: '13px', fontWeight: 600, color: '#1a0a06' }}>{u.name}</td>
                  <td style={{ padding: '12px 20px', fontSize: '13px', color: '#A7A68B' }}>{u.email || '—'}</td>
                  <td style={{ padding: '12px 20px' }}>
                    <span style={{
                      fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
                      backgroundColor: roleColors[u.role]?.bg, color: roleColors[u.role]?.color
                    }}>{u.role}</span>
                  </td>
                  <td style={{ padding: '12px 20px' }}>
                    <button onClick={() => handleDelete(u.id, u.name)} style={{
                      fontSize: '12px', color: '#D3542A', background: 'none',
                      border: 'none', cursor: 'pointer', fontWeight: 600
                    }}>Deactivate</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Priest accounts with tokens */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #F5E3D7', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #F5E3D7', backgroundColor: '#FFF9F2', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Priest Accounts & Login Tokens
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '12px', color: '#A7A68B' }}>{priests.length} priests</span>
            {!confirmingBulk ? (
              <button onClick={() => setConfirmingBulk(true)} disabled={bulkGenerating} style={{
                padding: '7px 12px', borderRadius: '7px', border: '1px solid #F5E3D7',
                backgroundColor: 'white', color: '#8B4C39', fontSize: '12px', fontWeight: 700,
                cursor: 'pointer', whiteSpace: 'nowrap'
              }}>
                Generate All Priest Tokens
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button onClick={() => setConfirmingBulk(false)} disabled={bulkGenerating} style={{
                  padding: '7px 12px', borderRadius: '7px', border: '1px solid #F5E3D7',
                  backgroundColor: 'white', color: '#A7A68B', fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                }}>
                  Cancel
                </button>
                <button onClick={handleGenerateAll} disabled={bulkGenerating} style={{
                  padding: '7px 12px', borderRadius: '7px', border: '1px solid #D3542A',
                  backgroundColor: '#D3542A', color: 'white', fontSize: '12px', fontWeight: 700,
                  cursor: bulkGenerating ? 'default' : 'pointer', opacity: bulkGenerating ? 0.7 : 1
                }}>
                  {bulkGenerating ? 'Generating…' : 'Confirm'}
                </button>
              </div>
            )}
          </div>
        </div>
        {(bulkData || bulkError) && (
          <div style={{ padding: '10px 20px', borderBottom: '1px solid #F5E3D7', backgroundColor: bulkError ? '#FEF2F2' : '#F0FDF4' }}>
            {bulkError ? (
              <p style={{ fontSize: '12px', color: '#B91C1C', fontWeight: 600 }}>Failed: {bulkError.message}</p>
            ) : (
              <p style={{ fontSize: '12px', color: '#166534', fontWeight: 600 }}>
                Created {bulkData.generateAllPriestTokens.created} new token{bulkData.generateAllPriestTokens.created !== 1 ? 's' : ''}
                {' '}({bulkData.generateAllPriestTokens.skipped} parish{bulkData.generateAllPriestTokens.skipped !== 1 ? 'es' : ''} already had one, {bulkData.generateAllPriestTokens.total} total parishes).
              </p>
            )}
          </div>
        )}

        {priests.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', fontSize: '13px', color: '#A7A68B' }}>
            No priest accounts yet. Click "Add User" to create one.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #F5E3D7' }}>
                  {['Name', 'Parish', 'Login Token', 'Actions'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', fontWeight: 700, color: '#A7A68B', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {priests.map((u, idx) => (
                  <tr key={u.id}
                    style={{ borderBottom: idx < priests.length - 1 ? '1px solid #F5E3D7' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FFF9F2'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '12px 20px', fontSize: '13px', fontWeight: 600, color: '#1a0a06', whiteSpace: 'nowrap' }}>{u.name}</td>
                    <td style={{ padding: '12px 20px', fontSize: '13px', color: '#A7A68B', whiteSpace: 'nowrap' }}>
                      {u.parish?.name || '—'}
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <TokenCell
                        token={u.priestToken}
                        userId={u.id}
                        onRegenerate={handleRegenerate}
                      />
                    </td>
                    <td style={{ padding: '12px 20px', whiteSpace: 'nowrap' }}>
                      <button onClick={() => handleDelete(u.id, u.name)} style={{
                        fontSize: '12px', color: '#D3542A', background: 'none',
                        border: 'none', cursor: 'pointer', fontWeight: 600
                      }}>Deactivate</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
          backgroundColor: 'rgba(0,0,0,0.4)'
        }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', width: '100%', maxWidth: '420px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #F5E3D7', position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1 }}>
              <p style={{ fontSize: '15px', fontWeight: 700, color: '#8B4C39' }}>Create User</p>
              <p style={{ fontSize: '12px', color: '#A7A68B', marginTop: '2px' }}>Priests receive a one-time login token</p>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                  <label style={labelStyle}>Full Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required style={inputStyle} placeholder="e.g. Fr. John Obi" />
                </div>
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
                  <p style={{ fontSize: '12px', color: '#A7A68B', marginBottom: '8px' }}>
                    The parish name is used as the account name — no separate priest name is needed.
                  </p>
                  <input
                    type="text" placeholder="Type to search parishes..."
                    value={parishSearch}
                    onChange={e => { setParishSearch(e.target.value); setForm(f => ({ ...f, parishId: '' })); }}
                    style={{ ...inputStyle, marginBottom: '6px' }}
                  />
                  <select value={form.parishId}
                    onChange={e => setForm(f => ({ ...f, parishId: e.target.value }))}
                    required
                    size={Math.min(6, filteredParishes.length + 1)}
                    style={{ ...inputStyle, height: 'auto', cursor: 'pointer', padding: '4px' }}>
                    <option value="">-- Select parish --</option>
                    {filteredParishes.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  {parishSearch && filteredParishes.length === 0 && (
                    <p style={{ fontSize: '12px', color: '#D3542A', marginTop: '4px' }}>No parishes match</p>
                  )}
                  {form.parishId && (
                    <p style={{ fontSize: '12px', color: '#166534', marginTop: '4px', fontWeight: 600 }}>
                      ✓ Account will be named "{selectedParishName}"
                    </p>
                  )}
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button type="submit" style={{
                  flex: 1, height: '42px', borderRadius: '8px',
                  backgroundColor: '#D3542A', color: 'white',
                  border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600
                }}>Create User</button>
                <button type="button" onClick={() => { setModal(false); setParishSearch(''); }} style={{
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