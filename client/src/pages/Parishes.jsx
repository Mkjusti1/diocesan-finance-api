import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Plus, Pencil, Trash2, Building2, MapPin, Mail, Phone } from 'lucide-react';
import { GET_PARISHES, CREATE_PARISH, UPDATE_PARISH, DELETE_PARISH } from '@/graphql/queries';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';

const EMPTY = { name: '', diocese: '', location: '', contactEmail: '', contactPhone: '' };

export function Parishes() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const { data, loading } = useQuery(GET_PARISHES);
  const [createParish] = useMutation(CREATE_PARISH, { refetchQueries: [GET_PARISHES] });
  const [updateParish] = useMutation(UPDATE_PARISH, { refetchQueries: [GET_PARISHES] });
  const [deleteParish] = useMutation(DELETE_PARISH, { refetchQueries: [GET_PARISHES] });

  const openEdit = (p) => {
    setSelected(p);
    setForm({ name: p.name, diocese: p.diocese || '', location: p.location || '', contactEmail: p.contactEmail || '', contactPhone: p.contactPhone || '' });
    setModal('edit');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (modal === 'create') await createParish({ variables: { input: form } });
    else await updateParish({ variables: { id: selected.id, input: form } });
    setModal(null);
  };

  if (loading) return <div style={{ padding: '60px', textAlign: 'center', fontSize: '13px', color: '#A7A68B' }}>Loading parishes...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1a0a06', marginBottom: '4px' }}>Parishes</h1>
          <p style={{ fontSize: '13px', color: '#A7A68B' }}>{data?.parishes.length} registered parishes</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setForm(EMPTY); setModal('create'); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              height: '40px', padding: '0 16px', borderRadius: '8px',
              backgroundColor: '#D3542A', color: 'white',
              border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: 600
            }}
          >
            <Plus size={15} /> Add Parish
          </button>
        )}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {data?.parishes.map(parish => (
          <div key={parish.id} style={{
            backgroundColor: 'white', borderRadius: '12px',
            border: '1px solid #F5E3D7', padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            transition: 'box-shadow 0.2s'
          }}>
            {/* Top row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '10px',
                  backgroundColor: '#F5E3D7', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0
                }}>
                  <Building2 size={18} color="#8B4C39" strokeWidth={2} />
                </div>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#1a0a06', marginBottom: '4px' }}>{parish.name}</p>
                  {parish.diocese && (
                    <span style={{
                      fontSize: '11px', fontWeight: 600, padding: '2px 8px',
                      borderRadius: '20px', backgroundColor: '#F5E3D7', color: '#8B4C39'
                    }}>
                      {parish.diocese}
                    </span>
                  )}
                </div>
              </div>
              {isAdmin && (
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  <button
                    onClick={() => openEdit(parish)}
                    style={{
                      width: '28px', height: '28px', borderRadius: '6px',
                      border: '1px solid #F5E3D7', backgroundColor: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: '#A7A68B'
                    }}
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => { if (confirm('Delete this parish?')) deleteParish({ variables: { id: parish.id } }); }}
                    style={{
                      width: '28px', height: '28px', borderRadius: '6px',
                      border: '1px solid #F5E3D7', backgroundColor: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: '#D3542A'
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>

            {/* Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {parish.location && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={12} color="#C89B6E" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: '#A7A68B' }}>{parish.location}</span>
                </div>
              )}
              {parish.contactEmail && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={12} color="#C89B6E" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: '#A7A68B' }}>{parish.contactEmail}</span>
                </div>
              )}
              {parish.contactPhone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Phone size={12} color="#C89B6E" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: '#A7A68B' }}>{parish.contactPhone}</span>
                </div>
              )}
            </div>
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
          <div style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', width: '100%', maxWidth: '440px' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #F5E3D7' }}>
              <p style={{ fontSize: '15px', fontWeight: 700, color: '#8B4C39' }}>
                {modal === 'create' ? 'Add Parish' : 'Edit Parish'}
              </p>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                ['name', 'Parish Name', true],
                ['diocese', 'Diocese', false],
                ['location', 'Location', false],
                ['contactEmail', 'Contact Email', false],
                ['contactPhone', 'Contact Phone', false],
              ].map(([key, label, required]) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                    {label}{required && ' *'}
                  </label>
                  <input
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    required={required}
                    style={{
                      width: '100%', height: '40px', borderRadius: '8px',
                      border: '1px solid #F5E3D7', padding: '0 12px',
                      fontSize: '13px', backgroundColor: 'white',
                      outline: 'none', boxSizing: 'border-box', color: '#1a0a06'
                    }}
                  />
                </div>
              ))}
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button type="submit" style={{
                  flex: 1, height: '42px', borderRadius: '8px',
                  backgroundColor: '#D3542A', color: 'white',
                  border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600
                }}>Save</button>
                <button type="button" onClick={() => setModal(null)} style={{
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
