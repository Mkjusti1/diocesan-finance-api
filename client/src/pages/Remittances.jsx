import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Plus, Filter } from 'lucide-react';
import { GET_REMITTANCE_RECORDS, GET_PARISHES, GET_REMITTANCE_SOURCES, CREATE_REMITTANCE } from '@/graphql/queries';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
const YEAR = new Date().getFullYear();
const MONTHS = ['','January','February','March','April','May','June','July','August','September','October','November','December'];
export function Remittances() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [filters, setFilters] = useState({ year: YEAR, month: '', parishId: '' });
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ parishId:'', year:YEAR, month:'', lineItems:{} });
  const { data, loading } = useQuery(GET_REMITTANCE_RECORDS, { variables: { year:filters.year, month:filters.month||undefined, parishId:filters.parishId||undefined } });
  const { data: parishData } = useQuery(GET_PARISHES);
  const { data: sourceData } = useQuery(GET_REMITTANCE_SOURCES);
  const [createRemittance] = useMutation(CREATE_REMITTANCE, { refetchQueries: [GET_REMITTANCE_RECORDS] });
  const handleSubmit = async (e) => {
    e.preventDefault();
    const lineItems = Object.entries(form.lineItems).filter(([,a]) => parseFloat(a) > 0).map(([remittanceSourceId, amount]) => ({ remittanceSourceId, amount: parseFloat(amount) }));
    if (!lineItems.length) return alert('Enter at least one amount');
    await createRemittance({ variables: { input: { parishId:form.parishId, year:parseInt(form.year), month:parseInt(form.month), lineItems } } });
    setModal(false); setForm({ parishId:'', year:YEAR, month:'', lineItems:{} });
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Remittances</h1><p className="text-sm text-muted-foreground mt-1">Parish remittance records</p></div>
        {isAdmin && <Button onClick={() => setModal(true)}><Plus className="h-4 w-4 mr-2" />Record Remittance</Button>}
      </div>
      <Card><CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Input type="number" placeholder="Year" value={filters.year} onChange={e => setFilters(f => ({ ...f, year:parseInt(e.target.value) }))} className="w-24" />
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={filters.month} onChange={e => setFilters(f => ({ ...f, month:e.target.value ? parseInt(e.target.value) : '' }))}>
            <option value="">All Months</option>
            {MONTHS.slice(1).map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={filters.parishId} onChange={e => setFilters(f => ({ ...f, parishId:e.target.value }))}>
            <option value="">All Parishes</option>
            {parishData?.parishes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </CardContent></Card>
      <Card><CardContent className="pt-0">
        {loading ? <div className="py-12 text-center text-muted-foreground">Loading...</div> :
         !data?.remittanceRecords.length ? <div className="py-12 text-center text-muted-foreground">No records found</div> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="border-b">{['Parish','Period','Collections','Total','Uploaded By'].map(h => <th key={h} className="text-left py-3 px-4 font-medium text-muted-foreground">{h}</th>)}</tr></thead>
            <tbody>{data.remittanceRecords.map(r => (
              <tr key={r.id} className="border-b hover:bg-muted/30 transition-colors">
                <td className="py-3 px-4 font-medium">{r.parish.name}</td>
                <td className="py-3 px-4">{r.monthName} {r.year}</td>
                <td className="py-3 px-4"><div className="flex flex-wrap gap-1">{r.lineItems.map((item,i) => <Badge key={i} variant="secondary" className="text-xs">{item.source.name}: {formatCurrency(item.amount)}</Badge>)}</div></td>
                <td className="py-3 px-4 font-semibold text-primary">{formatCurrency(r.totalAmount)}</td>
                <td className="py-3 px-4 text-muted-foreground">{r.uploadedBy?.name || '—'}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </CardContent></Card>
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Record Remittance</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium block mb-1">Parish *</label>
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.parishId} onChange={e => setForm(f => ({ ...f, parishId:e.target.value }))} required>
                    <option value="">Select parish</option>{parishData?.parishes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select></div>
                <div><label className="text-sm font-medium block mb-1">Year *</label><Input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year:e.target.value }))} required /></div>
              </div>
              <div><label className="text-sm font-medium block mb-1">Month *</label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.month} onChange={e => setForm(f => ({ ...f, month:e.target.value }))} required>
                  <option value="">Select month</option>{MONTHS.slice(1).map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
                </select></div>
              <div><label className="text-sm font-medium block mb-2">Amounts by Collection</label>
                <div className="space-y-2">{sourceData?.remittanceSources.map(s => (
                  <div key={s.id} className="flex items-center gap-3">
                    <span className="text-sm w-36 text-muted-foreground">{s.name}</span>
                    <Input type="number" min="0" step="0.01" placeholder="0" value={form.lineItems[s.id]||''} onChange={e => setForm(f => ({ ...f, lineItems:{ ...f.lineItems, [s.id]:e.target.value } }))} className="flex-1" />
                  </div>
                ))}</div></div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1">Save Record</Button>
                <Button type="button" variant="outline" className="flex-1" onClick={() => setModal(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
