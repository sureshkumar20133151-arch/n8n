# 🏪 Sri Meenakshi Traders (SMT) - Trading & Inventory Tally Agent

## 📌 Overview
Dedicated AI Agent and n8n Workflow for **Sri Meenakshi Traders (SMT)**.
Specialized in wholesale & retail sales of electrical conduits, plumbing pipes, sanitary fittings, cables, and hardware items.

## 🎯 Key Capabilities
1. **Sales & Invoice Generation from WhatsApp:**
   - Accepts natural voice notes / texts (e.g. *"பாலாஜிக்கு 1-inch CPVC பைப் 10 பீஸ் ₹180-க்கு பில் போடு"*).
   - Extracts Party Name, Item Name, Quantity, Rate, and calculates Total.
2. **Direct Tally Prime Voucher Integration:**
   - Targets `<SVCURRENTCOMPANY>Sri Meenakshi Traders</SVCURRENTCOMPANY>`.
   - Automatically posts **Sales Vouchers**, **Purchase Vouchers**, and **Receipt Vouchers** to Tally Prime on Port 9000.
3. **Google Sheets Inventory & Sales Log:**
   - Logs transactions to `SMT_Sales_Tally_Log` and `SMT_Tally_Vouchers`.
4. **Tamil WhatsApp Invoice Summary:**
   - Sends customer invoice breakdowns with item, quantity, rate, total, and Tally status.

## 🔗 n8n Workflow Endpoint
- Webhook: `POST /webhook/smt-trading-tally`
- Workflow File: `smt_trading_tally_workflow.json`
