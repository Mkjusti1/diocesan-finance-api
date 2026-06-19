import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Plus, Pencil, Trash2, Church, MapPin, Mail, Phone } from 'lucide-react';
import { GET_PARISHES, CREATE_PARISH, UPDATE_PARISH, DELETE_PARISH } from '@/graphql/queries';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';

const EMPTY = { name: '', diocese: '', location: '', contactEmail: '', contactPhone: '' };

function Select({ className, ...props }) {
  return (
    <select className={`h-10 rounded-lg border px-3 text-sm bg-white focus:outline-none focus:ring-2 ${className}`}
      style={{ borderColor: '#F5E3D7', color: '#3d1e12' }} {...props} />
  );
}

export function Parishes() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const { data, loading } = useQuery(GET_PARISHES);
  const [createParish] = useMutation(CREATE_PARISH, { refetchQueries: [GET_PARISHES] });
  const [updateParish] = useMutation(UPDATE_PARISH, { refetchQueries: [GET_PARISHES] });
  const [deleteParish] = useMutation(DELETE_PARISH, { refetchQueries: [GET_PARISHES] });

  const openEdit = (p) => {
    setSelected(p);
    setForm({ name: p.name, diocese: p.diocese || '', location: p.location || '', contactEmail: p.contactEmail || '', contactPhone: p.contactPhone || '' });
    setModal('edit');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (modal === 'create') await createParish({ variables: { input: form } });
    else await updateParish({ variables: { id: selected.id, input: form } });
    setModal(null);
  };

  if (loading) return <div className="py-16 text-center text-sm" style={{ color: '#A7A68B' }}>Loading parishes...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Parishes</h1>
          <p className="text-sm mt-0.5" style={{ color: '#A7A68B' }}>{data?.parishes.length} registered parishes</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setForm(EMPTY); setModal('create'); }}
            className="h-10 px-4 text-sm font-medium text-white rounded-lg flex items-center gap-2"
            style={{ backgroundColor: '#D3542A' }}>
            <Plus className="h-4 w-4" /> Add Parish
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {data?.parishes.map(parish => (
          <Card key={parish.id} className="hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                       style={{ backgroundColor: '#F5E3D7' }}>
                    <Church className="h-5 w-5" style={{ color: '#8B4C39' }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground leading-tight">{parish.name}</h3>
                    {parish.diocese && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block"
                            style={{ backgroundColor: '#F5E3D7', color: '#8B4C39' }}>
                        {parish.diocese}
                      </span>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(parish)}
                      className="p-1.5 rounded-lg transition-colors hover:bg-amber-50"
                      style={{ color: '#A7A68B' }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => { if (confirm('Delete this parish?')) deleteParish({ variables: { id: parish.id } }); }}
                      className="p-1.5 rounded-lg transition-colors hover:bg-red-50"
                      style={{ color: '#A7A68B' }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {parish.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#C89B6E' }} />
                    <span className="text-xs" style={{ color: '#A7A68B' }}>{parish.location}</span>
                  </div>
                )}
                {parish.contactEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#C89B6E' }} />
                    <span className="text-xs" style={{ color: '#A7A68B' }}>{parish.contactEmail}</span>
                  </div>
                )}
                {parish.contactPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#C89B6E' }} />
                    <span className="text-xs" style={{ color: '#A7A68B' }}>{parish.contactPhone}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-5 border-b" style={{ borderColor: '#F5E3D7' }}>
              <h2 className="text-base font-bold" style={{ color: '#8B4C39' }}>
                {modal === 'create' ? 'Add Parish' : 'Edit Parish'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {[
                ['name', 'Parish Name', true],
                ['diocese', 'Diocese', false],
                ['location', 'Location', false],
                ['contactEmail', 'Contact Email', false],
                ['contactPhone', 'Contact Phone', false],
              ].map(([key, label, required]) => (
                <div key={key}>
                  <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#8B4C39' }}>
                    {label}{required && ' *'}
                  </label>
                  <Input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    required={required} className="h-10 rounded-lg" style={{ borderColor: '#F5E3D7' }} />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1 h-11 font-semibold text-white rounded-lg"
                  style={{ backgroundColor: '#D3542A' }}>Save</Button>
                <Button type="button" variant="outline" className="flex-1 h-11 rounded-lg"
                  style={{ borderColor: '#F5E3D7', color: '#8B4C39' }}
                  onClick={() => setModal(null)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
