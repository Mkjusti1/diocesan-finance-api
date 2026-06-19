import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Plus, Filter } from 'lucide-react';
import { GET_REMITTANCE_RECORDS, GET_PARISHES, GET_REMITTANCE_SOURCES, CREATE_REMITTANCE } from '@/graphql/queries';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

const YEAR = new Date().getFullYear();
const MONTHS = ['','January','February','March','April','May','June','July','August','September','October','November','December'];

const inputStyle = {
  height: '38px', borderRadius: '8px', border: '1px solid #F5E3D7',
  padding: '0 12px', fontSize: '13px', backgroundColor: 'white',
  outline: 'none', color: '#1a0a06'
};

const selectStyle = {
  height: '38px', borderRadius: '8px', border: '1px solid #F5E3D7',
  padding: '0 12px', fontSize: '13px', backgroundColor: 'white',
  outline: 'none', color: '#1a0a06', cursor: 'pointer'
};

export function Remittances() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [filters, setFilters] = useState({ year: YEAR, month: '', parishId: '' });
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ parishId: '', year: YEAR, month: '', lineItems: {} });

  const { data, loading } = useQuery(GET_REMITTANCE_RECORDS, {
    variables: {
      year: filters.year || undefined,
      month: filters.month ? parseInt(filters.month) : undefined,
      parishId: filters.parishId || undefined
    }
  });
  const { data: parishData } = useQuery(GET_PARISHES);
  const { data: sourceData } = useQuery(GET_REMITTANCE_SOURCES);
  const [createRemittance] = useMutation(CREATE_REMITTANCE, { refetchQueries: [GET_REMITTANCE_RECORDS] });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const lineItems = Object.entries(form.lineItems)
      .filter(([, a]) => parseFloat(a) > 0)
      .map(([remittanceSourceId, amount]) => ({ remittanceSourceId, amount: parseFloat(amount) }));
    if (!lineItems.length) return alert('Enter at least one amount');
    await createRemittance({
      variables: { input: { parishId: form.parishId, year: parseInt(form.year), month: parseInt(form.month), lineItems } }
    });
    setModal(false);
    setForm({ parishId: '', year: YEAR, month: '', lineItems: {} });
  };

  const records = data?.remittanceRecords || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1a0a06', marginBottom: '4px' }}>Remittances</h1>
          <p style={{ fontSize: '13px', color: '#A7A68B' }}>
            {loading ? 'Loading...' : `${records.length} record${records.length !== 1 ? 's' : ''} found`}
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setModal(true)} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            height: '40px', padding: '0 16px', borderRadius: '8px',
            backgroundColor: '#D3542A', color: 'white',
            border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600
          }}>
            <Plus size={15} /> Record Remittance
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
        padding: '16px 20px', borderRadius: '10px',
        backgroundColor: 'white', border: '1px solid #F5E3D7'
      }}>
        <Filter size={15} color="#A7A68B" style={{ flexShrink: 0 }} />
        <input
          type="number" placeholder="Year" value={filters.year}
          onChange={e => setFilters(f => ({ ...f, year: parseInt(e.target.value) }))}
          style={{ ...inputStyle, width: '90px' }}
        />
        <select value={filters.month}
          onChange={e => setFilters(f => ({ ...f, month: e.target.value }))}
          style={selectStyle}>
          <option value="">All Months</option>
          {MONTHS.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <select value={filters.parishId}
          onChange={e => setFilters(f => ({ ...f, parishId: e.target.value }))}
          style={selectStyle}>
          <option value="">All Parishes</option>
          {parishData?.parishes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {(filters.month || filters.parishId) && (
          <button onClick={() => setFilters({ year: YEAR, month: '', parishId: '' })}
            style={{ fontSize: '12px', color: '#D3542A', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{
        backgroundColor: 'white', borderRadius: '12px',
        border: '1px solid #F5E3D7', overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', fontSize: '13px', color: '#A7A68B' }}>Loading records...</div>
        ) : records.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#8B4C39', marginBottom: '4px' }}>No records found</p>
            <p style={{ fontSize: '12px', color: '#A7A68B' }}>Try adjusting your filters</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#FFF9F2', borderBottom: '2px solid #F5E3D7' }}>
                  {['Parish', 'Period', 'Collections', 'Total', 'Uploaded By'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '12px 20px',
                      fontSize: '11px', fontWeight: 700, color: '#A7A68B',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      whiteSpace: 'nowrap'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r, idx) => (
                  <tr key={r.id} style={{
                    borderBottom: idx < records.length - 1 ? '1px solid #F5E3D7' : 'none',
                    transition: 'background-color 0.1s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FFF9F2'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {/* Parish */}
                    <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                          backgroundColor: '#F5E3D7', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#8B4C39'
                        }}>
                          {r.parish.name.charAt(0)}
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1a0a06' }}>{r.parish.name}</span>
                      </div>
                    </td>
                    {/* Period */}
                    <td style={{ padding: '14px 20px', fontSize: '13px', color: '#3d1e12', whiteSpace: 'nowrap' }}>
                      {r.monthName} {r.year}
                    </td>
                    {/* Collections */}
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {r.lineItems.map((item, i) => (
                          <span key={i} style={{
                            fontSize: '11px', fontWeight: 600, padding: '3px 8px',
                            borderRadius: '20px', backgroundColor: '#F5E3D7', color: '#8B4C39',
                            whiteSpace: 'nowrap'
                          }}>
                            {item.source.name}: {formatCurrency(item.amount)}
                          </span>
                        ))}
                      </div>
                    </td>
                    {/* Total */}
                    <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#D3542A' }}>
                        {formatCurrency(r.totalAmount)}
                      </span>
                    </td>
                    {/* Uploaded by */}
                    <td style={{ padding: '14px 20px', fontSize: '13px', color: '#A7A68B', whiteSpace: 'nowrap' }}>
                      {r.uploadedBy?.name || '—'}
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
          <div style={{
            backgroundColor: 'white', borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #F5E3D7', position: 'sticky', top: 0, backgroundColor: 'white' }}>
              <p style={{ fontSize: '15px', fontWeight: 700, color: '#8B4C39' }}>Record Remittance</p>
              <p style={{ fontSize: '12px', color: '#A7A68B', marginTop: '2px' }}>Enter collection amounts for a parish</p>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Parish *</label>
                  <select value={form.parishId} onChange={e => setForm(f => ({ ...f, parishId: e.target.value }))} required
                    style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' }}>
                    <option value="">Select parish</option>
                    {parishData?.parishes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Year *</label>
                  <input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} required
                    style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Month *</label>
                <select value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} required
                  style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' }}>
                  <option value="">Select month</option>
                  {MONTHS.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                  Amounts by Collection
                </label>
                <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid #F5E3D7' }}>
                  {sourceData?.remittanceSources.map((s, idx) => (
                    <div key={s.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 16px',
                      backgroundColor: idx % 2 === 0 ? '#FFF9F2' : 'white',
                      borderBottom: idx < sourceData.remittanceSources.length - 1 ? '1px solid #F5E3D7' : 'none'
                    }}>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#8B4C39' }}>{s.name}</span>
                      <input
                        type="number" min="0" step="0.01" placeholder="0"
                        value={form.lineItems[s.id] || ''}
                        onChange={e => setForm(f => ({ ...f, lineItems: { ...f.lineItems, [s.id]: e.target.value } }))}
                        style={{ ...inputStyle, width: '130px', textAlign: 'right', boxSizing: 'border-box' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button type="submit" style={{
                  flex: 1, height: '42px', borderRadius: '8px',
                  backgroundColor: '#D3542A', color: 'white',
                  border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600
                }}>Save Record</button>
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
