import { useState, useRef, useEffect } from 'react';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { AlertCircle, CheckCircle, RefreshCw, Loader2, Search, ChevronDown, Copy, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const CURRENT_YEAR = new Date().getFullYear();

const GET_DEBTORS = gql`
  query GetDebtors($years: [Int!], $months: [Int!], $collectionNames: [String!], $overdueOnly: Boolean) {
    debtors(years: $years, months: $months, collectionNames: $collectionNames, overdueOnly: $overdueOnly) {
      id
      year
      month
      monthName
      balance
      isPaid
      parish {
        id
        name
      }
      collection {
        id
        name
      }
    }
  }
`;

const GET_SOURCES = gql`
  query GetDebtorSources {
    remittanceSources {
      id
      name
      category
      isActive
    }
  }
`;

const REGENERATE_DEBTORS = gql`
  mutation RegenerateDebtors($year: Int) {
    regenerateDebtors(year: $year) {
      success
      years
    }
  }
`;

const MONTH_NAMES = [
  'Annual', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const CATEGORIES = [
  'Rectory',
  'National Collections',
  'Harvest & Bazaar',
  'Cathedraticum',
  'Project Sunday',
  'Seminary Collections',
];

const YEAR_OPTIONS = Array.from({ length: 8 }, (_, i) => CURRENT_YEAR + 2 - i); // a couple years ahead, several back

const selectStyle = {
  height: '38px',
  borderRadius: '8px',
  border: '1px solid #F5E3D7',
  padding: '0 12px',
  fontSize: '13px',
  color: '#1a0a06',
  backgroundColor: 'white',
  outline: 'none',
  cursor: 'pointer',
};

function MultiSelect({ label, options, selected, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggle = (val) => {
    if (selected.includes(val)) onChange(selected.filter(v => v !== val));
    else onChange([...selected, val]);
  };

  const summary = selected.length === 0
    ? placeholder
    : selected.length <= 3
      ? selected.map(v => options.find(o => o.value === v)?.label || v).join(', ')
      : `${selected.length} selected`;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#8B4C39', marginBottom: '4px' }}>{label}</label>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          ...selectStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '8px', minWidth: '180px', color: selected.length ? '#1a0a06' : '#A7A68B',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{summary}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: '4px', zIndex: 10,
          backgroundColor: 'white', border: '1px solid #F5E3D7', borderRadius: '8px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: '200px', maxHeight: '260px',
          overflowY: 'auto', padding: '6px',
        }}>
          {options.map(opt => (
            <label key={opt.value} style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px',
              borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: '#1a0a06',
            }}>
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={() => toggle(opt.value)}
                style={{ cursor: 'pointer' }}
              />
              {opt.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function TabularSection({ title, subtitle, columns, onCopy, copied }) {
  if (!columns || columns.length === 0) return null;
  const maxRows = Math.max(...columns.map(c => Math.ceil(c.parishes.length / 2)));

  return (
    <div style={{ marginBottom: '32px', border: '1px solid #F5E3D7', borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', backgroundColor: '#FFF9F2', borderBottom: '1px solid #F5E3D7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#8B4C39' }}>
          {title}
          {subtitle ? <span style={{ fontWeight: 400, color: '#A7A68B', marginLeft: '8px' }}>{subtitle}</span> : null}
        </h3>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', tableLayout: 'fixed' }}>
          <colgroup>
            {columns.map((_, i) => (
              <col key={`cg-${i}`} span={2} style={{ minWidth: '170px' }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th key={`th-${i}`} colSpan={2} style={{
                  padding: '10px 8px', textAlign: 'center', fontWeight: 700, color: '#8B4C39',
                  borderBottom: '2px solid #F5E3D7', borderRight: i < columns.length - 1 ? '1px solid #F5E3D7' : 'none',
                  backgroundColor: '#FFF9F2', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxRows }).map((_, rowIdx) => (
              <tr key={`tr-${rowIdx}`}>
                {columns.flatMap((col, colIdx) => {
                  const mid = Math.ceil(col.parishes.length / 2);
                  const left = col.parishes[rowIdx];
                  const right = col.parishes[rowIdx + mid];
                  return [
                    <td key={`l-${rowIdx}-${colIdx}`} style={{
                      padding: '5px 10px', borderBottom: '1px solid #F5E3D7', borderRight: '1px solid #F5E3D7',
                      color: '#1a0a06', whiteSpace: 'normal', wordBreak: 'break-word', width: '50%',
                    }}>
                      {left ? `${rowIdx + 1}. ${left}` : ''}
                    </td>,
                    <td key={`r-${rowIdx}-${colIdx}`} style={{
                      padding: '5px 10px', borderBottom: '1px solid #F5E3D7',
                      borderRight: colIdx < columns.length - 1 ? '1px solid #F5E3D7' : 'none',
                      color: '#1a0a06', whiteSpace: 'normal', wordBreak: 'break-word', width: '50%',
                    }}>
                      {right ? `${rowIdx + 1 + mid}. ${right}` : ''}
                    </td>,
                  ];
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ padding: '12px 20px', borderTop: '1px solid #F5E3D7', backgroundColor: '#FFF9F2', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={onCopy}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px',
            borderRadius: '8px', border: '1px solid #F5E3D7', backgroundColor: 'white',
            color: '#8B4C39', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          }}
        >
          {copied ? <Check size={14} color="#059669" /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy list'}
        </button>
      </div>
    </div>
  );
}

export function Debtors() {
  const { user } = useAuth();
  const [category, setCategory] = useState('');
  const [selectedNationalCollectionIds, setSelectedNationalCollectionIds] = useState([]);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [selectedYears, setSelectedYears] = useState([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: sourcesData } = useQuery(GET_SOURCES);
  const nationalSources = (sourcesData?.remittanceSources || []).filter(s => s.isActive && s.category === 'National Collections');

  const [loadDebtors, { data, loading, error }] = useLazyQuery(GET_DEBTORS, {
    fetchPolicy: 'network-only',
  });

  const [regenerate, { data: regenData, loading: regenLoading, error: regenError }] = useMutation(REGENERATE_DEBTORS);

  const isNational = category === 'National Collections';
  const isMonthly = category === 'Rectory';

  const selectedNationalCollections = isNational
    ? nationalSources.filter(s => selectedNationalCollectionIds.includes(s.id))
    : [];

  const collectionNames = isNational
    ? selectedNationalCollections.map(s => s.name)
    : (category ? [category] : []);

  const canLoad = isNational
    ? selectedNationalCollectionIds.length > 0 && selectedYears.length > 0
    : !!category && (isMonthly ? (!!year && selectedMonths.length > 0) : selectedYears.length > 0);

  const handleCategoryChange = (val) => {
    setCategory(val);
    setSelectedNationalCollectionIds([]);
    setSelectedMonths([]);
    setSelectedYears([]);
    setHasLoaded(false);
  };

  const handleLoad = async () => {
    if (!canLoad) return;
    setHasLoaded(true);
    setCopied(false);
    await loadDebtors({
      variables: isMonthly
        ? { years: [year], months: selectedMonths, collectionNames, overdueOnly: true }
        : { years: selectedYears, months: [0], collectionNames, overdueOnly: true },
    });
  };

  const handleRegenerate = async () => {
    const targetYear = isMonthly ? year : (selectedYears[0] || CURRENT_YEAR);
    await regenerate({ variables: { year: targetYear } });
    if (hasLoaded) await handleLoad();
  };

  const debtors = data?.debtors || [];

  // Build columns: months for Rectory, years for everything else
  const columns = (() => {
    if (!hasLoaded) return [];
    if (isMonthly) {
      return [...selectedMonths].sort((a, b) => a - b).map(m => ({
        label: MONTH_NAMES[m],
        parishes: [...new Set(
          debtors.filter(d => d.month === m && !d.isPaid).map(d => d.parish.name)
        )].sort(),
      }));
    }
    if (isNational) {
      return [...selectedNationalCollections]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(nc => ({
          label: nc.name,
          parishes: [...new Set(
            debtors
              .filter(d => d.collection?.name?.toLowerCase() === nc.name.toLowerCase() && !d.isPaid)
              .map(d => d.parish.name)
          )].sort(),
        }));
    }
    return [...selectedYears].sort((a, b) => a - b).map(y => ({
      label: String(y),
      parishes: [...new Set(
        debtors.filter(d => d.year === y && !d.isPaid).map(d => d.parish.name)
      )].sort(),
    }));
  })();

  const sectionTitle = isNational
    ? (selectedNationalCollections.length === 1 ? selectedNationalCollections[0].name : category)
    : (category || '');
  const sectionSubtitle = isMonthly ? String(year) : (
    selectedYears.length > 1 ? `${Math.min(...selectedYears)}–${Math.max(...selectedYears)}` : String(selectedYears[0] || '')
  );

  const handleCopy = async () => {
    const lines = [];
    lines.push(`${sectionTitle}${sectionSubtitle ? ' — ' + sectionSubtitle : ''}`);
    lines.push('');
    for (const col of columns) {
      if (col.parishes.length === 0) continue;
      lines.push(col.label.toUpperCase() + ':');
      col.parishes.forEach((name, i) => lines.push(`${i + 1}. ${name}`));
      lines.push('');
    }
    try {
      await navigator.clipboard.writeText(lines.join('\n').trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — fail silently, button just won't confirm
    }
  };

  const monthOptions = MONTH_NAMES.slice(1).map((name, idx) => ({ value: idx + 1, label: name }));
  const yearOptions = YEAR_OPTIONS.map(y => ({ value: y, label: String(y) }));

  const totalListed = columns.reduce((sum, c) => sum + c.parishes.length, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1a0a06', marginBottom: '4px' }}>Debtors</h1>
        <p style={{ fontSize: '13px', color: '#A7A68B' }}>
          Choose a collection and a period, then load the list.
        </p>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '14px', flexWrap: 'wrap', backgroundColor: 'white', padding: '18px 20px', borderRadius: '12px', border: '1px solid #F5E3D7' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#8B4C39', marginBottom: '4px' }}>Collection</label>
          <select value={category} onChange={e => handleCategoryChange(e.target.value)} style={{ ...selectStyle, minWidth: '180px' }}>
            <option value="">Select collection</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {isNational && (
          <MultiSelect
            label="Which National Collection"
            options={nationalSources.map(s => ({ value: s.id, label: s.name }))}
            selected={selectedNationalCollectionIds}
            onChange={v => { setSelectedNationalCollectionIds(v); setHasLoaded(false); }}
            placeholder="Select collection(s)"
          />
        )}

        {category && isMonthly && (
          <>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#8B4C39', marginBottom: '4px' }}>Year</label>
              <select value={year} onChange={e => { setYear(parseInt(e.target.value)); setHasLoaded(false); }} style={{ ...selectStyle, minWidth: '110px' }}>
                {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <MultiSelect
              label="Month(s)"
              options={monthOptions}
              selected={selectedMonths}
              onChange={v => { setSelectedMonths(v); setHasLoaded(false); }}
              placeholder="Select month(s)"
            />
          </>
        )}

        {category && !isMonthly && (!isNational || selectedNationalCollectionIds.length > 0) && (
          <MultiSelect
            label="Year(s)"
            options={yearOptions}
            selected={selectedYears}
            onChange={v => { setSelectedYears(v); setHasLoaded(false); }}
            placeholder="Select year(s)"
          />
        )}

        <button
          onClick={handleLoad}
          disabled={!canLoad || loading}
          style={{
            height: '38px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: !canLoad ? '#F5E3D7' : '#D3542A',
            color: 'white',
            fontSize: '13px',
            fontWeight: 600,
            cursor: !canLoad ? 'not-allowed' : 'pointer',
            padding: '0 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={14} />}
          {loading ? 'Loading...' : 'Load Debtors'}
        </button>

        {user?.role === 'ADMIN' && (
          <button
            onClick={handleRegenerate}
            disabled={regenLoading}
            style={{
              height: '38px',
              borderRadius: '8px',
              border: '1px solid #F5E3D7',
              backgroundColor: 'white',
              color: '#8B4C39',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '0 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginLeft: 'auto',
            }}
          >
            {regenLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={14} />}
            {regenLoading ? 'Recalculating...' : 'Recalculate'}
          </button>
        )}
      </div>

      {/* Status messages */}
      {regenData?.regenerateDebtors?.success && (
        <div style={{ padding: '12px 16px', backgroundColor: '#ecfdf5', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#059669' }}>
          <CheckCircle size={16} />
          Recalculated for {regenData.regenerateDebtors.years.join(', ')}.
        </div>
      )}
      {regenError && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#dc2626' }}>
          <AlertCircle size={16} />
          Failed: {regenError.message}
        </div>
      )}

      {error && (
        <div style={{ padding: '16px 20px', backgroundColor: '#fef2f2', borderRadius: '12px', border: '1px solid #fecaca', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <AlertCircle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: '1px' }} />
          <div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626', marginBottom: '2px' }}>Couldn't load debtors</p>
            <p style={{ fontSize: '12px', color: '#dc2626' }}>{error.message || 'Failed to fetch'}</p>
          </div>
        </div>
      )}

      {!hasLoaded && !loading && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#A7A68B' }}>
          <Search size={40} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
          <p style={{ fontSize: '14px' }}>
            {!category
              ? <>Pick a <strong>collection</strong> to get started</>
              : isNational && selectedNationalCollectionIds.length === 0
                ? <>Pick <strong>which national collection(s)</strong></>
                : <>Pick a {isMonthly ? 'year and month(s)' : 'year(s)'}, then click <strong>Load Debtors</strong></>}
          </p>
        </div>
      )}

      {hasLoaded && loading && (
        <div style={{ textAlign: 'center', padding: '48px', color: '#A7A68B' }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ fontSize: '13px' }}>Loading debtors...</p>
        </div>
      )}

      {hasLoaded && !loading && totalListed === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CheckCircle size={28} color="#059669" />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1a0a06', marginBottom: '4px' }}>No outstanding debts</h3>
          <p style={{ fontSize: '13px', color: '#A7A68B' }}>
            Every parish is up to date for {sectionTitle} {sectionSubtitle}.
          </p>
        </div>
      )}

      {hasLoaded && !loading && totalListed > 0 && (
        <TabularSection title={sectionTitle} subtitle={sectionSubtitle} columns={columns} onCopy={handleCopy} copied={copied} />
      )}
    </div>
  );
}
