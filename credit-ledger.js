// Credit Ledger — editable by Cam
// Each entry: { date, amount (pre-tax USD), note }
// Auto-recharge entries: Anthropic charges $226 CAD (=$200 USD pre-tax @ 13% HST)
// The 'amount' field is the PRE-TAX credit value (what Anthropic adds to your balance)
//
// To add a new entry: copy the last line, update date/amount/note
// To update balance: change current_balance and balance_checked_at
//
// This file is loaded by both the browser (as JS) and Python (parsed as JSON).
// RULES: No trailing commas. Use double quotes only. No JS comments inside the object.

const CREDIT_LEDGER = JSON.parse(`{
  "anthropic": {
    "entries": [
      { "date": "2026-02-10", "amount": 5.00,   "note": "Initial credit" },
      { "date": "2026-02-10", "amount": 35.00,  "note": "Initial credit" },
      { "date": "2026-02-10", "amount": 160.00, "note": "Initial credit" },
      { "date": "2026-02-12", "amount": 200.00, "note": "Auto-recharge" },
      { "date": "2026-02-17", "amount": 200.00, "note": "Auto-recharge" },
      { "date": "2026-02-21", "amount": 200.00, "note": "Auto-recharge" },
      { "date": "2026-02-25", "amount": 200.00, "note": "Auto-recharge" },
      { "date": "2026-02-26", "amount": 200.00, "note": "Auto-recharge" },
      { "date": "2026-02-28", "amount": 200.00, "note": "Auto-recharge" },
      { "date": "2026-03-01", "amount": 200.00, "note": "Auto-recharge" },
      { "date": "2026-03-02", "amount": 200.00, "note": "Auto-recharge" },
      { "date": "2026-03-02", "amount": 200.00, "note": "Auto-recharge" },
      { "date": "2026-03-04", "amount": 500.00, "note": "Recharge ($565 w/ HST)" }
    ],
    "current_balance": 350.00,
    "balance_checked_at": "2026-03-04T19:16:00-05:00"
  }
}`);
