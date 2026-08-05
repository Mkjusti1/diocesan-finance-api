#!/bin/bash
set -euo pipefail

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Parish Summary Math Fix — Join Fan-Out Bug                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check we are in the right place
if [ ! -f "src/graphql/resolvers.js" ]; then
    echo "❌ Error: src/graphql/resolvers.js not found."
    echo "   Run this script from the repo root (diocesan-finance-api/)."
    exit 1
fi

# Backup
mkdir -p .backups
cp src/graphql/resolvers.js .backups/resolvers.js.parish-fix.bak
echo "💾 Backed up to .backups/resolvers.js.parish-fix.bak"

# Apply fix using Python inline
python3 - "$@" << 'PYEOF'
import re, sys

with open("src/graphql/resolvers.js", "r") as f:
    content = f.read()

# The buggy SQL pattern (flexible whitespace)
buggy_pattern = re.compile(
    r"(`SELECT p\.\*,\s*"
    r"COALESCE\(SUM\(rli\.amount\),\s*0\)\s+as\s+total_collected,\s*"
    r"COUNT\(DISTINCT\s+CASE\s+WHEN\s+rr\.month\s+BETWEEN\s+1\s+AND\s+12\s+THEN\s+rr\.month\s+END\)\s+as\s+months_reported,\s*"
    r"MAX\(rr\.created_at\)\s+as\s+last_reported,\s*"
    r"COALESCE\(SUM\(d\.balance\),\s*0\)\s+as\s+outstanding_balance\s*"
    r"FROM\s+parishes\s+p\s*"
    r"LEFT\s+JOIN\s+remittance_records\s+rr\s+ON\s+p\.id\s*=\s*rr\.parish_id\s+AND\s+rr\.year\s*=\s*\$1\s*"
    r"LEFT\s+JOIN\s+remittance_line_items\s+rli\s+ON\s+rr\.id\s*=\s*rli\.remittance_record_id\s*"
    r"LEFT\s+JOIN\s+debtors\s+d\s+ON\s+p\.id\s*=\s*d\.parish_id\s+AND\s+d\.year\s*=\s*\$1\s+AND\s+d\.is_paid\s*=\s*false\s*"
    r"GROUP\s+BY\s+p\.id\s*"
    r"ORDER\s+BY\s+p\.name`)",
    re.DOTALL
)

if not buggy_pattern.search(content):
    print("❌ Could not find the buggy parishSummaries query.")
    print("   It may have already been patched or the file format differs.")
    sys.exit(1)

fixed_sql = """`SELECT p.*,
        COALESCE((
          SELECT SUM(rli.amount)
          FROM remittance_records rr
          JOIN remittance_line_items rli ON rr.id = rli.remittance_record_id
          WHERE rr.parish_id = p.id AND rr.year = $1
        ), 0) as total_collected,
        COALESCE((
          SELECT COUNT(DISTINCT CASE WHEN rr.month BETWEEN 1 AND 12 THEN rr.month END)
          FROM remittance_records rr
          WHERE rr.parish_id = p.id AND rr.year = $1
        ), 0) as months_reported,
        (
          SELECT MAX(rr.created_at)
          FROM remittance_records rr
          WHERE rr.parish_id = p.id AND rr.year = $1
        ) as last_reported,
        COALESCE((
          SELECT SUM(d.balance)
          FROM debtors d
          WHERE d.parish_id = p.id AND d.year = $1 AND d.is_paid = false
        ), 0) as outstanding_balance
      FROM parishes p
      ORDER BY p.name`"""

content = buggy_pattern.sub(fixed_sql, content)

with open("src/graphql/resolvers.js", "w") as f:
    f.write(content)

print("✅ Fixed parishSummaries SQL query")
PYEOF

echo ""
echo "📊 Diff:"
diff -u .backups/resolvers.js.parish-fix.bak src/graphql/resolvers.js || true
echo ""

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ✅ FIX APPLIED                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "What changed:"
echo "  • Replaced multi-table JOIN + GROUP BY with correlated subqueries"
echo "  • total_collected, months_reported, and outstanding_balance"
echo "    are now computed independently — no more cross-product inflation"
echo ""
echo "Why it was broken:"
echo "  • LEFT JOIN remittance_records (1:N)"
echo "  • LEFT JOIN remittance_line_items (1:N)  "
echo "  • LEFT JOIN debtors (1:N)"
echo "  • These joins multiplied rows, causing SUM() to count values"
echo "    multiple times (e.g. 3 line items × 4 debtors = 12× inflation)"
echo ""
echo "Next steps:"
echo "  git add src/graphql/resolvers.js"
echo "  git commit -m 'Fix join fan-out bug inflating Parish Summary totals'"
echo "  git push"