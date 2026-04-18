# DeelSorted Data Schemas

DeelSorted is strictly designed to parse two specific types of files. You must ensure that any files you upload match these schemas precisely, otherwise the reconciliation engine will reject them or classify lines as anomalies. 

The application currently supports **JSON** for the global payroll data and **CSV** for your internal Chart of Accounts (COA). 

---

## 1. Payroll Data (Deel G2N JSON)

This file requires the exact structure of a **Deel Global-to-Net (G2N) JSON export**.

### Why this format?
DeelSorted relies on the strict hierarchy embedded within G2N reports. Things like `category_group` are essential for the application to ascertain whether a line is an Employer Tax, an Employee Deduction, Net Pay, or Gross Earnings. The engine translates these structural categorizations into rules governing normal sides (debits vs credits) before handing off ambiguous descriptions to the AI for mapping. 

### Schema Requirements

The uppermost level of the JSON **must** include a `data` array representing contracts.

```json
{
  "data": [
    {
      "contract_oid": "STRING",     // Unique identifier for the contract
      "currency": "STRING",         // e.g. "USD", "GBP", "EUR"
      "payment_data": {
        "conversion_rate": "STRING",
        "payment_currency": "STRING"
      },
      "items": [
        {
          "label": "STRING",            // Extracted description of the pay unit (e.g. "Income Tax")
          "value": NUMBER,              // The numeric monetary amount (e.g. 500.25)
          "category": "STRING",         // The high level categorization (e.g. "Taxes")
          "sub_category": "STRING",     // E.g. "Income Tax"
          "category_group": "STRING"    // MUST map to: EARNINGS, DEDUCTIONS, EMPLOYER_COSTS, BENEFITS, or NET_PAY
        }
      ]
    }
  ]
}
```

---

## 2. Chart of Accounts (CSV)

This file tells DeelSorted where your business expenses and liabilities belong. The file must be delimited by commas `,` and correctly quote commas that belong in text descriptions. 

### Why this format?
Accounting data necessitates unambiguous types and normal sides to allow DeelSorted to build mathematically balanced journals. Furthermore, the `aliases` column permits finance operators to feed human-written heuristics to the engine bypassing AI completely when perfect memory hits occur.

### Schema Requirements (Headers)

An exact match of the following headers must form the top row of your CSV input file:
`accountId,accountCode,name,description,type,normalSide,aliases`

| Header Column | Description | Acceptable Values |
| --- | --- | --- |
| **`accountId`** | The unique identifier for this account. | Any non-empty string. |
| **`accountCode`** | The ledger account number or index identifier. | Any non-empty string. |
| **`name`** | The name of the account in your ledger. | Any non-empty string (e.g., "Payroll Taxes Expense"). |
| **`description`** | The purpose of the account to help the AI map edge cases. | Any string (can be empty). |
| **`type`** | The accounting categorisation of the row. | Must be: `asset`, `liability`, `equity`, `revenue`, or `expense`. |
| **`normalSide`** | Whether the account traditionally carries a debit or credit balance. | Must be: `debit` or `credit`. |
| **`aliases`** | Semicolon-separated values providing strict regex alternatives for the account mapping. | Semicolon delimited (e.g. `National Insurance;NI;Social Security`). |

### Example

```csv
accountId,accountCode,name,description,type,normalSide,aliases
exp-payroll-salary,6010,Salaries and Wages,Employee gross pay and performance bonuses,expense,debit,gross pay;base salary;bonus
liab-net-pay,2110,Payroll Payable,Net salaries owed to employees for the period,liability,credit,net pay;net salary;payroll
```
