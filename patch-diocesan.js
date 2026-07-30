const fs = require('fs');

function log(file, msg, ok) {
  console.log(ok ? '✓' : '✗', file + ':', msg);
}

// ========== CollectionPage.jsx (Rectory, Harvest & Bazaar, Cathedraticum, Project Sunday, Seminary) ==========
let cp = fs.readFileSync('client/src/pages/CollectionPage.jsx', 'utf8');

// 1. Rectory: remove Parishes Paid & Parishes Missing cards
const cardsBlock = `{[
{ label: 'Total Collected', value: formatCurrency(grandTotal), color: '#D3542A' },
{ label: 'Parishes Paid', value: Object.keys(grid).length, color: '#C89B6E' },
{ label: 'Parishes Missing', value: parishes.length - Object.keys(grid).length, color: '#A7A68B' },
].map(({ label, value, color }) => (`;

const cardsReplacement = `{(collectionName === 'Rectory' ? [{ label: 'Total Collected', value: formatCurrency(grandTotal), color: '#D3542A' }] : [
{ label: 'Total Collected', value: formatCurrency(grandTotal), color: '#D3542A' },
{ label: 'Parishes Paid', value: Object.keys(grid).length, color: '#C89B6E' },
{ label: 'Parishes Missing', value: parishes.length - Object.keys(grid).length, color: '#A7A68B' },
]).map(({ label, value, color }) => (`;

if (cp.includes(cardsBlock)) {
  cp = cp.replace(cardsBlock, cardsReplacement);
  log('CollectionPage.jsx', 'Cards made conditional for Rectory (2 cards removed)', true);
} else {
  log('CollectionPage.jsx', 'Cards block not found — apply manually', false);
}

// 2. Center the Total Collected card when Rectory
const flexMatch = cp.match(/style=\{\{\s*display:\s*['"]flex['"]/);
const gridMatch = cp.match(/className=["']grid grid-cols-3["']/);
if (flexMatch) {
  cp = cp.replace(flexMatch[0], flexMatch[0].replace(/style=\{\{/, "style={{ justifyContent: collectionName === 'Rectory' ? 'center' : 'space-between',"));
  log('CollectionPage.jsx', 'Flex centering added for Rectory', true);
} else if (gridMatch) {
  cp = cp.replace(gridMatch[0], `{collectionName === 'Rectory' ? "grid grid-cols-1 place-items-center" : "grid grid-cols-3"}`);
  log('CollectionPage.jsx', 'Grid centering added for Rectory', true);
} else {
  log('CollectionPage.jsx', 'Could not auto-detect cards container — manually center when collectionName === "Rectory"', false);
}

// 3. Cathedral parish first + alphabetical sort
cp = cp.replace(/parishes\.map\(\(parish, idx\)/g, `[...parishes].sort((a, b) => {
    if (a.name === 'Aguleri: St. Joseph') return -1;
    if (b.name === 'Aguleri: St. Joseph') return 1;
    return a.name.localeCompare(b.name);
  }).map((parish, idx)`);
log('CollectionPage.jsx', 'Parish sorting added (Cathedral first)', true);

// 4. Numbering column header
cp = cp.replace(/<th(\s[^>]*)?>Parish<\/th>/, '<th style={{width:48,textAlign:"center"}}>#</th><th$1>Parish</th>');
log('CollectionPage.jsx', '# header injected', true);

// 5. Numbering cells on data rows
cp = cp.replace(/(onMouseLeave=\{e => e\.currentTarget\.style\.backgroundColor = 'transparent'\}>\s*\n)/g, "$1            <td style={{textAlign:'center',fontWeight:600,color:'#1a0a06'}}>{idx + 1}</td>\n");
log('CollectionPage.jsx', '# cells injected into data rows', true);

// 6. Grand Total row gets an empty leading cell so columns stay aligned
cp = cp.replace(/(<td[^>]*>)\s*Grand Total\s*(<\/td>)/, '<td></td>$1Grand Total$2');
log('CollectionPage.jsx', 'Grand Total row padded', true);

fs.writeFileSync('client/src/pages/CollectionPage.jsx', cp);

// ========== NationalCollectionsPage.jsx ==========
let np = fs.readFileSync('client/src/pages/NationalCollectionsPage.jsx', 'utf8');

np = np.replace(/parishes\.map\(\(parish, idx\)/g, `[...parishes].sort((a, b) => {
    if (a.name === 'Aguleri: St. Joseph') return -1;
    if (b.name === 'Aguleri: St. Joseph') return 1;
    return a.name.localeCompare(b.name);
  }).map((parish, idx)`);
log('NationalCollectionsPage.jsx', 'Parish sorting added (Cathedral first)', true);

np = np.replace(/<th(\s[^>]*)?>Parish<\/th>/, '<th style={{width:48,textAlign:"center"}}>#</th><th$1>Parish</th>');
log('NationalCollectionsPage.jsx', '# header injected', true);

np = np.replace(/(onMouseLeave=\{e => e\.currentTarget\.style\.backgroundColor = 'transparent'\}>\s*\n)/g, "$1            <td style={{textAlign:'center',fontWeight:600,color:'#1a0a06'}}>{idx + 1}</td>\n");
log('NationalCollectionsPage.jsx', '# cells injected into data rows', true);

np = np.replace(/(<td[^>]*>)\s*Total\s*(<\/td>)/, '<td></td>$1Total$2');
log('NationalCollectionsPage.jsx', 'Total row padded', true);

fs.writeFileSync('client/src/pages/NationalCollectionsPage.jsx', np);

// ========== Dashboard.jsx ==========
let db = fs.readFileSync('client/src/pages/Dashboard.jsx', 'utf8');

db = db.replace(/<th(\s[^>]*)?>Parish<\/th>/, '<th style={{width:48,textAlign:"center"}}>#</th><th$1>Parish</th>');
log('Dashboard.jsx', '# header injected', true);

// Insert number cell before the parish avatar+name cell
const dashRow = db.match(/(\n\s*)(<td[^>]*>\s*\n\s*\{s\.parish\.name\.charAt\(0\)\})/);
if (dashRow) {
  db = db.replace(dashRow[0], dashRow[1] + '<td style={{textAlign:"center",fontWeight:600}}>{idx + 1}</td>' + dashRow[1] + dashRow[2]);
  log('Dashboard.jsx', '# cells injected into data rows', true);
} else {
  log('Dashboard.jsx', 'Row pattern not found — manually add <td>{idx + 1}</td> as first cell in each row', false);
}

fs.writeFileSync('client/src/pages/Dashboard.jsx', db);

console.log('\n🎉 Done. Start your dev server and verify. If any step shows ✗ above, apply that part manually.');
