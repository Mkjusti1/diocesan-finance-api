const bcrypt = require('bcryptjs');

async function main() {
  // CHANGE THESE before running if you want different passwords
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Chancellor2026!Aguleri';
  const BISHOP_PASSWORD = process.env.BISHOP_PASSWORD || 'Bishop2026!Aguleri';

  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const bishopHash = await bcrypt.hash(BISHOP_PASSWORD, 12);

  console.log('\n=== SQL to run in Render PostgreSQL shell ===\n');
  console.log(`UPDATE users SET password_hash = '${adminHash}', updated_at = NOW() WHERE email = 'admin@diocese.com' AND role = 'ADMIN';`);
  console.log(`UPDATE users SET password_hash = '${bishopHash}', updated_at = NOW() WHERE email = 'bishop@diocese.com' AND role = 'BISHOP';`);
  console.log('\n=== Or use these GraphQL mutations ===\n');
  console.log(`mutation { adminResetPassword(userId: 1, newPassword: "${ADMIN_PASSWORD}") }`);
  console.log(`mutation { adminResetPassword(userId: 2, newPassword: "${BISHOP_PASSWORD}") }`);
  console.log();
}

main().catch(console.error);
