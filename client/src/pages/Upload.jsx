import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Plus, SkipForward, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const YEAR = new Date().getFullYear();

const API_URL = import.meta.env.VITE_API_URL || '';

export function UploadPage() {
  const { user } = useAuth();
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [year, setYear] = useState(YEAR);
  const [format] = useState('horizontal');
  const [collectionName, setCollectionName] = useState('');
  const [step, setStep] = useState('idle'); // idle | previewing | preview_done | uploading | done | error
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const getToken = () => window.__authToken__;

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (f) { setFile(f); setStep('idle'); setPreview(null); setResult(null); setError(''); }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); setStep('idle'); setPreview(null); setResult(null); setError(''); }
  };

  const runPreview = async () => {
    if (!file || !year) return;
    setStep('previewing');
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('year', year);

    try {
      const res = await fetch(`${API_URL}/api/upload/preview`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch(e) { throw new Error('Server returned invalid response'); }
      if (!res.ok) throw new Error(data.error || 'Preview failed');
      setPreview(data.preview);
      setStep('preview_done');
    } catch (err) {
      setError(err.message);
      setStep('error');
    }
  };

  const runUpload = async () => {
    if (!file || !year) return;
    setStep('uploading');
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('year', year);

    try {
      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch(e) { throw new Error('Server returned invalid response'); }
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setResult(data);
      setStep('done');
    } catch (err) {
      setError(err.message);
      setStep('error');
    }
  };

  const runHorizontalUpload = async () => {
    if (!file || !year || !collectionName) return;
    setStep('uploading');
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('year', year);
    formData.append('collectionName', collectionName);

    try {
      const res = await fetch(`${API_URL}/api/upload/horizontal`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch(e) { throw new Error('Server returned invalid response'); }
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setResult(data);
      setStep('done');
    } catch (err) {
      setError(err.message);
      setStep('error');
    }
  };

  const reset = () => {
    setFile(null);
    setYear(YEAR);
    setFormat('horizontal');
    setCollectionName('');
    setStep('idle');
    setPreview(null);
    setResult(null);
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '720px' }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1a0a06', marginBottom: '4px' }}>Upload Remittances</h1>
        <p style={{ fontSize: '13px', color: '#A7A68B' }}>
          Upload an Excel file to bulk-import parish remittance records
        </p>
      </div>

      {/* Step 1 — File + Year */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #F5E3D7', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #F5E3D7', backgroundColor: '#FFF9F2' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Step 1 — Select file and year
          </p>
        </div>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${file ? '#C89B6E' : '#F5E3D7'}`,
              borderRadius: '10px', padding: '36px 24px',
              textAlign: 'center', cursor: 'pointer',
              backgroundColor: file ? '#FFF9F2' : 'white',
              transition: 'all 0.2s'
            }}
          >
            <input ref={fileRef} type="file" accept=".xlsx,.csv" onChange={handleFile} style={{ display: 'none' }} />
            {file ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <FileSpreadsheet size={28} color="#C89B6E" strokeWidth={1.5} />
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#8B4C39' }}>{file.name}</p>
                  <p style={{ fontSize: '12px', color: '#A7A68B', marginTop: '2px' }}>
                    {(file.size / 1024).toFixed(1)} KB — click to change
                  </p>
                </div>
              </div>
            ) : (
              <>
                <Upload size={32} color="#A7A68B" strokeWidth={1.5} style={{ margin: '0 auto 12px' }} />
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#3d1e12', marginBottom: '4px' }}>
                  Drop your Excel file here
                </p>
                <p style={{ fontSize: '12px', color: '#A7A68B' }}>or click to browse — .xlsx or .csv</p>
              </>
            )}
          </div>

          {/* Year + collection name */}
          <div style={{ display: 'grid', gridTemplateColumns: format === 'horizontal' ? '1fr 1fr' : '1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                Financial Year *
              </label>
              <input
                type="number" value={year} onChange={e => setYear(parseInt(e.target.value))}
                style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #F5E3D7', padding: '0 12px', fontSize: '14px', outline: 'none', color: '#1a0a06', boxSizing: 'border-box' }}
              />
            </div>
            {format === 'horizontal' && (
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                  Collection Name *
                </label>
                <input
                  type="text" placeholder="e.g. First Collection" value={collectionName}
                  onChange={e => setCollectionName(e.target.value)}
                  style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #F5E3D7', padding: '0 12px', fontSize: '14px', outline: 'none', color: '#1a0a06', boxSizing: 'border-box' }}
                />
              </div>
            )}
          </div>

          <button
            onClick={format === 'horizontal' ? runHorizontalUpload : runPreview}
            disabled={!file || !year || step === 'previewing' || step === 'uploading' || (format === 'horizontal' && !collectionName)}
            style={{
              height: '40px', padding: '0 24px', borderRadius: '8px', border: 'none',
              cursor: !file || !year ? 'not-allowed' : 'pointer',
              backgroundColor: !file || !year ? '#F5E3D7' : '#D3542A',
              color: !file || !year ? '#A7A68B' : 'white',
              fontSize: '13px', fontWeight: 600, alignSelf: 'flex-start'
            }}
          >
            {step === 'previewing' || step === 'uploading' ? 'Processing...' : format === 'horizontal' ? 'Upload Now' : 'Preview Upload'}
          </button>
        </div>
      </div>

      {/* Step 2 — Preview */}
      {preview && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #F5E3D7', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F5E3D7', backgroundColor: '#FFF9F2' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Step 2 — Review before uploading
            </p>
          </div>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Summary row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              {[
                { label: 'To Insert', value: preview.toInsert.length, color: '#166534', bg: '#dcfce7' },
                { label: 'To Skip', value: preview.toSkip.length, color: '#92400e', bg: '#fef3c7' },
                { label: 'New Parishes', value: preview.newParishes.length, color: '#1e40af', bg: '#dbeafe' },
                { label: 'New Collections', value: preview.newCollections.length, color: '#6b21a8', bg: '#f3e8ff' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} style={{ borderRadius: '8px', padding: '14px 16px', backgroundColor: bg, textAlign: 'center' }}>
                  <p style={{ fontSize: '24px', fontWeight: 700, color, lineHeight: 1 }}>{value}</p>
                  <p style={{ fontSize: '11px', fontWeight: 600, color, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
                </div>
              ))}
            </div>

            {/* New parishes */}
            {preview.newParishes.length > 0 && (
              <div style={{ borderRadius: '8px', border: '1px solid #dbeafe', backgroundColor: '#eff6ff', padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Plus size={14} color="#1e40af" strokeWidth={2.5} />
                  <p style={{ fontSize: '12px', fontWeight: 700, color: '#1e40af' }}>
                    {preview.newParishes.length} new parish{preview.newParishes.length !== 1 ? 'es' : ''} will be created
                  </p>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {preview.newParishes.map(p => (
                    <span key={p} style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '20px', backgroundColor: '#dbeafe', color: '#1e40af', fontWeight: 500 }}>
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* New collections */}
            {preview.newCollections.length > 0 && (
              <div style={{ borderRadius: '8px', border: '1px solid #f3e8ff', backgroundColor: '#faf5ff', padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Plus size={14} color="#6b21a8" strokeWidth={2.5} />
                  <p style={{ fontSize: '12px', fontWeight: 700, color: '#6b21a8' }}>
                    {preview.newCollections.length} new collection{preview.newCollections.length !== 1 ? 's' : ''} will be created
                  </p>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {preview.newCollections.map(c => (
                    <span key={c} style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '20px', backgroundColor: '#f3e8ff', color: '#6b21a8', fontWeight: 500 }}>
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Records to insert */}
            {preview.toInsert.length > 0 && (
              <div style={{ borderRadius: '8px', border: '1px solid #F5E3D7', overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', backgroundColor: '#FFF9F2', borderBottom: '1px solid #F5E3D7' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={14} color="#166534" strokeWidth={2.5} />
                    <p style={{ fontSize: '12px', fontWeight: 700, color: '#166534' }}>Records to be inserted</p>
                  </div>
                </div>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {preview.toInsert.map((r, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 14px', borderBottom: i < preview.toInsert.length - 1 ? '1px solid #F5E3D7' : 'none',
                      fontSize: '12px'
                    }}>
                      <span style={{ fontWeight: 500, color: '#1a0a06' }}>{r.parishName}</span>
                      <span style={{ color: '#A7A68B' }}>{months[r.month - 1]} {r.year}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Records to skip */}
            {preview.toSkip.length > 0 && (
              <div style={{ borderRadius: '8px', border: '1px solid #fef3c7', overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', backgroundColor: '#fffbeb', borderBottom: '1px solid #fef3c7' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <SkipForward size={14} color="#92400e" strokeWidth={2.5} />
                    <p style={{ fontSize: '12px', fontWeight: 700, color: '#92400e' }}>Records that will be skipped (already exist)</p>
                  </div>
                </div>
                <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                  {preview.toSkip.map((r, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 14px', borderBottom: i < preview.toSkip.length - 1 ? '1px solid #fef3c7' : 'none',
                      fontSize: '12px'
                    }}>
                      <span style={{ fontWeight: 500, color: '#1a0a06' }}>{r.parishName}</span>
                      <span style={{ color: '#92400e' }}>{months[r.month - 1]} {r.year} — {r.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
              <button onClick={runUpload} disabled={step === 'uploading' || preview.toInsert.length === 0}
                style={{
                  flex: 1, height: '42px', borderRadius: '8px', border: 'none',
                  backgroundColor: preview.toInsert.length === 0 ? '#F5E3D7' : '#D3542A',
                  color: preview.toInsert.length === 0 ? '#A7A68B' : 'white',
                  fontSize: '13px', fontWeight: 700, cursor: preview.toInsert.length === 0 ? 'not-allowed' : 'pointer'
                }}>
                {step === 'uploading' ? 'Uploading...' : `Confirm & Upload ${preview.toInsert.length} Records`}
              </button>
              <button onClick={reset} style={{
                height: '42px', padding: '0 20px', borderRadius: '8px',
                border: '1px solid #F5E3D7', backgroundColor: 'white',
                color: '#8B4C39', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
              }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3 — Result */}
      {result && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #F5E3D7', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F5E3D7', backgroundColor: '#FFF9F2' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Step 3 — Upload complete
            </p>
          </div>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckCircle size={22} color="#166534" strokeWidth={2} />
              </div>
              <div>
                <p style={{ fontSize: '15px', fontWeight: 700, color: '#1a0a06' }}>Upload successful</p>
                <p style={{ fontSize: '13px', color: '#A7A68B', marginTop: '2px' }}>
                  {result.summary.inserted} records inserted · {result.summary.skipped} skipped · debtors auto-generated
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
              {[
                ['Records Inserted', result.summary.inserted, '#166534', '#dcfce7'],
                ['Records Skipped', result.summary.skipped, '#92400e', '#fef3c7'],
                ['New Parishes Created', result.summary.newParishes.length, '#1e40af', '#dbeafe'],
                ['New Collections Created', result.summary.newCollections.length, '#6b21a8', '#f3e8ff'],
              ].map(([label, value, color, bg]) => (
                <div key={label} style={{ borderRadius: '8px', padding: '12px 16px', backgroundColor: bg, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color, fontWeight: 600 }}>{label}</span>
                  <span style={{ fontSize: '18px', fontWeight: 700, color }}>{value}</span>
                </div>
              ))}
            </div>

            <button onClick={reset} style={{
              width: '100%', height: '42px', borderRadius: '8px',
              backgroundColor: '#D3542A', color: 'white',
              border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700
            }}>
              Upload Another File
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {step === 'error' && error && (
        <div style={{
          borderRadius: '10px', padding: '16px 20px',
          backgroundColor: '#fef2f2', border: '1px solid #fecaca',
          display: 'flex', alignItems: 'flex-start', gap: '10px'
        }}>
          <AlertCircle size={18} color="#dc2626" strokeWidth={2} style={{ flexShrink: 0, marginTop: '1px' }} />
          <div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626', marginBottom: '2px' }}>Upload failed</p>
            <p style={{ fontSize: '12px', color: '#dc2626' }}>{error}</p>
          </div>
        </div>
      )}

      {/* Format guide */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #F5E3D7', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #F5E3D7', backgroundColor: '#FFF9F2' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Expected file format
          </p>
        </div>
        <div style={{ padding: '20px' }}>
          <p style={{ fontSize: '12px', color: '#A7A68B', marginBottom: '12px', lineHeight: 1.6 }}>
            One sheet per month, named <strong style={{ color: '#8B4C39' }}>JANUARY</strong>, <strong style={{ color: '#8B4C39' }}>FEBRUARY</strong>, etc. First column must be <strong style={{ color: '#8B4C39' }}>Parish Name</strong>. Remaining columns are collection types.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#FFF9F2' }}>
                  {['Parish Name', 'First Collection', 'Second Collection', 'Tithe', 'Harvest', '...'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#8B4C39', border: '1px solid #F5E3D7', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["St. Peter's Parish", "120,000", "80,000", "150,000", "0", "..."],
                  ["St. Paul's Parish", "95,000", "60,000", "120,000", "50,000", "..."],
                ].map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j} style={{ padding: '8px 12px', border: '1px solid #F5E3D7', color: j === 0 ? '#1a0a06' : '#A7A68B', fontWeight: j === 0 ? 600 : 400 }}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
