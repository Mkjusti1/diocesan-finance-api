import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client/core';
import { ArrowLeft, Building2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 2022 }, (_, i) => currentYear - i);
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const GET_PARISH_DETAIL = gql`
  query ParishDetail($id: ID!, $year: Int) {
    parish(id: $id) { id name diocese location }
    remittanceRecords(parishId: $id, year: $year) {
      id month monthName year totalAmount
      lineItems { amount source { id name } }
    }
    remittanceSources { id name }
  }
`;

export function ParishDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState(user?.role === 'PRIEST' ? 0 : currentYear);

  // Redirect priests trying to access another parish
  if (user?.role === 'PRIEST' && user?.parishId && parseInt(id) !== user.parishId) {
    navigate(`/parishes/${user.parishId}`, { replace: true });
  }

  const { data, loading } = useQuery(GET_PARISH_DETAIL, {
    variables: { id, year: selectedYear || undefined }
  });

  const parish = data?.parish;
  const records = data?.remittanceRecords || [];
  const sources = data?.remittanceSources || [];

  // Build month × collection grid
  const recordByMonth = {};
  records.forEach(r => { recordByMonth[r.month] = r; });

  const yearTotal = records.reduce((sum, r) => sum + r.totalAmount, 0);
  const monthsReported = records.length;

  const selectStyle = {
    height: '36px', borderRadius: '8px', border: '1px solid #F5E3D7',
    padding: '0 12px', fontSize: '13px', backgroundColor: 'white',
    outline: 'none', color: '#1a0a06', cursor: 'pointer', fontWeight: 500
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Back button */}
      <button onClick={() => navigate(-1)} style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: '13px', fontWeight: 600, color: '#8B4C39',
        padding: 0, width: 'fit-content'
      }}>
        <ArrowLeft size={16} strokeWidth={2.5} />
        Back
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            backgroundColor: '#F5E3D7', display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0
          }}>
            <Building2 size={22} color="#8B4C39" strokeWidth={2} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a0a06', marginBottom: '4px' }}>
              {loading ? 'Loading...' : parish?.name}
            </h1>
            <p style={{ fontSize: '13px', color: '#A7A68B' }}>
              {parish?.diocese || 'Diocese not set'}{parish?.location ? ` · ${parish.location}` : ''}
            </p>
          </div>
        </div>

        {/* Year filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#A7A68B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Year</label>
          <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} style={selectStyle}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }} className="detail-grid">
        {[
          { label: 'Total Collected', value: formatCurrency(yearTotal), color: '#D3542A', bg: '#D3542A' },
          { label: 'Months Reported', value: `${monthsReported} / 12`, color: '#8B4C39', bg: '#C89B6E' },
          { label: 'Months Missing', value: `${12 - monthsReported}`, color: '#A7A68B', bg: '#A7A68B' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} style={{
            backgroundColor: 'white', borderRadius: '12px',
            border: '1px solid #F5E3D7', borderLeft: `4px solid ${bg}`,
            padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#A7A68B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{label}</p>
            <p style={{ fontSize: '22px', fontWeight: 700, color: '#1a0a06' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Monthly breakdown table */}
      <div style={{
        backgroundColor: 'white', borderRadius: '12px',
        border: '1px solid #F5E3D7', overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #F5E3D7' }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Monthly Breakdown — {selectedYear}
          </p>
        </div>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', fontSize: '13px', color: '#A7A68B' }}>Loading...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#FFF9F2', borderBottom: '2px solid #F5E3D7' }}>
                  <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: '11px', fontWeight: 700, color: '#A7A68B', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                    Month
                  </th>
                  {sources.map(s => (
                    <th key={s.id} style={{ textAlign: 'right', padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#A7A68B', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                      {s.name}
                    </th>
                  ))}
                  <th style={{ textAlign: 'right', padding: '12px 20px', fontSize: '11px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                    Total
                  </th>
                  <th style={{ textAlign: 'center', padding: '12px 20px', fontSize: '11px', fontWeight: 700, color: '#A7A68B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {MONTHS.map((monthName, idx) => {
                  const month = idx + 1;
                  const record = recordByMonth[month];
                  const hasPaid = !!record;

                  // Build amount per source
                  const amountBySource = {};
                  record?.lineItems?.forEach(item => {
                    amountBySource[item.source.id] = item.amount;
                  });

                  return (
                    <tr key={month}
                      style={{ borderBottom: month < 12 ? '1px solid #F5E3D7' : 'none', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FFF9F2'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '13px 20px', fontSize: '13px', fontWeight: 600, color: '#1a0a06', whiteSpace: 'nowrap' }}>
                        {monthName}
                      </td>
                      {sources.map(s => (
                        <td key={s.id} style={{ padding: '13px 16px', textAlign: 'right', fontSize: '13px', color: amountBySource[s.id] ? '#1a0a06' : '#A7A68B', whiteSpace: 'nowrap' }}>
                          {amountBySource[s.id] ? formatCurrency(amountBySource[s.id]) : '—'}
                        </td>
                      ))}
                      <td style={{ padding: '13px 20px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: hasPaid ? '#D3542A' : '#A7A68B', whiteSpace: 'nowrap' }}>
                        {hasPaid ? formatCurrency(record.totalAmount) : '—'}
                      </td>
                      <td style={{ padding: '13px 20px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center',
                          padding: '3px 10px', borderRadius: '20px',
                          fontSize: '11px', fontWeight: 700,
                          backgroundColor: hasPaid ? '#dcfce7' : '#fee2e2',
                          color: hasPaid ? '#166534' : '#991b1b'
                        }}>
                          {hasPaid ? 'Paid' : 'Missing'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Totals row */}
              <tfoot>
                <tr style={{ backgroundColor: '#FFF9F2', borderTop: '2px solid #F5E3D7' }}>
                  <td style={{ padding: '13px 20px', fontSize: '12px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Total
                  </td>
                  {sources.map(s => {
                    const sourceTotal = records.reduce((sum, r) => {
                      const item = r.lineItems?.find(li => li.source.id === s.id);
                      return sum + (item?.amount || 0);
                    }, 0);
                    return (
                      <td key={s.id} style={{ padding: '13px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: '#D3542A', whiteSpace: 'nowrap' }}>
                        {sourceTotal > 0 ? formatCurrency(sourceTotal) : '—'}
                      </td>
                    );
                  })}
                  <td style={{ padding: '13px 20px', textAlign: 'right', fontSize: '14px', fontWeight: 700, color: '#D3542A', whiteSpace: 'nowrap' }}>
                    {formatCurrency(yearTotal)}
                  </td>
                  <td style={{ padding: '13px 20px', textAlign: 'center', fontSize: '12px', color: '#A7A68B' }}>
                    {monthsReported}/12 months
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
    <style>{`
      @media (max-width: 767px) {
        .detail-grid { grid-template-columns: repeat(1, 1fr) !important; }
      }
    `}</style>
  );
}
