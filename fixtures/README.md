# DeelSorted Fixtures

These fixtures are synthetic demo inputs. They are safe to commit and do not contain real payroll data.

## Deel G2N payroll JSON

`payroll-sample.json` is the schema-faithful mock of the documented Deel G2N response envelope used by the current runtime and browser upload flow.

`payroll-large-sample.json` is a larger schema-faithful mock with `150` contracts and `1200` payroll item lines. It is intended for load-style local demos and parser validation.

The UI labels this supported payroll upload as `Deel G2N JSON`.

Top-level fields:
- `data`
- `has_more`
- `created_at`
- `updated_at`
- `next_cursor`
- `items_per_page`

Each `data[]` contract entry includes:
- `contract_oid`
- `currency`
- `payment_data.conversion_rate`
- `payment_data.payment_currency`
- `items`

Each `items[]` entry includes:
- `label`
- `value`
- `category`
- `sub_category`
- `category_group`

The sample intentionally includes repeated concepts across multiple contracts and currencies so the current tests can prove normalization and deduplicated mapping behavior against schema-faithful inputs.

Important: the current supported Deel G2N upload shape does not include an explicit country field. The larger fixture uses country-themed `contract_oid` prefixes, currencies, and labels, but it stays schema-faithful by not inventing unsupported source fields.

## Legacy payroll JSON

`payroll-legacy-sample.json` preserves the original v1 demo upload shape as a checked-in reference fixture after the runtime parser cutover to G2N. It is not a supported upload path in the current app.

## Supported COA CSV

The checked-in COA fixtures now cover both the canonical demo header row and a supported alias-header variant:

- `coa-sample.csv` uses the canonical v1 header names.
- `coa-alias-sample.csv` uses a curated alias set for common ERP-style header names.
- `coa-large-sample.csv` uses the canonical v1 header names with a broader account set and alias coverage for the large payroll fixture.

Required canonical fields:
- `accountId`
- `accountCode`
- `name`
- `type`
- `normalSide`

Optional canonical fields:
- `description`
- `aliases`

Supported header aliases include:
- `id` for `accountId`
- `code`, `account number`, or `gl code` for `accountCode`
- `account name` for `name`
- `account description` for `description`
- `account type` for `type`
- `normal balance` for `normalSide`
- `search terms` or `keywords` for `aliases`

`aliases` continues to use a pipe-delimited string when present so the fixture stays easy to inspect in plain CSV form.
