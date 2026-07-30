import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { GET_DASHBOARD_STATS } from '@/graphql/queries';
import { formatCurrency } from '@/lib/utils';

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 2022 }, (_, i) => currentYear - i);

export function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const yearFromUrl = parseInt(searchParams.get('year')) || currentYear;
  const [selectedYear, setSelectedYear] = useState(yearFromUrl);
  const navigate = useNavigate();

  useEffect(() => {
    setSearchParams({ year: selectedYear }, { replace: true });
  }, [selectedYear]);

  const { data, loading, error } = useQuery(GET_DASHBOARD_STATS, {
    variables: { year: selectedYear },
  });

  const selectStyle = {
    height: '36px', borderRadius: '8px', border: '1px solid #F5E3D7',
    padding: '0 12px', fontSize: '13px', backgroundColor: 'white',
    outline: 'none', color: '#1a0a06', cursor: 'pointer',
    fontWeight: 500
  };

  if (error) return (
    <div style={{ backgroundColor: '#F5E3D7', color: '#8B4C39', borderRadius: '10px', padding: '16px', fontSize: '13px' }}>
      Error: {error.message}
    </div>
  );

  const stats = data?.dashboardStats;
  const parishSummaries = data?.parishSummaries || [];

  const sortedParishSummaries = [...parishSummaries].sort((a, b) => (b.totalCollected || 0) - (a.totalCollected || 0));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1a0a06', marginBottom: '4px' }}>Dashboard</h1>
          <p style={{ fontSize: '13px', color: '#A7A68B' }}>Financial overview for {selectedYear}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#A7A68B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Year
          </label>
          <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} style={selectStyle}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }} className="stat-grid">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #F5E3D7', padding: '20px 24px', height: '96px', animation: 'pulse 1.5s infinite' }}>
              <div style={{ backgroundColor: '#F5E3D7', borderRadius: '6px', height: '12px', width: '60%', marginBottom: '12px' }} />
              <div style={{ backgroundColor: '#F5E3D7', borderRadius: '6px', height: '24px', width: '80%' }} />
            </div>
          ))}
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }`}</style>
        </div>
      ) : stats ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }} className="stat-grid">
            {stats.collectionSummaries?.map((cs) => (
              <div key={cs.collection.id} style={{
                backgroundColor: 'white', borderRadius: '12px',
                border: '1px solid #F5E3D7',
                borderLeft: '4px solid #D3542A',
                padding: '20px 24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}>
                <p style={{
                  fontSize: '13px', fontWeight: 700, color: '#1a0a06',
                  marginBottom: '8px', letterSpacing: '0.02em'
                }}>
                  {cs.collection.name}
                </p>
                <p style={{ fontSize: '22px', fontWeight: 700, color: '#D3542A' }}>
                  {formatCurrency(cs.totalCollected)}
                </p>
              </div>
            ))}
          </div>
          <div style={{
            backgroundColor: 'white', borderRadius: '12px',
            border: '1px solid #F5E3D7',
            borderLeft: '4px solid #C89B6E',
            padding: '20px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            textAlign: 'center'
          }}>
            <p style={{
              fontSize: '11px', fontWeight: 600, color: '#A7A68B',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px'
            }}>
              Total Collected
            </p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: '#1a0a06', marginBottom: '4px' }}>
              {formatCurrency(stats.totalCollectedThisYear)}
            </p>
            <p style={{ fontSize: '12px', color: '#A7A68B' }}>{selectedYear} year to date</p>
          </div>
        </>
      ) : null}

      <div style={{
        backgroundColor: 'white', borderRadius: '12px',
        border: '1px solid #F5E3D7', overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F5E3D7' }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Parish Summaries — {selectedYear}
          </p>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', fontSize: '13px', color: '#A7A68B' }}>Loading...</div>
        ) : sortedParishSummaries.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', fontSize: '13px', color: '#A7A68B' }}>
            No data for {selectedYear}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#FFF9F2', borderBottom: '2px solid #F5E3D7' }}>
                  {['Parish', 'Total Collected', 'Months Reported', 'Status'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '12px 20px',
                      fontSize: '11px', fontWeight: 700, color: '#A7A68B',
                      textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedParishSummaries.map((s, idx) => (
                  <tr key={s.parish.id}
                    style={{ borderBottom: idx < sortedParishSummaries.length - 1 ? '1px solid #F5E3D7' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FFF9F2'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                          backgroundColor: '#F5E3D7', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#8B4C39'
                        }}>
                          {s.parish.name.charAt(0)}
                        </div>
                        <span
                          onClick={() => navigate(`/parishes/${s.parish.id}`)}
                          style={{ fontSize: '13px', fontWeight: 600, color: '#1a0a06', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: '#F5E3D7' }}
                          onMouseEnter={e => e.target.style.color = '#D3542A'}
                          onMouseLeave={e => e.target.style.color = '#1a0a06'}
                        >{s.parish.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#D3542A' }}>
                        {formatCurrency(s.totalCollected)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#8B4C39' }}>{s.monthsReported}</span>
                        <span style={{ fontSize: '12px', color: '#A7A68B' }}>/ 12 months</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        padding: '3px 10px', borderRadius: '20px',
                        fontSize: '11px', fontWeight: 700,
                        backgroundColor: s.monthsReported === 12 ? '#dcfce7' : s.monthsReported > 0 ? '#fef3c7' : '#fee2e2',
                        color: s.monthsReported === 12 ? '#166534' : s.monthsReported > 0 ? '#92400e' : '#991b1b'
                      }}>
                        {s.monthsReported === 12 ? 'Complete' : s.monthsReported > 0 ? 'Partial' : 'Missing'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
