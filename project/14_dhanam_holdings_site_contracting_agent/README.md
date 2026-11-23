# 🏢 Dhanam Holdings - Site Contracting & Tally Automation Agent

## 📌 Overview
Dedicated AI Agent and n8n Workflow for **Dhanam Holdings**.
Designed for construction site contracting, civil projects, real estate, and MEP operations.

## 🎯 Key Capabilities
1. **Site Billing & Cash Flow Tracking:**
   - Tracks whether payments were made by Owner, Contractor, or Self.
   - Categorizes status: Received, Pending, or Advance.
2. **Direct Tally Prime Voucher Integration:**
   - Targets `<SVCURRENTCOMPANY>Dhanam Holdings</SVCURRENTCOMPANY>`.
   - Automatically posts **Receipt Vouchers**, **Payment Vouchers**, and **Purchase Vouchers** to Tally Prime on Port 9000.
3. **Google Sheets Audit Trail:**
   - Logs every transaction to `Dhanam_Holdings_Tally_Log` and `Site_Bills_Log`.
4. **Tamil WhatsApp Instant Alerts:**
   - Dispatches formatted confirmation messages with site name, party, amount, and voucher status.

## 🔗 n8n Workflow Endpoint
- Webhook: `POST /webhook/dhanam-holdings-tally`
- Workflow File: `dhanam_holdings_tally_workflow.json`
