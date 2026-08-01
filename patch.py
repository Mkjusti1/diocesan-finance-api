import re
import shutil

# Backup
shutil.copy('src/graphql/resolvers.js', 'src/graphql/resolvers.js.bak')
shutil.copy('src/graphql/typeDefs.js', 'src/graphql/typeDefs.js.bak')
shutil.copy('client/src/pages/Login.jsx', 'client/src/pages/Login.jsx.bak')
shutil.copy('client/src/components/layout/Sidebar.jsx', 'client/src/components/layout/Sidebar.jsx.bak')
shutil.copy('client/src/components/layout/AppLayout.jsx', 'client/src/components/layout/AppLayout.jsx.bak')
shutil.copy('client/src/pages/Users.jsx', 'client/src/pages/Users.jsx.bak')
shutil.copy('client/src/App.jsx', 'client/src/App.jsx.bak')
print("✅ Backups created")

# ─── resolvers.js ───
with open('src/graphql/resolvers.js', 'r') as f:
    c = f.read()

c = re.sub(r"import\s+\{\s*ensurePriestTokenForParish\s*\}\s+from\s+'\.\./utils/priestTokens\.js';?\n", '', c)
c = c.replace("const expiresIn = user.role === 'PRIEST' ? '365d' : '7d';", "const expiresIn = '7d';")

c = c.replace("""  parishes: async (_, __, { user }) => {
    requireAuth(user);
    const { rows } = await pool.query(`SELECT * FROM parishes ORDER BY CASE WHEN name = 'Aguleri: St. Joseph' THEN 0 ELSE 1 END, name`);
    return rows.map(mapParish);
  },""", """  parishes: async (_, __, { user }) => {
    requireRole(user, 'ADMIN', 'BISHOP');
    const { rows } = await pool.query(`SELECT * FROM parishes ORDER BY CASE WHEN name = 'Aguleri: St. Joseph' THEN 0 ELSE 1 END, name`);
    return rows.map(mapParish);
  },""")

c = c.replace("""  parish: async (_, { id }, { user }) => {
    requireAuth(user);
    if (user.role === 'PRIEST') {
      if (user.parishId !== parseInt(id)) {
        throw new Error('FORBIDDEN: You can only view your own parish');
      }
    }
    const { rows } = await pool.query('SELECT * FROM parishes WHERE id = $1', [id]);
    return mapParish(rows[0]);
  },""", """  parish: async (_, { id }, { user }) => {
    requireRole(user, 'ADMIN', 'BISHOP');
    const { rows } = await pool.query('SELECT * FROM parishes WHERE id = $1', [id]);
    return mapParish(rows[0]);
  },""")

c = c.replace("""  remittanceRecords: async (_, { year, month, parishId }, { user }) => {
    requireAuth(user);

    if (user.role === 'PRIEST') {
      if (!user.parishId) throw new Error('No parish assigned to your account');
      parishId = user.parishId;
      year = undefined;
      month = undefined;
    }

    let query = `""", """  remittanceRecords: async (_, { year, month, parishId }, { user }) => {
    requireRole(user, 'ADMIN', 'BISHOP');

    let query = `""")

c = c.replace("""  remittanceRecord: async (_, { id }, { user }) => {
    requireAuth(user);
    const { rows } = await pool.query(
      `SELECT rr.*, COALESCE(SUM(rli.amount), 0) as total_amount
       FROM remittance_records rr
       LEFT JOIN remittance_line_items rli ON rr.id = rli.remittance_record_id
       WHERE rr.id = $1
       GROUP BY rr.id`,
      [id]
    );
    if (!rows[0]) return null;

    if (user.role === 'PRIEST' && rows[0].parish_id !== user.parishId) {
      throw new Error('FORBIDDEN: You can only view your own parish records');
    }
    return mapRemittanceRecord(rows[0]);
  },""", """  remittanceRecord: async (_, { id }, { user }) => {
    requireRole(user, 'ADMIN', 'BISHOP');
    const { rows } = await pool.query(
      `SELECT rr.*, COALESCE(SUM(rli.amount), 0) as total_amount
       FROM remittance_records rr
       LEFT JOIN remittance_line_items rli ON rr.id = rli.remittance_record_id
       WHERE rr.id = $1
       GROUP BY rr.id`,
      [id]
    );
    if (!rows[0]) return null;
    return mapRemittanceRecord(rows[0]);
  },""")

# Remove myParishRemittances query
c = re.sub(r"  myParishRemittances: async\s*\(_,\s*\{\s*year\s*\},\s*\{\s*user\s*\}\)\s*=>\s*\{[^{}]*\{[^{}]*\}[^{}]*\},?\n?\n", '', c)

# Remove parishDebtors query
c = re.sub(r"  parishDebtors: async\s*\(_,\s*\{\s*parishId,\s*year\s*\},\s*\{\s*user\s*\}\)\s*=>\s*\{[^{}]*\{[^{}]*\}[^{}]*\},?\n?\n", '', c)

c = c.replace("""    if (!dbUser.password_hash) {
      throw new Error('This account uses token-based login');
    }

    const valid = await bcrypt.compare(password, dbUser.password_hash);""", """    const valid = await bcrypt.compare(password, dbUser.password_hash);""")

# Remove loginWithToken
c = re.sub(r"  loginWithToken: async\s*\(_,\s*\{\s*token:\s*priestToken\s*\}\)\s*=>\s*\{[^{}]*\{[^{}]*\}[^{}]*\},?\n?\n", '', c)

# Remove generateAllPriestTokens
c = re.sub(r"  generateAllPriestTokens: async\s*\(_,?\s*__,?\s*\{\s*user\s*\}\)\s*=>\s*\{[^{}]*\{[^{}]*\}[^{}]*\},?\n?\n", '', c)

c = c.replace("""    let passwordHash = null;
    let priestToken = null;

    if (role === 'PRIEST') {
      const { randomBytes } = await import('crypto');
      priestToken = randomBytes(32).toString('hex');
    } else {
      if (!password) throw new Error('Password is required for ADMIN and BISHOP roles');
      passwordHash = await bcrypt.hash(password, 12);
    }

    const { rows } = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, priest_token,
       token_generated_by, role, parish_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [firstName, lastName, email, passwordHash, priestToken,
       role === 'PRIEST' ? user.id : null, role, parishId || null]
    );

    const newUser = rows[0];
    await logAuditEvent(user.id, 'CREATE_USER', 'users', newUser.id, null, {
      name, email, role, parishId
    });

    const mapped = mapUser(newUser);
    if (priestToken) mapped.priestToken = priestToken;
    return mapped;""", """    if (!password) throw new Error('Password is required');
    const passwordHash = await bcrypt.hash(password, 12);

    const { rows } = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role, parish_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [firstName, lastName, email, passwordHash, role, parishId || null]
    );

    const newUser = rows[0];
    await logAuditEvent(user.id, 'CREATE_USER', 'users', newUser.id, null, {
      name, email, role, parishId
    });

    return mapUser(newUser);""")

c = c.replace("""    await ensurePriestTokenForParish(rows[0].id, rows[0].name, user.id);

    await logAuditEvent(user.id, 'CREATE_PARISH', 'parishes', rows[0].id, null, input);""", """    await logAuditEvent(user.id, 'CREATE_PARISH', 'parishes', rows[0].id, null, input);""")

c = re.sub(r"  regeneratePriestToken: async\s*\(_,\s*\{\s*userId\s*\},\s*\{\s*user\s*\}\)\s*=>\s*\{[^{}]*\{[^{}]*\}[^{}]*\},?\n?\n", '', c)

with open('src/graphql/resolvers.js', 'w') as f:
    f.write(c)
print("✅ resolvers.js patched")

# ─── typeDefs.js ───
with open('src/graphql/typeDefs.js', 'r') as f:
    c = f.read()

c = c.replace("  priestToken: String\n", "")
c = c.replace("  loginWithToken(token: String!): AuthPayload!\n", "")
c = c.replace("  generateAllPriestTokens: GenerateAllPriestTokensPayload!\n", "")
c = c.replace("  regeneratePriestToken(userId: ID!): User!\n", "")
c = c.replace("  myParishRemittances(year: Int): [RemittanceRecord!]!\n", "")
c = c.replace("  parishDebtors(parishId: ID!, year: Int): [Debtor!]!\n", "")

with open('src/graphql/typeDefs.js', 'w') as f:
    f.write(c)
print("✅ typeDefs.js patched")

# ─── Login.jsx ───
login_jsx = '''import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { client } from '@/lib/apollo';
import { LOGIN } from '@/graphql/queries';
import dioceseLogo from '@/assets/diocese-logo.jpg';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await client.mutate({
        mutation: LOGIN,
        variables: { input: { email: form.email, password: form.password } }
      });
      login(data.login.token, data.login.user);
      navigate('/');
    } catch (err) {
      setError(err.message?.replace('GraphQL error: ', '') || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #E5DDD6',
    backgroundColor: '#FFF9F2',
    fontSize: '14px',
    outline: 'none',
    color: '#1a0a06'
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFF9F2',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 4px 24px rgba(26,10,6,0.06)',
        border: '1px solid #F5E3D7'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img
            src={dioceseLogo}
            alt="CADIAG"
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '3px solid #C89B6E',
              marginBottom: '16px'
            }}
          />
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#1a0a06', marginBottom: '6px' }}>
            CADIAG Finance
          </h1>
          <p style={{ color: '#8B7E77', fontSize: '14px' }}>
            Sign in to your account to continue
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1a0a06', marginBottom: '6px' }}>
              Email address
            </label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
              style={inputStyle}
              placeholder="you@diocese.com"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1a0a06', marginBottom: '6px' }}>
              Password
            </label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 12px',
              backgroundColor: '#FEE2E2',
              color: '#991B1B',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '16px'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '11px',
              backgroundColor: loading ? '#C89B6E' : '#8B4C39',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s'
            }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
'''
with open('client/src/pages/Login.jsx', 'w') as f:
    f.write(login_jsx)
print("✅ Login.jsx rewritten")

# ─── Sidebar.jsx ───
with open('client/src/components/layout/Sidebar.jsx', 'r') as f:
    c = f.read()
c = c.replace("roles: ['ADMIN','BISHOP','PRIEST']", "roles: ['ADMIN','BISHOP']")
with open('client/src/components/layout/Sidebar.jsx', 'w') as f:
    f.write(c)
print("✅ Sidebar.jsx patched")

# ─── AppLayout.jsx ───
with open('client/src/components/layout/AppLayout.jsx', 'r') as f:
    c = f.read()
c = c.replace("""  if (user?.role === 'PRIEST' && location.pathname === '/') {
    return <Navigate to="/remittances" replace />;
  }
""", "")
with open('client/src/components/layout/AppLayout.jsx', 'w') as f:
    f.write(c)
print("✅ AppLayout.jsx patched")

# ─── Users.jsx ───
with open('client/src/pages/Users.jsx', 'r') as f:
    c = f.read()
c = c.replace('value="PRIEST"', 'value="PRIEST" disabled')
with open('client/src/pages/Users.jsx', 'w') as f:
    f.write(c)
print("✅ Users.jsx patched")

# ─── App.jsx ───
with open('client/src/App.jsx', 'r') as f:
    c = f.read()
c = c.replace("import { useAuth } from '@/context/AuthContext';", "import { useAuth } from '@/context/AuthContext';")
# Remove any PRIEST lines if they exist
lines = [l for l in c.split('\n') if 'PRIEST' not in l]
with open('client/src/App.jsx', 'w') as f:
    f.write('\n'.join(lines))
print("✅ App.jsx patched")

# ─── queries.js ───
with open('client/src/graphql/queries.js', 'r') as f:
    c = f.read()
c = c.replace("export const LOGIN_WITH_TOKEN = gql`mutation LoginWithToken($token: String!) { loginWithToken(token: $token) { token user { id name email role parishId } } }`;\n", "")
c = c.replace("export const GET_MY_PARISH_REMITTANCES = gql`query MyParishRemittances($year: Int) { myParishRemittances(year: $year) { id year month monthName totalAmount } }`;\n", "")
with open('client/src/graphql/queries.js', 'w') as f:
    f.write(c)
print("✅ queries.js patched")

print("")
print("=" * 70)
print("🎉 DONE! Priest access has been removed.")
print("")
print("Bishop retains access to:")
print("  • Dashboard, Rectory, National Collections")
print("  • Harvest & Bazaar, Cathedraticum, Project Sunday")
print("  • Seminary Collections, Debtors")
print("")
print("Next steps:")
print('  1. Review:  git diff')
print('  2. Optional DB cleanup:  psql -d your_db -c "DELETE FROM users WHERE role = \'PRIEST\';"')
print('  3. Restart: npm run dev')
print('  4. Commit & push')
print("=" * 70)
