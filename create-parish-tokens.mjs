/**
 * Creates priest accounts using exact parish names from the diocese CSV.
 * One account per parish. Parish name is used as the user's name.
 * Run after wiping and re-uploading parish data.
 */
import pg from 'pg';
import crypto from 'crypto';
import { writeFile } from 'fs/promises';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME, user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, ssl: { rejectUnauthorized: false }
});

// Exact parish names from the diocese CSV
const parishes = [
  "Aguleri: St Joseph",
  "Aguleri: St Francis",
  "Aguleri: St Mary's Ugwunadagbe",
  "Aguleri: St Paul's",
  "Aguleri: St Mary Ezi Agulu",
  "Anam: Our Lady of Lourdes Mmiata",
  "Anam: St Theresa Aboegbu",
  "Anam: St Patrick Onono-Umuikwu",
  "Anam: St Anthony Umuikwu",
  "Anam: Holy Cross Oroma-Etiti",
  "Anam: St Mary's Umudora",
  "Anam: Holy Trinity Umuewelum",
  "Anam: SS Peter & Paul",
  "Anam: St Theresa Umueze",
  "Anam: St Augustine Umuoba",
  "Anaku:  St Joseph",
  "Awkuzu: St Raphael",
  "Awkuzu: St Patrick",
  "Awkuzu: St Catherine",
  "Awkuzu: St Michael",
  "Awkuzu: St Peter",
  "Igbakwu: St Mary",
  "Igbariam: St Anthony",
  "Igbariam: Holy Trinity",
  "Igbariam: Blessed Iwene Tansi Chap. COOU",
  "Ifite Ogwari: St Anthony",
  "Ifite Ogwari: Maria Assumpta",
  "Nando: St Joan of Arc",
  "Nando: St Jude",
  "Nando: St Francis of Assisi",
  "Nkwelle Ezunaka: Blessed Cyprian Michael Iwene Tansi",
  "Nkwelle Ezunaka: Holy Spirit Ind. Station",
  "Nkwelle Ezunaka: St William",
  "Nkwelle Ezunaka: St Anthony",
  "Nkwelle Ezunaka: Sacred Heart",
  "Nkwelle Ezunaka: St Stephen Ind. Station",
  "Nkwelle Ezunaka: St. Michael",
  "Nkwelle Ezunaka: Our Lady of Assumption",
  "Nkwelle Ezunaka: Divine Mercy Station",
  "Nkwelle Ezunaka: Pater Noster",
  "Nkwelle Ezunaka: St Theophilus",
  "Nkwelle Ezunaka: St Peter",
  "Nkwelle Ezunaka: St Pope John Paul II",
  "Nkwelle Ezunaka: St Augustine",
  "Nkwelle Ezunaka: Our Lady Q of A",
  "Nkwelle Ezunaka: St. Marys",
  "Nkwelle Ezunaka: St Francis Xavier",
  "Nkwelle Ezunaka: St. Francis of Assisi Ozeh",
  "Nkwelle Ezunaka: Transfiguration Parish",
  "Nkwelle Ezunaka: All Hallows Ind. Sta.",
  "Nsugbe: St John De Baptist",
  "Nsugbe: St Joseph",
  "Nsugbe: St Catherine Chaplaincy",
  "Nteje: Sacred Heart",
  "Nteje: St Anthony",
  "Nzam: St Mary",
  "Ogbunike: St Vincent",
  "Ogbunike: St Stephen",
  "Ogbunike: Our Lady of Fatima",
  "Ogbunike: St Michael De Archangel",
  "Olumbanasaa: St Jude",
  "Okumbanasaa: St Vincent Owelle/Ukwalla",
  "Olumbanasaa: Holy Trinity Igbedor",
  "Olumbanasaa: St Vincent Odekpe",
  "Olumbanasaa: Christ the King Odeh",
  "Olumbanasaa: St Michael Ind. Igbokenyi",
  "Olumbanasaa: St Stephen Ind. Odomagwu",
  "Omasi Agu: St Paul",
  "Omasi Uno: St Andrew",
  "Omor: Christ the King",
  "Omor: St Luke",
  "Omor: St Paul",
  "Umuerum: St Mary",
  "Umueje: St Joseph",
  "Umueri: Our Lady of Victory",
  "Umueri: SS Peter and Paul",
  "Umueri: St. Kelvin",
  "Umueri: St Mark",
  "Umumbo: SS Peter & Paul",
  "Umunya: St Theresa",
  "Umunya: Corpus Christi",
  "Umunya: Iwene Tansi",
];

const results = [];
let created = 0;
let notFound = 0;
let skipped = 0;

for (const parishName of parishes) {
  // Find parish in DB (trim and case-insensitive)
  const { rows: dbParishes } = await pool.query(
    'SELECT id, name FROM parishes WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))',
    [parishName]
  );

  if (dbParishes.length === 0) {
    console.log(`✗ Parish not in DB: "${parishName}"`);
    notFound++;
    results.push({ parish: parishName, token: 'NOT FOUND IN DATABASE' });
    continue;
  }

  const parish = dbParishes[0];

  // Check if priest already exists
  const { rows: existing } = await pool.query(
    "SELECT id, priest_token FROM users WHERE parish_id = $1 AND role = 'PRIEST' AND is_active = true",
    [parish.id]
  );

  if (existing.length > 0) {
    console.log(`- Skipped (exists): "${parish.name}"`);
    skipped++;
    results.push({ parish: parish.name, token: existing[0].priest_token || 'SKIPPED' });
    continue;
  }

  const token = crypto.randomBytes(32).toString('hex');

  await pool.query(
    `INSERT INTO users (first_name, last_name, role, parish_id, priest_token, token_generated_by)
     VALUES ($1, $2, 'PRIEST', $3, $4, 1)`,
    [parishName, '', parish.id, token]
  );

  console.log(`✓ Created: "${parish.name}"`);
  created++;
  results.push({ parish: parish.name, token });
}

// Save tokens CSV
const lines = ['Parish Name,Login Token'];
results.forEach(r => lines.push(`"${r.parish}","${r.token}"`));
await writeFile('priest-tokens.csv', lines.join('\n'));

console.log(`\n✓ Done: ${created} created, ${skipped} skipped, ${notFound} not found in DB`);
console.log('✓ Tokens saved to: priest-tokens.csv');
await pool.end();
