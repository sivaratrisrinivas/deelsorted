# DeelSorted Fixtures

These fixtures are synthetic demo inputs for the v1 happy path. They are safe to commit and do not contain real payroll data.

## Supported payroll JSON

`payroll-sample.json` is the single supported v1 payroll upload shape for the first demo loop.

Top-level fields:
- `payrollRunId`
- `generatedAt`
- `period.startDate`
- `period.endDate`
- `items`

Each `items[]` entry includes:
- `itemId`
- `workerId`
- `workerName`
- `countryCode`
- `currency`
- `category`
- `code`
- `label`
- `amount`

The sample intentionally includes repeated concepts across the UK, Brazil, and Germany so later slices can prove normalization and deduplicated mapping behavior.

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
