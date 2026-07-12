#!/bin/bash
API_URL="https://diocesan-finance-api.onrender.com/graphql"
ADMIN_EMAIL="admin@diocese.com"
ADMIN_PASSWORD="admin123"
echo "Logging in..."
ADMIN_TOKEN=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation { login(input: { email: \\\"$ADMIN_EMAIL\\\", password: \\\"$ADMIN_PASSWORD\\\" }) { token } }\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['login']['token'])")
if [ -z "$ADMIN_TOKEN" ]; then
  echo "Login failed."
  exit 1
fi
echo "Logged in."
echo
for YEAR in 2023 2024 2025 2026; do
  echo "=== $YEAR ==="
  curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{\"query\":\"{ remittanceRecords(year: $YEAR) { month lineItems { amount source { name } } } }\"}" \
  | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('errors'):
    print('  GraphQL error:', data['errors'])
    sys.exit()
records = data.get('data', {}).get('remittanceRecords') or []
annual = [r for r in records if r['month'] == 0]
print(f'  Total: {len(records)}  (annual/month=0: {len(annual)}, monthly: {len(records)-len(annual)})')
if annual:
    sources = {}
    for r in annual:
        for li in (r.get('lineItems') or []):
            name = li['source']['name']
            sources[name] = sources.get(name, 0) + (li['amount'] or 0)
    for name, total in sorted(sources.items()):
        print(f'    - {name}: {total:,.0f}')
else:
    print('    No annual records for this year.')
"
  echo
done
