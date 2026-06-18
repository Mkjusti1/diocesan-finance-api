import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Plus, Pencil, Trash2, Church } from 'lucide-react';
import { GET_PARISHES, CREATE_PARISH, UPDATE_PARISH, DELETE_PARISH } from '@/graphql/queries';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';

const EMPTY = { name: '', diocese: '', location: '', contactEmail: '', contactPhone: '' };

export function Parishes() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [modal, setModal] = useState(null); // null | 'create' | 'edit'
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const { data, loading } = useQuery(GET_PARISHES);
  const [createParish] = useMutation(CREATE_PARISH, { refetchQueries: [GET_PARISHES] });
  const [updateParish] = useMutation(UPDATE_PARISH, { refetchQueries: [GET_PARISHES] });
  const [deleteParish] = useMutation(DELETE_PARISH, { refetchQueries: [GET_PARISHES] });

  const openCreate = () => { setForm(EMPTY); setModal('create'); };
  const openEdit = (parish) => {
    setSelected(parish);
    setForm({ name: parish.name, diocese: parish.diocese || '', location: parish.location || '',
               contactEmail: parish.contactEmail || '', contactPhone: parish.contactPhone || '' });
    setModal('edit');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (modal === 'create') await createParish({ variables: { input: form } });
    else await updateParish({ variables: { id: selected.id, input: form } });
    setModal(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this parish? This cannot be undone.')) return;
    await deleteParish({ variables: { id } });
  };

  if (loading) return <div className="text-muted-foreground">Loading parishes...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Parishes</h1>
          <p className="text-sm text-muted-foreground mt-1">{data?.parishes.length} registered parishes</p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Add Parish
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.parishes.map(parish => (
          <Card key={parish.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Church className="h-4 w-4 text-primary" />
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(parish)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(parish.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
              <h3 className="font-semibold text-sm">{parish.name}</h3>
              {parish.diocese && <Badge variant="secondary" className="mt-1 text-xs">{parish.diocese}</Badge>}
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                {parish.location && <p>📍 {parish.location}</p>}
                {parish.contactEmail && <p>✉️ {parish.contactEmail}</p>}
                {parish.contactPhone && <p>📞 {parish.contactPhone}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold mb-4">
              {modal === 'create' ? 'Add Parish' : 'Edit Parish'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              {[['name','Parish Name',true],['diocese','Diocese'],['location','Location'],
                ['contactEmail','Contact Email'],['contactPhone','Contact Phone']].map(([key, label, required]) => (
                <div key={key}>
                  <label className="text-sm font-medium block mb-1">{label}{required && ' *'}</label>
                  <Input
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    required={required}
                  />
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1">Save</Button>
                <Button type="button" variant="outline" className="flex-1" onClick={() => setModal(null)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
