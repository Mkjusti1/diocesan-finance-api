const fs = require('fs');

function log(file, msg, ok) {
  console.log(ok ? '✓' : '✗', file + ':', msg);
}

// ========== CollectionPage.jsx ==========
let cp = fs.readFileSync('client/src/pages/CollectionPage.jsx', 'utf8');

// Remove Parishes Paid / Parishes Missing ONLY for Rectory
const oldCards = `{[
{ label: 'Total Collected', value: formatCurrency(grandTotal), color: '#D3542A' },
{ label: 'Parishes Paid', value: Object.keys(grid).length, color: '#C89B6E' },
{ label: 'Parishes Missing', value: parishes.length - Object.keys(grid).length, color: '#A7A68B' },
].map(({ label, value, color }) => (`;

const newCards = `{(collectionName === 'Rectory' ? [{ label: 'Total Collected', value: formatCurrency(grandTotal), color: '#D3542A' }] : [
{ label: 'Total Collected', value: formatCurrency(grandTotal), color: '#D3542A' },
{ label: 'Parishes Paid', value: Object.keys(grid).length, color: '#C89B6E' },
{ label: 'Parishes Missing', value: parishes.length - Object.keys(grid).length, color: '#A7A68B' },
]).map(({ label, value, color }) => (`;

if (cp.includes(oldCards)) {
  cp = cp.replace(oldCards, newCards);
  log('CollectionPage.jsx', 'Cards conditional for Rectory', true);
} else {
  log('CollectionPage.jsx', 'Cards block not found — check manually', false);
}

// Center Total Collected card on Rectory (grid version)
if (cp.includes('className="grid grid-cols-3"')) {
  cp = cp.replace(
    'className="grid grid-cols-3"',
    `{collectionName === 'Rectory' ? "grid grid-cols-1 place-items-center" : "grid grid-cols-3"}`
  );
  log('CollectionPage.jsx', 'Grid centering for Rectory', true);
} else {
  log('CollectionPage.jsx', 'Grid class not found — center manually', false);
}

// Cathedral first, then alphabetical
cp = cp.replace(
  /parishes\.map\(\(parish, idx\)/g,
  `[...parishes].sort((a, b) => {
    if (a.name === 'Aguleri: St. Joseph') return -1;
    if (b.name === 'Aguleri: St. Joseph') return 1;
    return a.name.localeCompare(b.name);
  }).map((parish, idx)`
);
log('CollectionPage.jsx', 'Parish sort (Cathedral first)', true);

// # column header
cp = cp.replace(/<th(\s[^>]*)?>Parish<\/th>/, '<th style={{width:48,textAlign:"center"}}>#</th><th$1>Parish</th>');
log('CollectionPage.jsx', '# header added', true);

// # cells on data rows
cp = cp.replace(
  /(onMouseLeave=\{e => e\.currentTarget\.style\.backgroundColor = 'transparent'\}>\s*\n)/g,
  "$1            <td style={{textAlign:'center',fontWeight:600,color:'#1a0a06'}}>{idx + 1}</td>\n"
);
log('CollectionPage.jsx', '# cells added', true);

// Pad Grand Total row
cp = cp.replace(/(<td[^>]*>)\s*Grand Total\s*(<\/td>)/, '<td></td>$1Grand Total$2');
log('CollectionPage.jsx', 'Grand Total row padded', true);

fs.writeFileSync('client/src/pages/CollectionPage.jsx', cp);

// ========== NationalCollectionsPage.jsx ==========
let np = fs.readFileSync('client/src/pages/NationalCollectionsPage.jsx', 'utf8');

np = np.replace(
  /parishes\.map\(\(parish, idx\)/g,
  `[...parishes].sort((a, b) => {
    if (a.name === 'Aguleri: St. Joseph') return -1;
    if (b.name === 'Aguleri: St. Joseph') return 1;
    return a.name.localeCompare(b.name);
  }).map((parish, idx)`
);
log('NationalCollectionsPage.jsx', 'Parish sort (Cathedral first)', true);

np = np.replace(/<th(\s[^>]*)?>Parish<\/th>/, '<th style={{width:48,textAlign:"center"}}>#</th><th$1>Parish</th>');
log('NationalCollectionsPage.jsx', '# header added', true);

np = np.replace(
  /(onMouseLeave=\{e => e\.currentTarget\.style\.backgroundColor = 'transparent'\}>\s*\n)/g,
  "$1            <td style={{textAlign:'center',fontWeight:600,color:'#1a0a06'}}>{idx + 1}</td>\n"
);
log('NationalCollectionsPage.jsx', '# cells added', true);

np = np.replace(/(<td[^>]*>)\s*Total\s*(<\/td>)/, '<td></td>$1Total$2');
log('NationalCollectionsPage.jsx', 'Total row padded', true);

fs.writeFileSync('client/src/pages/NationalCollectionsPage.jsx', np);

// ========== Dashboard.jsx ==========
let db = fs.readFileSync('client/src/pages/Dashboard.jsx', 'utf8');

db = db.replace(/<th(\s[^>]*)?>Parish<\/th>/, '<th style={{width:48,textAlign:"center"}}>#</th><th$1>Parish</th>');
log('Dashboard.jsx', '# header added', true);

const dashRow = db.match(/(\n\s*)(<td[^>]*>\s*\n\s*\{s\.parish\.name\.charAt\(0\)\})/);
if (dashRow) {
  db = db.replace(dashRow[0], dashRow[1] + '<td style={{textAlign:"center",fontWeight:600}}>{idx + 1}</td>' + dashRow[1] + dashRow[2]);
  log('Dashboard.jsx', '# cells added', true);
} else {
  log('Dashboard.jsx', 'Row pattern not found — add <td>{idx + 1}</td> manually as first cell', false);
}

fs.writeFileSync('client/src/pages/Dashboard.jsx', db);

console.log('\n🎉 Done. If any line shows ✗, paste that file here and I will fix it.');
