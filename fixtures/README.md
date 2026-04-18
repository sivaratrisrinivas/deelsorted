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

`payroll-legacy-sample.json` preserves the original v1 demo upload shape while the runtime parser is still being cut over to G2N in the following slice.

## Supported COA CSV

`coa-sample.csv` is the single supported v1 chart-of-accounts upload shape.

Required headers:
- `accountId`
- `accountCode`
- `name`
- `description`
- `type`
- `normalSide`
- `aliases`

`aliases` uses a pipe-delimited string so the fixture stays simple until the dedicated CSV parsing slice lands.
