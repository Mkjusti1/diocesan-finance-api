import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, Building2, ReceiptText, ShieldAlert, FileText } from 'lucide-react';
import { GET_DASHBOARD_STATS } from '@/graphql/queries';
import { formatCurrency } from '@/lib/utils';

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 2022 }, (_, i) => currentYear - i);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        backgroundColor: 'white', border: '1px solid #F5E3D7',
        borderRadius: '8px', padding: '10px 14px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
      }}>
        <p style={{ fontSize: '12px', fontWeight: 600, color: '#3d1e12', marginBottom: '4px' }}>{label}</p>
        <p style={{ fontSize: '13px', color: '#D3542A', fontWeight: 700 }}>{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

function StatCard({ icon: Icon, label, value, sub, iconBg, borderColor }) {
  return (
    <div style={{
      backgroundColor: 'white', borderRadius: '12px',
      border: '1px solid #F5E3D7',
      borderLeft: `4px solid ${borderColor}`,
      padding: '20px 24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '11px', fontWeight: 600, color: '#A7A68B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
            {label}
          </p>
          <p style={{ fontSize: '24px', fontWeight: 700, color: '#1a0a06', marginBottom: '4px' }}>{value}</p>
          {sub && <p style={{ fontSize: '12px', color: '#A7A68B' }}>{sub}</p>}
        </div>
        <div style={{
          width: '38px', height: '38px', borderRadius: '10px',
          backgroundColor: iconBg, display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0
        }}>
          <Icon size={18} color="white" />
        </div>
      </div>
    </div>
  );
}

export function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const yearFromUrl = parseInt(searchParams.get('year')) || currentYear;
  const [selectedYear, setSelectedYear] = useState(yearFromUrl);
  const [selectedCollection, setSelectedCollection] = useState('all');
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
  const monthly = data?.monthlySummary || [];
  const parishSummaries = data?.parishSummaries || [];
  const sources = data?.remittanceSources || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* Header with year filter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1a0a06', marginBottom: '4px' }}>Dashboard</h1>
          <p style={{ fontSize: '13px', color: '#A7A68B' }}>Financial overview for {selectedYear}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {sources.length > 1 && (
            <>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#A7A68B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Collection
              </label>
              <select value={selectedCollection} onChange={e => setSelectedCollection(e.target.value)} style={selectStyle}>
                <option value="all">All Collections</option>
                {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </>
          )}
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#A7A68B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Year
          </label>
          <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} style={selectStyle}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }} className="stat-grid">
          {[1,2,3,4].map(i => (
            <div key={i} style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #F5E3D7', padding: '20px 24px', height: '96px', animation: 'pulse 1.5s infinite' }}>
              <div style={{ backgroundColor: '#F5E3D7', borderRadius: '6px', height: '12px', width: '60%', marginBottom: '12px' }} />
              <div style={{ backgroundColor: '#F5E3D7', borderRadius: '6px', height: '24px', width: '80%' }} />
            </div>
          ))}
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }`}</style>
        </div>
      ) : stats ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }} className="stat-grid">
          <StatCard icon={TrendingUp} label="Total Collected" value={formatCurrency(stats.totalCollectedThisYear)}
            sub={`${selectedYear} year to date`} iconBg="#D3542A" borderColor="#D3542A" />
          <StatCard icon={Building2} label="Total Parishes" value={stats.totalParishes}
            sub="Registered parishes" iconBg="#C89B6E" borderColor="#C89B6E" />
          <StatCard icon={ReceiptText} label="Reported This Month" value={stats.parishesReportedThisMonth}
            sub={`of ${stats.totalParishes} parishes`} iconBg="#8B4C39" borderColor="#8B4C39" />
          <StatCard icon={ShieldAlert} label="Outstanding Balance" value={formatCurrency(stats.totalOutstanding)}
            sub="Unpaid remittances" iconBg="#A7A68B" borderColor="#A7A68B" />
        </div>
      ) : null}

      {/* Monthly chart */}
      <div style={{
        backgroundColor: 'white', borderRadius: '12px',
        border: '1px solid #F5E3D7', padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Monthly Collections — {selectedYear}
          </p>
          {!loading && (
            <span style={{
              fontSize: '11px', fontWeight: 600, padding: '4px 10px',
              borderRadius: '20px', backgroundColor: '#F5E3D7', color: '#8B4C39'
            }}>
              {monthly.length} months recorded
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ height: '260px', backgroundColor: '#FFF9F2', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontSize: '13px', color: '#A7A68B' }}>Loading chart...</p>
          </div>
        ) : monthly.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '8px' }}>
            <ReceiptText size={32} color="#A7A68B" strokeWidth={1.5} />
            <p style={{ fontSize: '13px', color: '#A7A68B' }}>No data for {selectedYear}</p>
            <p style={{ fontSize: '12px', color: '#A7A68B' }}>Upload remittance records to see the chart</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthly} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F5E3D7" vertical={false} />
              <XAxis dataKey="monthName" tick={{ fontSize: 12, fill: '#A7A68B' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `₦${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#A7A68B' }} axisLine={false} tickLine={false} width={60} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#FFF9F2' }} />
              <Bar dataKey="totalCollected" fill="#C89B6E" radius={[5, 5, 0, 0]} name="Total Collected" maxBarSize={56} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Parish summaries table */}
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
        ) : parishSummaries.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', fontSize: '13px', color: '#A7A68B' }}>
            No data for {selectedYear}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#FFF9F2', borderBottom: '2px solid #F5E3D7' }}>
                  {['Parish', 'Total Collected', 'Months Reported', 'Outstanding', 'Status'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '12px 20px',
                      fontSize: '11px', fontWeight: 700, color: '#A7A68B',
                      textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parishSummaries.map((s, idx) => (
                  <tr key={s.parish.id}
                    style={{ borderBottom: idx < parishSummaries.length - 1 ? '1px solid #F5E3D7' : 'none' }}
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
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1a0a06' }}>{s.monthsReported}</span>
                        <span style={{ fontSize: '12px', color: '#A7A68B' }}>/ 12 months</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <span style={{ fontSize: '13px', fontWeight: s.outstandingBalance > 0 ? 700 : 400, color: s.outstandingBalance > 0 ? '#D3542A' : '#A7A68B' }}>
                        {s.outstandingBalance > 0 ? formatCurrency(s.outstandingBalance) : '—'}
                      </span>
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
