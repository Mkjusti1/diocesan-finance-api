import { useQuery } from '@apollo/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Church, TrendingUp, AlertTriangle, FileText } from 'lucide-react';
import { GET_DASHBOARD_STATS } from '@/graphql/queries';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

const YEAR = new Date().getFullYear();

function StatCard({ icon: Icon, label, value, sub, color = 'text-primary' }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg bg-primary/10 ${color}`}>
            <Icon className="h-5 w-5" />
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
      <div className="text-muted-foreground">Loading dashboard...</div>
    </div>
  );

  if (error) return (
    <div className="text-destructive">Error loading dashboard: {error.message}</div>
  );

  const stats = data.dashboardStats;
  const monthly = data.monthlySummary;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Financial overview for {YEAR}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          label="Total Collected"
          value={formatCurrency(stats.totalCollectedThisYear)}
          sub={`${YEAR} year to date`}
        />
        <StatCard
          icon={Church}
          label="Total Parishes"
          value={stats.totalParishes}
          sub="Registered parishes"
        />
        <StatCard
          icon={FileText}
          label="Reported This Month"
          value={stats.parishesReportedThisMonth}
          sub={`of ${stats.totalParishes} parishes`}
        />
        <StatCard
          icon={AlertTriangle}
          label="Outstanding Balance"
          value={formatCurrency(stats.totalOutstanding)}
          sub="Unpaid remittances"
          color="text-destructive"
        />
      </div>

      {/* Monthly chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Collections — {YEAR}</CardTitle>
        </CardHeader>
        <CardContent>
          {monthly.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              No data yet for {YEAR}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthly} margin={{ top: 4, right: 16, left: 16, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="monthName" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={v => `₦${(v/1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={v => formatCurrency(v)} labelStyle={{ fontWeight: 600 }} />
                <Bar dataKey="totalCollected" fill="hsl(221, 83%, 32%)" radius={[4, 4, 0, 0]} name="Total Collected" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {stats.recentActivity.map(record => (
                <div key={record.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{record.parish.name}</p>
                    <p className="text-xs text-muted-foreground">{record.monthName} {YEAR}</p>
                  </div>
                  <span className="text-sm font-semibold text-primary">
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
