import { useState } from 'react';
import { useQuery, useMutation } from "@apollo/client/react";
import { CreditCard, CheckCircle, ChevronDown } from 'lucide-react';
import { GET_PARISHES, GET_REMITTANCE_SOURCES, RECORD_PAYMENT, GET_REMITTANCE_RECORDS, GET_DASHBOARD_STATS } from '@/graphql/queries';
import { useAuth } from '@/context/AuthContext';

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' }, { value: 4, label: 'April' },
  { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' },
  { value: 9, label: 'September' }, { value: 10, label: 'October' },
  { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

const COLLECTION_TYPES = [
  'Rectory',
  'National Collections',
  'Harvest & Bazaar',
  'Cathedraticum',
  'Project Sunday',
  'Seminary Collections',
];

const YEAR = new Date().getFullYear();

const inputStyle = {
  width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #F5E3D7',
  padding: '0 12px', fontSize: '14px', backgroundColor: 'white', outline: 'none',
  color: '#1a0a06', boxSizing: 'border-box',
};

const selectWrapperStyle = { position: 'relative' };
const selectStyle = { ...inputStyle, appearance: 'none', cursor: 'pointer', paddingRight: '32px' };

export function RecordPayment() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    collectionType: '', parishId: '', month: '', nationalCollectionId: '',
    year: YEAR, amount: '', notes: '',
  });
  const [success, setSuccess] = useState('');

  const { data: parishesData } = useQuery(GET_PARISHES);
  const { data: sourcesData } = useQuery(GET_REMITTANCE_SOURCES);

  const [recordPayment, { loading: saving }] = useMutation(RECORD_PAYMENT, {
    refetchQueries: [
      { query: GET_REMITTANCE_RECORDS, variables: { year: form.year } },
      { query: GET_DASHBOARD_STATS, variables: { year: form.year } },
    ],
    onCompleted: () => {
      setSuccess('Payment recorded successfully.');
      setForm(f => ({ ...f, amount: '', notes: '' }));
      setTimeout(() => setSuccess(''), 3000);
    },
  });

  const isNational = form.collectionType === 'National Collections';
  const selectedSource = sourcesData?.remittanceSources?.find(s => s.name === form.collectionType);
  const collectionId = isNational ? form.nationalCollectionId : selectedSource?.id;

  const canSubmit =
    form.collectionType && form.parishId && form.year && form.amount &&
    collectionId && (isNational || form.month);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    await recordPayment({
      variables: {
        input: {
          parishId: form.parishId,
          year: parseInt(form.year),
          month: isNational ? 0 : parseInt(form.month),
          collectionId,
          amount: parseFloat(form.amount),
          notes: form.notes || undefined,
        },
      },
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '560px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1a0a06', marginBottom: '4px' }}>Record Payment</h1>
        <p style={{ fontSize: '13px', color: '#A7A68B' }}>
          Manually add or update a parish payment for any collection and month.
        </p>
      </div>

      <form onSubmit={handleSubmit}
        style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #F5E3D7', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
            Collection Type *
          </label>
          <div style={selectWrapperStyle}>
            <select value={form.collectionType}
              onChange={e => setForm(f => ({ ...f, collectionType: e.target.value, month: '', nationalCollectionId: '' }))}
              style={selectStyle} required>
              <option value="">Select collection type</option>
              {COLLECTION_TYPES.map(t => (<option key={t} value={t}>{t}</option>))}
            </select>
            <ChevronDown size={14} color="#A7A68B" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
            Parish *
          </label>
          <div style={selectWrapperStyle}>
            <select value={form.parishId} onChange={e => setForm(f => ({ ...f, parishId: e.target.value }))} style={selectStyle} required>
              <option value="">Select parish</option>
              {parishesData?.parishes?.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
            </select>
            <ChevronDown size={14} color="#A7A68B" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isNational ? '1fr 1fr' : '1fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Year *</label>
            <input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} style={inputStyle} required />
          </div>

          {isNational ? (
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>National Collection *</label>
              <div style={selectWrapperStyle}>
                <select value={form.nationalCollectionId} onChange={e => setForm(f => ({ ...f, nationalCollectionId: e.target.value }))} style={selectStyle} required>
                  <option value="">Select type</option>
                  {sourcesData?.remittanceSources?.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                </select>
                <ChevronDown size={14} color="#A7A68B" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>
          ) : (
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Month *</label>
              <div style={selectWrapperStyle}>
                <select value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} style={selectStyle} required>
                  <option value="">Select month</option>
                  {MONTHS.map(m => (<option key={m.value} value={m.value}>{m.label}</option>))}
                </select>
                <ChevronDown size={14} color="#A7A68B" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Amount (₦) *</label>
            <input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" style={inputStyle} required />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Notes</label>
          <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional note" style={inputStyle} />
        </div>

        <button type="submit" disabled={!canSubmit || saving} style={{
          height: '44px', borderRadius: '8px', border: 'none',
          backgroundColor: !canSubmit || saving ? '#F5E3D7' : '#8B4C39',
          color: 'white', fontSize: '14px', fontWeight: 600,
          cursor: !canSubmit || saving ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          transition: 'all 0.2s',
        }}>
          {saving ? (
            <><span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> Saving...</>
          ) : (
            <><CreditCard size={18} strokeWidth={2} /> Record Payment</>
          )}
        </button>

        {success && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', backgroundColor: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
            <CheckCircle size={16} color="#059669" />
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#059669' }}>{success}</p>
          </div>
        )}
      </form>
    </div>
  );
}
