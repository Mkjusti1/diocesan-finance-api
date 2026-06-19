import { useQuery } from '@apollo/client/react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, Building2, ReceiptText, ShieldAlert, FileText } from 'lucide-react';
import { GET_DASHBOARD_STATS } from '@/graphql/queries';
import { formatCurrency } from '@/lib/utils';

const YEAR = new Date().getFullYear();

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        backgroundColor: 'white', border: '1px solid #F5E3D7',
        borderRadius: '8px', padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
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
  const { data, loading, error } = useQuery(GET_DASHBOARD_STATS, {
    variables: { year: YEAR },
  });

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '240px', flexDirection: 'column', gap: '12px' }}>
      <div style={{
        width: '28px', height: '28px', borderRadius: '50%',
        border: '2px solid #D3542A', borderTopColor: 'transparent',
        animation: 'spin 0.8s linear infinite'
      }} />
      <p style={{ fontSize: '13px', color: '#A7A68B' }}>Loading dashboard...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ backgroundColor: '#F5E3D7', color: '#8B4C39', borderRadius: '10px', padding: '16px', fontSize: '13px' }}>
      Error: {error.message}
    </div>
  );

  const stats = data.dashboardStats;
  const monthly = data.monthlySummary;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1a0a06', marginBottom: '4px' }}>Dashboard</h1>
          <p style={{ fontSize: '13px', color: '#A7A68B' }}>Financial overview for {YEAR}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '11px', fontWeight: 600, color: '#A7A68B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Year</p>
          <p style={{ fontSize: '28px', fontWeight: 700, color: '#C89B6E', lineHeight: 1.1 }}>{YEAR}</p>
        </div>
      </div>

      {/* Stat cards — 4 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <StatCard icon={TrendingUp} label="Total Collected" value={formatCurrency(stats.totalCollectedThisYear)}
          sub={`${YEAR} year to date`} iconBg="#D3542A" borderColor="#D3542A" />
        <StatCard icon={Building2} label="Total Parishes" value={stats.totalParishes}
          sub="Registered parishes" iconBg="#C89B6E" borderColor="#C89B6E" />
        <StatCard icon={ReceiptText} label="Reported This Month" value={stats.parishesReportedThisMonth}
          sub={`of ${stats.totalParishes} parishes`} iconBg="#8B4C39" borderColor="#8B4C39" />
        <StatCard icon={ShieldAlert} label="Outstanding Balance" value={formatCurrency(stats.totalOutstanding)}
          sub="Unpaid remittances" iconBg="#A7A68B" borderColor="#A7A68B" />
      </div>

      {/* Chart */}
      <div style={{
        backgroundColor: 'white', borderRadius: '12px',
        border: '1px solid #F5E3D7', padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Monthly Collections — {YEAR}
          </p>
          <span style={{
            fontSize: '11px', fontWeight: 600, padding: '4px 10px',
            borderRadius: '20px', backgroundColor: '#F5E3D7', color: '#8B4C39'
          }}>
            {monthly.length} months recorded
          </span>
        </div>

        {monthly.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', flexDirection: 'column', gap: '8px' }}>
            <ReceiptText size={32} color="#A7A68B" />
            <p style={{ fontSize: '13px', color: '#A7A68B' }}>No data yet for {YEAR}</p>
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

      {/* Recent Activity */}
      <div style={{
        backgroundColor: 'white', borderRadius: '12px',
        border: '1px solid #F5E3D7', overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F5E3D7' }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Recent Activity
          </p>
        </div>

        {stats.recentActivity.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: '#A7A68B' }}>No recent activity</p>
          </div>
        ) : (
          <div>
            {stats.recentActivity.map((record, index) => (
              <div key={record.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 24px',
                borderBottom: index < stats.recentActivity.length - 1 ? '1px solid #F5E3D7' : 'none',
                transition: 'background-color 0.1s'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FFF9F2'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    backgroundColor: '#F5E3D7', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '13px', fontWeight: 700,
                    color: '#8B4C39', flexShrink: 0
                  }}>
                    {record.parish.name.charAt(0)}
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#1a0a06', marginBottom: '2px' }}>
                      {record.parish.name}
                    </p>
                    <p style={{ fontSize: '12px', color: '#A7A68B' }}>
                      {record.monthName} {YEAR}
                    </p>
                  </div>
                </div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#D3542A' }}>
                  {formatCurrency(record.totalAmount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
