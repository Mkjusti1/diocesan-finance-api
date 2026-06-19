import { useQuery } from '@apollo/client/react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Church, TrendingUp, AlertTriangle, FileText } from 'lucide-react';
import { GET_DASHBOARD_STATS } from '@/graphql/queries';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

const YEAR = new Date().getFullYear();

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-border rounded-lg shadow-lg px-4 py-3">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-sm mt-1" style={{ color: '#D3542A' }}>
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

function StatCard({ icon: Icon, label, value, sub, accentClass, iconBg }) {
  return (
    <Card className={accentClass}>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#A7A68B' }}>{label}</p>
            <p className="text-2xl font-bold mt-1.5 text-foreground">{value}</p>
            {sub && <p className="text-xs mt-1" style={{ color: '#A7A68B' }}>{sub}</p>}
          </div>
          <div className="p-2.5 rounded-lg" style={{ backgroundColor: iconBg }}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const { data, loading, error } = useQuery(GET_DASHBOARD_STATS, {
    variables: { year: YEAR },
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-ember border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: '#D3542A', borderTopColor: 'transparent' }} />
        <p className="text-sm" style={{ color: '#A7A68B' }}>Loading dashboard...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
      Error loading dashboard: {error.message}
    </div>
  );

  const stats = data.dashboardStats;
  const monthly = data.monthlySummary;

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: '#A7A68B' }}>Financial overview for {YEAR}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#A7A68B' }}>Year</p>
          <p className="text-2xl font-bold" style={{ color: '#C89B6E' }}>{YEAR}</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp} label="Total Collected" value={formatCurrency(stats.totalCollectedThisYear)}
          sub={`${YEAR} year to date`} accentClass="stat-card-ember" iconBg="#D3542A" />
        <StatCard icon={Church} label="Total Parishes" value={stats.totalParishes}
          sub="Registered parishes" accentClass="stat-card-gold" iconBg="#C89B6E" />
        <StatCard icon={FileText} label="Reported This Month" value={stats.parishesReportedThisMonth}
          sub={`of ${stats.totalParishes} parishes`} accentClass="stat-card-mahogany" iconBg="#8B4C39" />
        <StatCard icon={AlertTriangle} label="Outstanding Balance" value={formatCurrency(stats.totalOutstanding)}
          sub="Unpaid remittances" accentClass="stat-card-sage" iconBg="#A7A68B" />
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Monthly Collections — {YEAR}</CardTitle>
            <span className="text-xs font-medium px-2 py-1 rounded" style={{ backgroundColor: '#F5E3D7', color: '#8B4C39' }}>
              {monthly.length} months recorded
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {monthly.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2">
              <FileText className="h-8 w-8" style={{ color: '#A7A68B' }} />
              <p className="text-sm" style={{ color: '#A7A68B' }}>No data yet for {YEAR}</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthly} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F5E3D7" vertical={false} />
                <XAxis dataKey="monthName" tick={{ fontSize: 12, fill: '#A7A68B' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `₦${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#A7A68B' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F5E3D7' }} />
                <Bar dataKey="totalCollected" fill="#C89B6E" radius={[4, 4, 0, 0]} name="Total Collected" maxBarSize={52} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Recent activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentActivity.length === 0 ? (
            <p className="text-sm" style={{ color: '#A7A68B' }}>No recent activity</p>
          ) : (
            <div className="space-y-0">
              {stats.recentActivity.map((record, index) => (
                <div key={record.id} className={cn(
                  'flex items-center justify-between py-3',
                  index < stats.recentActivity.length - 1 ? 'border-b border-border' : ''
                )}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                         style={{ backgroundColor: '#F5E3D7', color: '#8B4C39' }}>
                      {record.parish.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{record.parish.name}</p>
                      <p className="text-xs" style={{ color: '#A7A68B' }}>{record.monthName} {YEAR}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: '#D3542A' }}>
                    {formatCurrency(record.totalAmount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function cn(...classes) { return classes.filter(Boolean).join(' '); }
