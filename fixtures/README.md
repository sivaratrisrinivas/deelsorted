# DeelSorted Fixtures

These fixtures are synthetic demo inputs. They are safe to commit and do not contain real payroll data.

## Deel G2N payroll JSON

`payroll-sample.json` is now a schema-faithful mock of the documented Deel G2N response envelope used for the next ingestion slice.

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

The sample intentionally includes repeated concepts across multiple contracts and currencies so later slices can prove normalization and deduplicated mapping behavior against schema-faithful inputs.

## Legacy payroll JSON

`payroll-legacy-sample.json` preserves the original v1 demo upload shape as a checked-in reference fixture after the runtime parser cutover to G2N.

## Supported COA CSV

The checked-in COA fixtures now cover both the canonical demo header row and a supported alias-header variant:

- `coa-sample.csv` uses the canonical v1 header names.
- `coa-alias-sample.csv` uses a curated alias set for common ERP-style header names.

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
