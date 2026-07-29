import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const YEAR = new Date().getFullYear();
const API_URL = import.meta.env.VITE_API_URL || '';

const HORIZONTAL_FORMATS = ['horizontal', 'harvest-bazaar', 'cathedraticum', 'project-sunday', 'seminary-collections'];
const YEARLY_FORMATS = ['harvest-bazaar', 'cathedraticum', 'project-sunday', 'seminary-collections'];

export function UploadPage() {
  const { user } = useAuth();
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [year, setYear] = useState(YEAR);
  const [format, setFormat] = useState('horizontal');
  const [collectionName, setCollectionName] = useState('');
  const [step, setStep] = useState('idle');
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const getToken = () => window.__authToken__;

  const getCollectionName = () => {
    if (format === 'harvest-bazaar') return 'Harvest & Bazaar';
    if (format === 'cathedraticum') return 'Cathedraticum';
    if (format === 'project-sunday') return 'Project Sunday';
    if (format === 'seminary-collections') return 'Seminary Collections';
    return collectionName;
  };

  const handleFormatChange = (f) => {
    setFormat(f);
    if (f === 'harvest-bazaar') setCollectionName('Harvest & Bazaar');
    else if (f === 'cathedraticum') setCollectionName('Cathedraticum');
    else if (f === 'project-sunday') setCollectionName('Project Sunday');
    else if (f === 'seminary-collections') setCollectionName('Seminary Collections');
    else if (f !== 'horizontal') setCollectionName('');
  };

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
    if (!file || (format === 'horizontal' && !year)) return;
    setStep('previewing');
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('year', year);
    formData.append('format', format);
    formData.append('collectionName', getCollectionName());

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

  const runNationalUpload = async () => {
    if (!file || !year) return;
    setStep('uploading');
    setError('');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('year', year);
    try {
      const res = await fetch(`${API_URL}/api/upload/national`, {
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
    if (!file || (format === 'horizontal' && !year) || !getCollectionName()) return;
    setStep('uploading');
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('year', year);
    formData.append('format', format);
    formData.append('collectionName', getCollectionName());

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

  const handleUpload = () => {
    if (format === 'national') runNationalUpload();
    else if (HORIZONTAL_FORMATS.includes(format)) runHorizontalUpload();
    else runUpload();
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
            {format === 'horizontal' && (
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                Financial Year *
              </label>
              <input
                type="number" value={year} onChange={e => setYear(parseInt(e.target.value))}
                style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #F5E3D7', padding: '0 12px', fontSize: '14px', outline: 'none', color: '#1a0a06', boxSizing: 'border-box' }}
              />
            </div>
            )}

            {HORIZONTAL_FORMATS.includes(format) && (
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                  Collection Name *
                </label>
                <input
                  type="text"
                  placeholder={format === 'horizontal' ? "e.g. First Collection" : ""}
                  value={getCollectionName()}
                  onChange={format === 'horizontal' ? e => setCollectionName(e.target.value) : undefined}
                  readOnly={format !== 'horizontal'}
                  style={{
                    width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #F5E3D7',
                    padding: '0 12px', fontSize: '14px', outline: 'none', color: '#1a0a06',
                    boxSizing: 'border-box',
                    backgroundColor: format !== 'horizontal' ? '#FFF9F2' : 'white'
                  }}
                />
              </div>
            )}
          </div>

          {/* Format selector */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
              Upload Type
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', backgroundColor: '#F5E3D7', borderRadius: '8px', padding: '3px', width: 'fit-content', gap: '2px' }}>
              {[
                ['horizontal', 'Rectory (months as columns)'],
                ['harvest-bazaar', 'Harvest & Bazaar (years as columns)'],
                ['cathedraticum', 'Cathedraticum (years as columns)'],
                ['project-sunday', 'Project Sunday (years as columns)'],
                ['seminary-collections', 'Seminary Collections (years as columns)'],
                ['national', 'National Collections (collections as columns)'],
              ].map(([f, label]) => (
                <button key={f} type="button" onClick={() => handleFormatChange(f)}
                  style={{
                    padding: '6px 14px', borderRadius: '6px', border: 'none',
                    fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    backgroundColor: format === f ? 'white' : 'transparent',
                    color: format === f ? '#8B4C39' : '#A7A68B',
                    boxShadow: format === f ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || (format === 'horizontal' && !year) || step === 'previewing' || step === 'uploading' || (HORIZONTAL_FORMATS.includes(format) && !getCollectionName())}
            style={{
              height: '44px', borderRadius: '8px', border: 'none',
              backgroundColor: (!file || (format === 'horizontal' && !year) || (HORIZONTAL_FORMATS.includes(format) && !getCollectionName())) ? '#F5E3D7' : '#8B4C39',
              color: 'white', fontSize: '14px', fontWeight: 600, cursor: (!file || (format === 'horizontal' && !year) || (HORIZONTAL_FORMATS.includes(format) && !getCollectionName())) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            {step === 'uploading' ? (
              <><span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> Uploading...</>
            ) : (
              <><Upload size={18} strokeWidth={2} /> Upload</>
            )}
          </button>
        </div>
      </div>

      {/* Preview */}
      {preview && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #F5E3D7', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F5E3D7', backgroundColor: '#FFF9F2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Preview — {preview.length} records
            </p>
            <button onClick={() => { setPreview(null); setStep('idle'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
              <X size={16} color="#A7A68B" />
            </button>
          </div>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              {[
                ['Total Records', preview.length],
                ['Parishes', new Set(preview.map(r => r.parishName)).size],
                ['Total Amount', '₦' + preview.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0).toLocaleString()],
                [YEARLY_FORMATS.includes(format) ? 'Years' : 'Months', new Set(preview.map(r => YEARLY_FORMATS.includes(format) ? r.year : r.month)).size],
              ].map(([label, value]) => (
                <div key={label} style={{ backgroundColor: '#FFF9F2', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                  <p style={{ fontSize: '11px', color: '#A7A68B', marginBottom: '4px' }}>{label}</p>
                  <p style={{ fontSize: '18px', fontWeight: 700, color: '#8B4C39' }}>{value}</p>
                </div>
              ))}
            </div>

            <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #F5E3D7' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#FFF9F2' }}>
                    {['Parish', YEARLY_FORMATS.includes(format) ? 'Year' : 'Month', 'Collection', 'Amount', 'Year'].map((h, i) => (
                      <th key={i} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#8B4C39', borderBottom: '1px solid #F5E3D7', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 10).map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F5E3D7' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1a0a06', whiteSpace: 'nowrap' }}>{row.parishName}</td>
                      <td style={{ padding: '10px 12px', color: '#A7A68B' }}>{YEARLY_FORMATS.includes(format) ? row.year : row.month}</td>
                      <td style={{ padding: '10px 12px', color: '#A7A68B' }}>{row.collectionType}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#8B4C39', whiteSpace: 'nowrap' }}>₦{parseFloat(row.amount).toLocaleString()}</td>
                      <td style={{ padding: '10px 12px', color: '#A7A68B' }}>{row.year}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 10 && (
                <p style={{ padding: '10px 12px', fontSize: '11px', color: '#A7A68B', textAlign: 'center', borderTop: '1px solid #F5E3D7' }}>
                  ... and {preview.length - 10} more rows
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleUpload}
                disabled={step === 'uploading'}
                style={{
                  flex: 1, height: '44px', borderRadius: '8px', border: 'none',
                  backgroundColor: '#8B4C39', color: 'white',
                  fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                {step === 'uploading' ? 'Uploading...' : <><CheckCircle size={18} /> Confirm & Upload</>}
              </button>
              <button
                onClick={() => { setPreview(null); setStep('idle'); }}
                style={{
                  height: '44px', borderRadius: '8px', border: '1px solid #F5E3D7',
                  backgroundColor: 'white', color: '#8B4C39',
                  fontSize: '14px', fontWeight: 600, cursor: 'pointer', padding: '0 20px'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result */}
      {step === 'done' && result && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #F5E3D7', overflow: 'hidden' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle size={28} color="#059669" strokeWidth={2} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1a0a06', marginBottom: '4px' }}>Upload Complete</h3>
            <p style={{ fontSize: '13px', color: '#A7A68B', marginBottom: '20px' }}>
              {result.inserted || result.count || 0} records imported successfully
            </p>
            <button
              onClick={reset}
              style={{
                height: '40px', borderRadius: '8px', border: '1px solid #F5E3D7',
                backgroundColor: 'white', color: '#8B4C39',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: '0 20px'
              }}
            >
              Upload Another File
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {step === 'error' && error && (
        <div style={{
          backgroundColor: '#fef2f2', borderRadius: '12px', border: '1px solid #fecaca',
          padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: '10px'
        }}>
          <AlertCircle size={18} color="#dc2626" strokeWidth={2} style={{ flexShrink: 0, marginTop: '1px' }} />
          <div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626', marginBottom: '2px' }}>Upload failed</p>
            <p style={{ fontSize: '12px', color: '#dc2626' }}>{error}</p>
          </div>
        </div>
      )}

    </div>
  );
}