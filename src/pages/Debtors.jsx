import { useQuery } from '@apollo/client';
import { GET_DEBTORS } from '@/graphql/queries';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

const YEAR = new Date().getFullYear();

export function Debtors() {
  const { data, loading } = useQuery(GET_DEBTORS, { variables: { year: YEAR } });

  if (loading) return <div className="text-muted-foreground">Loading debtors...</div>;

  const debtors = data?.debtors || [];
  const unpaid = debtors.filter(d => !d.isPaid);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Debtors</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {unpaid.length} outstanding records for {YEAR}
        </p>
      </div>

      <Card>
        <CardContent className="pt-0">
          {debtors.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No debtor records for {YEAR}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {['Parish','Period','Expected','Actual','Balance','Status'].map(h => (
                      <th key={h} className="text-left py-3 px-4 font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {debtors.map(d => (
                    <tr key={d.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-medium">{d.parish.name}</td>
                      <td className="py-3 px-4">{d.monthName} {d.year}</td>
                      <td className="py-3 px-4">{formatCurrency(d.expectedAmount)}</td>
                      <td className="py-3 px-4">{formatCurrency(d.actualAmount)}</td>
                      <td className="py-3 px-4 font-semibold">{formatCurrency(d.balance)}</td>
                      <td className="py-3 px-4">
                        <Badge variant={d.isPaid ? 'success' : 'destructive'}>
                          {d.isPaid ? 'Paid' : 'Outstanding'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
