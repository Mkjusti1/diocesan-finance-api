import { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { gql } from '@apollo/client/core';
import { formatCurrency } from '@/lib/utils';

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 2022 }, (_, i) => currentYear - i);

const GET_NATIONAL_DATA = gql`
  query NationalData {
    parishes { id name }
    remittanceSources { id name }
    remittanceRecords {
      id month year
      parish { id name }
      lineItems { amount source { id name } }
    }
  }
`;

export function NationalCollectionsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const yearFromUrl = parseInt(searchParams.get('year')) || currentYear;
  const [selectedYear, setSelectedYear] = useState(yearFromUrl);

  useEffect(() => {
    setSearchParams({ year: selectedYear }, { replace: true });
  }, [selectedYear]);

  const { data, loading, error, refetch } = useQuery(GET_NATIONAL_DATA, { errorPolicy: 'all' });

  const parishes = data?.parishes || [];
  const allSources = data?.remittanceSources || [];
  const allRecords = data?.remittanceRecords || [];

  // Get only annual records (month=0) for selected year
  const annualRecords = allRecords.filter(r => r.month === 0 && r.year === selectedYear);

  // Get sources that appear in annual records
  const nationalSourceIds = new Set();
  annualRecords.forEach(r => r.lineItems?.forEach(li => nationalSourceIds.add(li.source.id)));
  const nationalSources = allSources.filter(s => nationalSourceIds.has(s.id));

  // Build parish × collection grid
  const grid = {};
  annualRecords.forEach(r => {
    r.lineItems?.forEach(li => {
      if (!grid[r.parish.id]) grid[r.parish.id] = {};
      grid[r.parish.id][li.source.id] = li.amount;
    });
  });

  // Totals
  const collectionTotals = {};
  nationalSources.forEach(s => {
    collectionTotals[s.id] = parishes.reduce((sum, p) => sum + (grid[p.id]?.[s.id] || 0), 0);
  });
  const grandTotal = Object.values(collectionTotals).reduce((s, v) => s + v, 0);

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
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1a0a06', marginBottom: '4px' }}>National Collections</h1>
          <p style={{ fontSize: '13px', color: '#A7A68B' }}>
            {loading ? 'Loading...' : `${nationalSources.length} collection types · ${parishes.length} parishes`}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#A7A68B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Year</label>
          <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} style={selectStyle}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '10px',
          padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px'
        }}>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#B91C1C' }}>Couldn't load National Collections data</p>
            <p style={{ fontSize: '12px', color: '#991B1B', marginTop: '2px' }}>{error.message}</p>
          </div>
          <button onClick={() => refetch()} style={{
            padding: '8px 14px', borderRadius: '8px', border: '1px solid #FCA5A5',
            backgroundColor: 'white', color: '#B91C1C', fontSize: '12px', fontWeight: 700, cursor: 'pointer'
          }}>Retry</button>
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
        {[
          { label: 'Grand Total', value: formatCurrency(grandTotal), color: '#D3542A' },
          { label: 'Collection Types', value: nationalSources.length, color: '#C89B6E' },
          { label: 'Parishes Reported', value: Object.keys(grid).length, color: '#8B4C39' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            backgroundColor: 'white', borderRadius: '12px', border: '1px solid #F5E3D7',
            borderLeft: `4px solid ${color}`, padding: '18px 20px'
          }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#A7A68B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{label}</p>
            <p style={{ fontSize: '22px', fontWeight: 700, color: '#1a0a06' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Collection totals summary */}
      {!loading && nationalSources.length > 0 && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #F5E3D7', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #F5E3D7', backgroundColor: '#FFF9F2' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Collection Totals — {selectedYear}
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1px', backgroundColor: '#F5E3D7' }}>
            {nationalSources.map(s => (
              <div key={s.id} style={{ padding: '14px 20px', backgroundColor: 'white' }}>
                <p style={{ fontSize: '12px', color: '#A7A68B', marginBottom: '4px' }}>{s.name}</p>
                <p style={{ fontSize: '16px', fontWeight: 700, color: '#D3542A' }}>{formatCurrency(collectionTotals[s.id] || 0)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Parish × Collection table */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #F5E3D7', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #F5E3D7', backgroundColor: '#FFF9F2' }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Parish Breakdown — {selectedYear}
          </p>
        </div>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', fontSize: '13px', color: '#A7A68B' }}>Loading...</div>
        ) : nationalSources.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#8B4C39', marginBottom: '8px' }}>No National Collections data for {selectedYear}</p>
            <p style={{ fontSize: '13px', color: '#A7A68B' }}>Upload a National Collections file for this year</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#FFF9F2', borderBottom: '2px solid #F5E3D7' }}>
                  <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', fontWeight: 700, color: '#A7A68B', textTransform: 'uppercase', whiteSpace: 'nowrap', position: 'sticky', left: 0, backgroundColor: '#FFF9F2', minWidth: '180px' }}>
                    Parish
                  </th>
                  {nationalSources.map(s => (
                    <th key={s.id} style={{ textAlign: 'right', padding: '10px 12px', fontSize: '10px', fontWeight: 700, color: '#A7A68B', textTransform: 'uppercase', whiteSpace: 'nowrap', minWidth: '100px' }}>
                      {s.name}
                    </th>
                  ))}
                  <th style={{ textAlign: 'right', padding: '10px 20px', fontSize: '11px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {parishes.map((parish, idx) => {
                  const parishData = grid[parish.id] || {};
                  const parishTotal = Object.values(parishData).reduce((s, v) => s + v, 0);
                  return (
                    <tr key={parish.id}
                      style={{ borderBottom: idx < parishes.length - 1 ? '1px solid #F5E3D7' : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FFF9F2'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '10px 20px', fontSize: '12px', fontWeight: 600, color: '#1a0a06', whiteSpace: 'nowrap', cursor: 'pointer', position: 'sticky', left: 0, backgroundColor: 'inherit' }}
                        onClick={() => navigate(`/parishes/${parish.id}?year=${selectedYear}`)}>
                        {parish.name}
                      </td>
                      {nationalSources.map(s => (
                        <td key={s.id} style={{ padding: '10px 12px', textAlign: 'right', fontSize: '12px', color: parishData[s.id] ? '#1a0a06' : '#E5D5CD', whiteSpace: 'nowrap' }}>
                          {parishData[s.id] ? formatCurrency(parishData[s.id]) : '—'}
                        </td>
                      ))}
                      <td style={{ padding: '10px 20px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: parishTotal > 0 ? '#D3542A' : '#A7A68B', whiteSpace: 'nowrap' }}>
                        {parishTotal > 0 ? formatCurrency(parishTotal) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#FFF9F2', borderTop: '2px solid #F5E3D7' }}>
                  <td style={{ padding: '10px 20px', fontSize: '11px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', position: 'sticky', left: 0, backgroundColor: '#FFF9F2' }}>
                    Total
                  </td>
                  {nationalSources.map(s => (
                    <td key={s.id} style={{ padding: '10px 12px', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: collectionTotals[s.id] > 0 ? '#D3542A' : '#A7A68B', whiteSpace: 'nowrap' }}>
                      {collectionTotals[s.id] > 0 ? formatCurrency(collectionTotals[s.id]) : '—'}
                    </td>
                  ))}
                  <td style={{ padding: '10px 20px', textAlign: 'right', fontSize: '14px', fontWeight: 700, color: '#D3542A', whiteSpace: 'nowrap' }}>
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