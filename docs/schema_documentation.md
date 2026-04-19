# DeelSorted Data Schemas

This document describes the exact input formats accepted by the current
checked-in DeelSorted runtime.

If an uploaded file does not match these formats, the app will reject it during
upload parsing.

Current support:
- Payroll input: `Deel G2N JSON`
- COA input: `COA CSV`

Current non-support:
- arbitrary payroll JSON
- legacy payroll JSON fixture shape
- COA JSON
- arbitrary ERP export inference

## 1. Payroll Data: Deel G2N JSON

The payroll upload must be a JSON object matching the currently supported Deel
Global Payroll Gross-to-Net response envelope.

### Required top-level shape

```json
{
  "data": [
    {
      "contract_oid": "contract-gb-001",
      "currency": "GBP",
      "payment_data": {
        "conversion_rate": "1.00",
        "payment_currency": "GBP"
      },
      "items": [
        {
          "label": "Gross Pay",
          "value": 4200,
          "category": "Gross (Taxable)",
          "sub_category": "Salary",
          "category_group": "EARNINGS"
        }
      ]
    }
  ],
  "has_more": false,
  "created_at": "2026-04-18T08:30:00Z",
  "updated_at": "2026-04-18T08:30:00Z",
  "next_cursor": null,
  "items_per_page": 5
}
```

### Top-level fields

| Field | Required | Type | Rules |
| --- | --- | --- | --- |
| `data` | yes | array | Must be a non-empty array of contract objects. |
| `has_more` | yes | boolean | Standard boolean. |
| `created_at` | yes | string | Must match `YYYY-MM-DDTHH:MM:SSZ`. Milliseconds are not accepted by the current schema. |
| `updated_at` | yes | string | Must match `YYYY-MM-DDTHH:MM:SSZ`. |
| `next_cursor` | yes | string or `null` | If a string is provided, it must be non-empty. |
| `items_per_page` | yes | integer | Must be a positive integer. |

### Contract object fields

Each object in `data[]` must contain:

| Field | Required | Type | Rules |
| --- | --- | --- | --- |
| `contract_oid` | yes | string | Non-empty string. |
| `currency` | yes | string | Must be a 3-letter uppercase currency code such as `GBP`, `USD`, or `EUR`. |
| `payment_data` | yes | object | Must contain the fields below. |
| `items` | yes | array | Must be a non-empty array of payroll item objects. |

### `payment_data` fields

| Field | Required | Type | Rules |
| --- | --- | --- | --- |
| `conversion_rate` | yes | string | Non-empty string. |
| `payment_currency` | yes | string | Must be a 3-letter uppercase currency code. |

### Payroll item fields

Each object in `items[]` must contain:

| Field | Required | Type | Rules |
| --- | --- | --- | --- |
| `label` | yes | string | Non-empty string. |
| `value` | yes | number | Must be a finite number. |
| `category` | yes | string | Non-empty string. |
| `sub_category` | yes | string | Non-empty string. |
| `category_group` | yes | string | Non-empty string. See supported values below. |

### `category_group` values expected by the current runtime

The current normalization flow meaningfully supports these values:
- `EARNINGS`
- `DEDUCTIONS`
- `EMPLOYER_COSTS`
- `BENEFITS`
- `NET_PAY`

If `category_group` falls outside this set, the current runtime can fail during
normalization even if the top-level JSON shape is valid.

### Important notes

- The current supported payroll upload shape does not include an explicit
  country field.
- The current parser expects the file to be valid JSON before schema validation
  begins.
- The supported reference example is [fixtures/payroll-sample.json](../fixtures/payroll-sample.json),
  and the larger demo input is [fixtures/payroll-large-sample.json](../fixtures/payroll-large-sample.json).

## 2. Chart of Accounts: COA CSV

The COA upload must be a CSV file that matches the current parser contract.

### Canonical header row

```csv
accountId,accountCode,name,description,type,normalSide,aliases
```

### Required logical fields

The current parser requires these logical columns:
- `accountId`
- `accountCode`
- `name`
- `type`
- `normalSide`

These logical columns are optional:
- `description`
- `aliases`

### Accepted header aliases

The parser accepts the following headers for each logical field.

| Logical field | Accepted headers |
| --- | --- |
| `accountId` | `accountId`, `account_id`, `id` |
| `accountCode` | `accountCode`, `account_code`, `code`, `account_number`, `account number`, `gl_code`, `gl code` |
| `name` | `name`, `account_name`, `account name` |
| `description` | `description`, `account_description`, `account description` |
| `type` | `type`, `account_type`, `account type` |
| `normalSide` | `normalSide`, `normal_side`, `normal_balance`, `normal balance` |
| `aliases` | `aliases`, `alias`, `search_terms`, `search terms`, `keywords` |

### Row value rules

Each COA row must satisfy:

| Field | Required | Type | Rules |
| --- | --- | --- | --- |
| `accountId` | yes | string | Non-empty string. |
| `accountCode` | yes | string | Non-empty string. |
| `name` | yes | string | Non-empty string. |
| `description` | no | string | May be blank. |
| `type` | yes | string | Must be one of `asset`, `liability`, `equity`, `revenue`, or `expense`. |
| `normalSide` | yes | string | Must be either `debit` or `credit`. |
| `aliases` | no | string | May be blank. When present, aliases must be pipe-delimited using `|`. |

### Example row

```csv
accountId,accountCode,name,description,type,normalSide,aliases
exp-payroll-tax,5400,Payroll Taxes,Employer payroll tax expense,expense,debit,employer tax|national insurance|social insurance
liab-net-pay,2220,Net Pay Liability,Net salary payable,liability,credit,net pay|salary payable|wages payable
```

### Important COA parser notes

- The file must contain at least one account row.
- The parser skips blank lines.
- If two headers both map to the same logical field, parsing fails. For example,
  including both `code` and `gl code` in the same file would currently be
  rejected because both map to `accountCode`.
- The supported reference examples are [fixtures/coa-sample.csv](../fixtures/coa-sample.csv),
  [fixtures/coa-alias-sample.csv](../fixtures/coa-alias-sample.csv), and
  [fixtures/coa-large-sample.csv](../fixtures/coa-large-sample.csv).

## Practical Guidance for Users

When asking someone else to use the app, the safest instruction is:

1. Upload a payroll file that matches the current `Deel G2N JSON` schema.
2. Upload a COA file that matches the current supported `COA CSV` schema.
3. If their files do not already match these schemas, use the built-in demo
   samples instead of trying to upload unsupported shapes.
