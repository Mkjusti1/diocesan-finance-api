import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import { gql } from '@apollo/client/core';
import { formatCurrency } from '@/lib/utils';

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 2022 }, (_, i) => currentYear - i);
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const GET_COLLECTION_DATA = gql`
  query CollectionData($year: Int, $collectionName: String) {
    parishes { id name }
    remittanceRecords(year: $year) {
      id month year totalAmount
      parish { id name }
      lineItems { amount source { id name } }
    }
    remittanceSources { id name }
  }
`;

export function CollectionPage({ title, collectionName }) {
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const { data, loading } = useQuery(GET_COLLECTION_DATA, {
    variables: { year: selectedYear }
  });

  // Find the matching collection
  const source = data?.remittanceSources?.find(s =>
    s.name.toLowerCase() === collectionName.toLowerCase()
  );

  // Filter records that have this collection
  const records = (data?.remittanceRecords || []).filter(r =>
    r.lineItems?.some(item => item.source.name.toLowerCase() === collectionName.toLowerCase())
  );

  // Build parish × month grid
  const parishes = data?.parishes || [];
  const grid = {};
  records.forEach(r => {
    const item = r.lineItems?.find(li => li.source.name.toLowerCase() === collectionName.toLowerCase());
    if (!grid[r.parish.id]) grid[r.parish.id] = {};
    grid[r.parish.id][r.month] = item?.amount || 0;
  });

  const grandTotal = records.reduce((sum, r) => {
    const item = r.lineItems?.find(li => li.source.name.toLowerCase() === collectionName.toLowerCase());
    return sum + (item?.amount || 0);
  }, 0);

  const selectStyle = {
    height: '36px', borderRadius: '8px', border: '1px solid #F5E3D7',
    padding: '0 12px', fontSize: '13px', backgroundColor: 'white',
    outline: 'none', color: '#1a0a06', cursor: 'pointer', fontWeight: 500
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1a0a06', marginBottom: '4px' }}>{title}</h1>
          <p style={{ fontSize: '13px', color: '#A7A68B' }}>
            {loading ? 'Loading...' : `${records.length} records · ${parishes.length} parishes`}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#A7A68B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Year</label>
          <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} style={selectStyle}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
        {[
          { label: 'Total Collected', value: formatCurrency(grandTotal), color: '#D3542A' },
          { label: 'Parishes Paid', value: Object.keys(grid).length, color: '#C89B6E' },
          { label: 'Parishes Missing', value: parishes.length - Object.keys(grid).length, color: '#A7A68B' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            backgroundColor: 'white', borderRadius: '12px',
            border: '1px solid #F5E3D7', borderLeft: `4px solid ${color}`,
            padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#A7A68B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{label}</p>
            <p style={{ fontSize: '22px', fontWeight: 700, color: '#1a0a06' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #F5E3D7', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #F5E3D7', backgroundColor: '#FFF9F2' }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Parish Breakdown — {selectedYear}
          </p>
        </div>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', fontSize: '13px', color: '#A7A68B' }}>Loading...</div>
        ) : !source ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#8B4C39', marginBottom: '8px' }}>
              No "{title}" collection found
            </p>
            <p style={{ fontSize: '13px', color: '#A7A68B' }}>
              Upload a file with this collection type to see data here
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#FFF9F2', borderBottom: '2px solid #F5E3D7' }}>
                  <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: '11px', fontWeight: 700, color: '#A7A68B', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', position: 'sticky', left: 0, backgroundColor: '#FFF9F2' }}>
                    Parish
                  </th>
                  {MONTHS.map(m => (
                    <th key={m} style={{ textAlign: 'right', padding: '12px 10px', fontSize: '11px', fontWeight: 700, color: '#A7A68B', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                      {m}
                    </th>
                  ))}
                  <th style={{ textAlign: 'right', padding: '12px 20px', fontSize: '11px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {parishes.map((parish, idx) => {
                  const monthData = grid[parish.id] || {};
                  const parishTotal = Object.values(monthData).reduce((s, v) => s + v, 0);
                  return (
                    <tr key={parish.id}
                      style={{ borderBottom: idx < parishes.length - 1 ? '1px solid #F5E3D7' : 'none', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FFF9F2'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '11px 20px', fontSize: '13px', fontWeight: 600, color: '#1a0a06', whiteSpace: 'nowrap', position: 'sticky', left: 0, backgroundColor: 'inherit', cursor: 'pointer' }}
                        onClick={() => navigate(`/parishes/${parish.id}`)}>
                        {parish.name}
                      </td>
                      {MONTHS.map((_, i) => {
                        const amount = monthData[i + 1];
                        return (
                          <td key={i} style={{ padding: '11px 10px', textAlign: 'right', fontSize: '12px', color: amount ? '#1a0a06' : '#E5D5CD', whiteSpace: 'nowrap' }}>
                            {amount ? formatCurrency(amount) : '—'}
                          </td>
                        );
                      })}
                      <td style={{ padding: '11px 20px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: parishTotal > 0 ? '#D3542A' : '#A7A68B', whiteSpace: 'nowrap' }}>
                        {parishTotal > 0 ? formatCurrency(parishTotal) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#FFF9F2', borderTop: '2px solid #F5E3D7' }}>
                  <td style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase' }}>Grand Total</td>
                  {MONTHS.map((_, i) => {
                    const monthTotal = parishes.reduce((sum, p) => sum + (grid[p.id]?.[i + 1] || 0), 0);
                    return (
                      <td key={i} style={{ padding: '12px 10px', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: monthTotal > 0 ? '#D3542A' : '#A7A68B', whiteSpace: 'nowrap' }}>
                        {monthTotal > 0 ? formatCurrency(monthTotal) : '—'}
                      </td>
                    );
                  })}
                  <td style={{ padding: '12px 20px', textAlign: 'right', fontSize: '14px', fontWeight: 700, color: '#D3542A', whiteSpace: 'nowrap' }}>
                    {formatCurrency(grandTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
