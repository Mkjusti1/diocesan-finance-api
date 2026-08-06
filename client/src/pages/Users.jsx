import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client/core';
import { Plus } from 'lucide-react';

const GET_ALL_USERS = gql`
  query GetAllUsers {
    allUsers { id name email role parishId parish { id name } }
  }
`;

const CREATE_USER_MUTATION = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) { id name email role parishId parish { name } }
  }
`;

const DELETE_USER = gql`
  mutation DeleteUser($id: ID!) { deleteUser(id: $id) }
`;

const roleColors = {
  ADMIN: { bg: '#fef3c7', color: '#92400e' },
  BISHOP: { bg: '#dbeafe', color: '#1e40af' },
};

export function Users() {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'ADMIN' });

  const { data: usersData, refetch } = useQuery(GET_ALL_USERS);

  const [createUser] = useMutation(CREATE_USER_MUTATION, {
    onCompleted: () => refetch()
  });
  const [deleteUser] = useMutation(DELETE_USER, {
    onCompleted: () => refetch()
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const input = {
      name: form.name,
      role: form.role,
      email: form.email,
      password: form.password,
    };
    await createUser({ variables: { input } });
    setModal(false);
    setForm({ name: '', email: '', password: '', role: 'ADMIN' });
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Deactivate ${name}? They will no longer be able to log in.`)) return;
    await deleteUser({ variables: { id } });
  };

  const users = usersData?.allUsers || [];

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
      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #F5E3D7', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #F5E3D7', backgroundColor: '#FFF9F2' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Admin & Bishop Accounts
          </p>
        </div>
        {users.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', fontSize: '13px', color: '#A7A68B' }}>
            No users yet. Click "Add User" to create one.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #F5E3D7' }}>
                {['Name', 'Email', 'Role', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', fontWeight: 700, color: '#A7A68B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, idx) => (
                <tr key={u.id} style={{ borderBottom: idx < users.length - 1 ? '1px solid #F5E3D7' : 'none' }}>
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
              <p style={{ fontSize: '12px', color: '#A7A68B', marginTop: '2px' }}>Admins and Bishops sign in with email and password</p>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Role *</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="ADMIN">Admin</option>
                  <option value="BISHOP">Bishop</option>
                </select>
              </div>
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
                <p style={{ fontSize: '11px', color: '#A7A68B', marginTop: '4px' }}>At least 8 characters, with an uppercase letter, a lowercase letter, and a number.</p>
              </div>
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
