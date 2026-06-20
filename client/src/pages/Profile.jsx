import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client/core';
import { KeyRound, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { GET_PARISHES } from '@/graphql/queries';

const CHANGE_PASSWORD = gql`
  mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
    changePassword(currentPassword: $currentPassword, newPassword: $newPassword)
  }
`;

const ADMIN_RESET_PASSWORD = gql`
  mutation AdminResetPassword($userId: ID!, $newPassword: String!) {
    adminResetPassword(userId: $userId, newPassword: $newPassword)
  }
`;

const GET_ALL_USERS = gql`
  query GetAllUsers {
    allUsers { id name email role parishId parish { id name } }
  }
`;

export function Profile() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [form, setForm] = useState({ current: '', newPass: '', confirm: '' });
  const [status, setStatus] = useState(null); // null | 'success' | 'error'
  const [message, setMessage] = useState('');

  // Admin reset state
  const [selectedUser, setSelectedUser] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [adminStatus, setAdminStatus] = useState(null);

  const { data: usersData } = useQuery(GET_ALL_USERS, { skip: !isAdmin });

  const [changePassword] = useMutation(CHANGE_PASSWORD, {
    onCompleted: () => { setStatus('success'); setMessage('Password changed successfully'); setForm({ current: '', newPass: '', confirm: '' }); },
    onError: (err) => { setStatus('error'); setMessage(err.message); }
  });

  const [adminResetPassword] = useMutation(ADMIN_RESET_PASSWORD, {
    onCompleted: () => { setAdminStatus('success'); setNewAdminPass(''); setSelectedUser(''); },
    onError: (err) => { setAdminStatus('error'); setMessage(err.message); }
  });

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (form.newPass !== form.confirm) {
      setStatus('error'); setMessage('New passwords do not match'); return;
    }
    if (form.newPass.length < 6) {
      setStatus('error'); setMessage('Password must be at least 6 characters'); return;
    }
    setStatus(null);
    changePassword({ variables: { currentPassword: form.current, newPassword: form.newPass } });
  };

  const handleAdminReset = (e) => {
    e.preventDefault();
    if (!selectedUser || !newAdminPass) return;
    if (newAdminPass.length < 6) { setAdminStatus('error'); setMessage('Password must be at least 6 characters'); return; }
    setAdminStatus(null);
    adminResetPassword({ variables: { userId: selectedUser, newPassword: newAdminPass } });
  };

  const inputStyle = {
    width: '100%', height: '40px', borderRadius: '8px',
    border: '1px solid #F5E3D7', padding: '0 12px',
    fontSize: '13px', outline: 'none', color: '#1a0a06', boxSizing: 'border-box'
  };
  const labelStyle = {
    display: 'block', fontSize: '11px', fontWeight: 700, color: '#8B4C39',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '560px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1a0a06', marginBottom: '4px' }}>Profile & Security</h1>
        <p style={{ fontSize: '13px', color: '#A7A68B' }}>Manage your account and security settings</p>
      </div>

      {/* Current user info */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #F5E3D7', padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            backgroundColor: '#F5E3D7', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: '#8B4C39'
          }}>
            {user?.name?.charAt(0)}
          </div>
          <div>
            <p style={{ fontSize: '15px', fontWeight: 700, color: '#1a0a06' }}>{user?.name}</p>
            <p style={{ fontSize: '13px', color: '#A7A68B', marginTop: '2px' }}>{user?.email} · {user?.role}</p>
          </div>
        </div>
      </div>

      {/* Change own password */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #F5E3D7', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #F5E3D7', backgroundColor: '#FFF9F2', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <KeyRound size={14} color="#8B4C39" strokeWidth={2.5} />
          <p style={{ fontSize: '12px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Change My Password
          </p>
        </div>
        <form onSubmit={handleChangePassword} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={labelStyle}>Current Password *</label>
            <input type="password" value={form.current}
              onChange={e => setForm(f => ({ ...f, current: e.target.value }))}
              required style={inputStyle} placeholder="Enter current password" />
          </div>
          <div>
            <label style={labelStyle}>New Password *</label>
            <input type="password" value={form.newPass}
              onChange={e => setForm(f => ({ ...f, newPass: e.target.value }))}
              required style={inputStyle} placeholder="At least 6 characters" />
          </div>
          <div>
            <label style={labelStyle}>Confirm New Password *</label>
            <input type="password" value={form.confirm}
              onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
              required style={inputStyle} placeholder="Repeat new password" />
          </div>

          {status && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 14px', borderRadius: '8px',
              backgroundColor: status === 'success' ? '#dcfce7' : '#fee2e2',
              color: status === 'success' ? '#166534' : '#991b1b'
            }}>
              {status === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
              <span style={{ fontSize: '13px', fontWeight: 500 }}>{message}</span>
            </div>
          )}

          <button type="submit" style={{
            height: '42px', borderRadius: '8px', border: 'none',
            backgroundColor: '#D3542A', color: 'white',
            fontSize: '13px', fontWeight: 700, cursor: 'pointer'
          }}>
            Update Password
          </button>
        </form>
      </div>

      {/* Admin — reset any user's password */}
      {isAdmin && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #F5E3D7', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #F5E3D7', backgroundColor: '#FFF9F2', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <KeyRound size={14} color="#8B4C39" strokeWidth={2.5} />
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Reset Another User's Password
            </p>
          </div>
          <form onSubmit={handleAdminReset} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Select User *</label>
              <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} required
                style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">Choose a user...</option>
                {usersData?.allUsers
                  ?.filter(u => u.id !== String(user?.id))
                  .map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} — {u.role}{u.parish ? ` · ${u.parish.name}` : ''}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>New Password *</label>
              <input type="password" value={newAdminPass}
                onChange={e => setNewAdminPass(e.target.value)}
                required style={inputStyle} placeholder="At least 6 characters" />
            </div>

            {adminStatus && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 14px', borderRadius: '8px',
                backgroundColor: adminStatus === 'success' ? '#dcfce7' : '#fee2e2',
                color: adminStatus === 'success' ? '#166534' : '#991b1b'
              }}>
                {adminStatus === 'success'
                  ? <><Check size={14} /><span style={{ fontSize: '13px', fontWeight: 500 }}>Password reset successfully</span></>
                  : <><AlertCircle size={14} /><span style={{ fontSize: '13px', fontWeight: 500 }}>{message}</span></>
                }
              </div>
            )}

            <button type="submit" style={{
              height: '42px', borderRadius: '8px', border: 'none',
              backgroundColor: '#8B4C39', color: 'white',
              fontSize: '13px', fontWeight: 700, cursor: 'pointer'
            }}>
              Reset Password
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
