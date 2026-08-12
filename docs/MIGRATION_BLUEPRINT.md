# Budget Cycles — Migration Blueprint

**Purpose of this document**: a complete, technology-agnostic specification of the current Laravel + React (Inertia) application, written so it can be handed to a fresh Claude Code session in a *new* project (e.g. a .NET rewrite) and used to reproduce the app's behavior exactly — schema, business rules, API surface, and UI behavior — without needing to re-derive any of it from the original codebase.

Everything below reflects the **live database schema** (queried directly, not reconstructed from migration diffs) and the **current state of the code** as of this document's generation. Where a rule is non-obvious or was the subject of a past bug fix, that context is included so the same mistake isn't repeated in the rewrite.

---

## 1. What this app is

A budget planning & tracking tool for 5-year capital investment cycles ("budget cycles"). Each cycle covers a `start_year` through `start_year + 4`. Users (via an Excel upload or manual entry) populate a list of **projects**, each with a 5-year **cash** and **cost** plan, plus a 2-year **commitment** figure. The app tracks multiple **versions** of a cycle (draft → finalized/locked), lets users compare versions, exports/imports Excel, shows dashboards, and keeps a full activity/change log.

### Current tech stack (for reference only — not prescriptive for the rewrite)
- **Backend**: PHP 8.2, Laravel 12, Inertia.js (server-driven SPA — no separate REST/JSON API contract for pages; JSON endpoints exist only for AJAX actions), Laravel Excel (maatwebsite/excel) for import/export, Pusher (via `laravel-echo`/`pusher-js`) for real-time broadcasts, MySQL.
- **Frontend**: React 18, AG Grid (Community + Enterprise features used: row grouping headers, custom filters) for the main spreadsheet, Chart.js + `ag-charts-react` for dashboard charts, Tailwind CSS, SweetAlert2 for confirm dialogs.
- **Auth**: Laravel Breeze (session-based, cookie auth), two roles: `editor` (full access) and `viewer` (read-only, cannot export, cannot mutate).

---

## 2. Database Schema (ground truth, from live MySQL `SHOW COLUMNS`)

### `users`
| Column | Type | Null | Default |
|---|---|---|---|
| id | bigint unsigned PK | no | |
| name | varchar(255) | no | |
| email | varchar(255) unique | no | |
| email_verified_at | timestamp | yes | |
| password | varchar(255) | no | |
| role | varchar(255) | no | `editor` |
| remember_token | varchar(100) | yes | |
| created_at / updated_at | timestamp | yes | |

`role` is a plain string, not an enum in the DB — application code treats only `'editor'` and `'viewer'` as valid values (see `UserController::ROLES`).

### `budget_cycle_periods`
| Column | Type | Null | Default |
|---|---|---|---|
| id | bigint unsigned PK | no | |
| approval_status | varchar(255) | yes | |
| start_year | varchar(255) | yes | |
| end_year | varchar(255) | yes | |
| total_cost | decimal(18,2) | yes | |
| total_cast | decimal(18,2) | yes | |
| version | int | no | |
| created_at / updated_at | timestamp | yes | |

Notes:
- `start_year`/`end_year` are **strings** in the DB (legacy — new code treats them as ints via casts on read, but don't rely on the column type).
- `total_cast` is a **typo** of `total_cash` baked into the schema — it exists but is essentially unused/dead (never read anywhere in the app; only ever written as `0` on creation). Do not carry the typo into the rewrite; just omit or correctly name it `total_cash` if you want the column at all — nothing depends on it.
- **A period is uniquely identified by `(start_year, version)`**. This is not a DB unique constraint (should be added in the rewrite) — it's enforced only by application logic (see §4.1).
- `approval_status` values (see `App\ApprovalStatus` enum): `approved`, `on_going`, `submission`, `final`. `final` = locked/read-only.

### `projects`
| Column | Type | Null |
|---|---|---|
| id | bigint unsigned PK | no |
| sap_code | varchar(255) | yes |
| project_title | varchar(255) | yes |
| note | text | yes |
| status_progress | varchar(255) | yes |
| project_manager | varchar(255) | yes |
| project_control | varchar(255) | yes |
| directorate | varchar(255) | yes |
| owner_area | varchar(255) | yes |
| type_of_investment | varchar(255) | yes |
| category | varchar(255) | yes |
| risk_residual | varchar(255) | yes |
| risk_forecast | varchar(255) | yes |
| fm_new | varchar(255) | yes |
| year_period | varchar(255) | yes |
| budget_cycle_period_id | bigint unsigned FK → budget_cycle_periods.id | yes (no `onDelete` — defaults to RESTRICT under MySQL) |
| created_at / updated_at | timestamp | yes |

`year_period` = the cycle's `start_year`, stored redundantly on every project row (also derivable via `budgetCyclePeriod.start_year`, but the app queries `year_period` directly for performance — every year/version filter in the codebase filters `year_period` + `budgetCyclePeriod.version` together).

### `budget_settings` (1:1 with `projects`)
| Column | Type |
|---|---|
| id | bigint unsigned PK |
| project_id | bigint unsigned FK → projects.id, **ON DELETE CASCADE** |
| budget_cost | decimal(18,2) |
| actual_to_date | decimal(18,2) — cash actual spend to date |
| actual_to_date_cost | decimal(18,2) — cost actual spend to date |
| budget_car | decimal(18,2) — the approved CAR (Capital Appropriation Request), immutable baseline |
| bc_budget | decimal(15,2) |
| budget_5yp | decimal(18,2) — **computed**, cash remaining CAR balance (see §4.5) |
| budget_5yp_cost | decimal(18,2) — **computed**, cost remaining CAR balance |
| start_year | int |
| num_of_year_budget | varchar(255) — how many years the remaining CAR is spread over (stored as string, semantically an int 1–5) |
| total_cash | decimal(18,2) — sum of all 5 years of cash plan for this project |
| total_cost | decimal(18,2) — sum of all 5 years of cost plan |
| cash_remaining | decimal(18,2) |
| cost_remaining | decimal(18,2) |
| forecast_cost | decimal(18,2) |
| forecast_cash | decimal(18,2) |
| created_at / updated_at | timestamp |

### `cash_cost_yearlies` (many:1 with `projects`)
| Column | Type |
|---|---|
| id | bigint unsigned PK |
| project_id | bigint unsigned FK → projects.id (no cascade specified — `CashCostMonthly` cascades, this table does not) |
| type | **enum('cash','cost','commitment')** |
| year | year (MySQL YEAR type) |
| amount | decimal(15,2) nullable |
| created_at / updated_at | timestamp |

One row per `(project_id, type, year)`. This is the source of truth for every per-year cash/cost/commitment figure shown anywhere in the app (grid columns, dashboard sums, KPI cards). `commitment` type was added later (migration `2026_08_11`) — originally only `cash`/`cost` existed.

### `cash_cost_monthlies` (many:1 with `cash_cost_yearlies`)
| Column | Type |
|---|---|
| id | bigint unsigned PK |
| yearly_id | bigint unsigned FK → cash_cost_yearlies.id, **ON DELETE CASCADE** |
| month | tinyint unsigned (1–12) |
| amount | decimal(15,2) nullable |
| type | varchar(255) — redundant copy of the parent yearly row's `type` (`cash`/`cost`; commitment is never broken into months) |
| created_at / updated_at | timestamp |

Only populated for "near-term" years (years before `start_year + 2`, see §4.7 monthly distribution) and only for `cash`/`cost`, never `commitment`.

### `activity_logs`
| Column | Type |
|---|---|
| id | bigint unsigned PK |
| user_id | bigint unsigned FK → users.id, **nullable, ON DELETE SET NULL** |
| action | varchar(255) — dot-namespaced string, e.g. `project.created`, `budget.finalized` (full list in §4.9) |
| subject_type | varchar(255) nullable — polymorphic morph class (Eloquent's `getMorphClass()`, effectively the model's class name) |
| subject_id | bigint unsigned nullable — polymorphic morph id |
| description | varchar(255) — human-readable summary, already formatted with names/counts baked in |
| properties | **text** column, JSON-encoded/decoded by the app (cast as PHP array). Stored as TEXT not native JSON — see comment in the migration: some deployed MySQL instances still default new InnoDB tables to `ROW_FORMAT=REDUNDANT/COMPACT`, and a native JSON column on that row format fails with "Got error 168 from storage engine". **If your MySQL/target DB doesn't have this constraint, use a native JSON column instead — this was a defensive workaround, not a design requirement.** |
| created_at / updated_at | timestamp |

Index on `(subject_type, subject_id)` and on `created_at`.

`properties` shape when populated (from field-level diffs): `{"field_name": {"old": "...", "new": "..."}, ...}`.

### `project_change_logs`
| Column | Type |
|---|---|
| id | bigint unsigned PK |
| project_id | bigint unsigned FK → projects.id, **ON DELETE CASCADE** |
| user_id | bigint unsigned FK → users.id nullable, **ON DELETE SET NULL** |
| field | varchar(255) |
| old_value | text nullable |
| new_value | text nullable |
| created_at / updated_at | timestamp |

Index on `(project_id, created_at)`. This is a **per-field** audit trail (one row per changed field per save) shown on the grid's row history panel — distinct from `activity_logs`, which is a **per-action** summary feed shown on the admin Activity Log page. Both get written on every project update (see §4.8).

### `version_logs`
| Column | Type |
|---|---|
| id | bigint unsigned PK |
| budget_cycle_period_id | bigint unsigned FK → budget_cycle_periods.id |
| version | int |
| description | text |
| created_at / updated_at | timestamp |

**Currently unused** — table exists, model does not (no Eloquent model was ever created for it). Not written to or read from anywhere in the current codebase. Safe to omit from the rewrite, or keep as a placeholder for future version-change annotations.

### Standard Laravel scaffolding tables (not domain-specific)
`password_reset_tokens`, `sessions`, `cache`, `jobs` — standard Breeze/Laravel infrastructure. Reproduce with whatever session/cache/job mechanism the .NET stack uses; no business logic lives here.

---

## 3. Entity Relationships

```
User 1───* ActivityLog (user_id, nullable, set-null on delete)
User 1───* ProjectChangeLog (user_id, nullable, set-null on delete)

BudgetCyclePeriod 1───* Projects (budget_cycle_period_id)
BudgetCyclePeriod 1───* VersionLog (unused)

Projects 1───1 BudgetSetting (project_id, cascade delete)
Projects 1───* CashCostYearly (project_id)
Projects 1───* ProjectChangeLog (project_id, cascade delete)

CashCostYearly 1───* CashCostMonthly (yearly_id, cascade delete)

ActivityLog *───1 (polymorphic) subject — usually a Projects or BudgetCyclePeriod row, sometimes a User row
```

**Uniqueness rules enforced only in application code (not DB constraints — add them in the rewrite):**
- `(budget_cycle_periods.start_year, budget_cycle_periods.version)` should be unique. (A past bug: unconditional `create()` instead of `firstOrCreate()` let duplicates form; see §4.1.)
- `(projects.sap_code, projects.budget_cycle_period_id)` should be unique. (Same class of bug on the import path; see §4.2.)
- `(cash_cost_yearlies.project_id, type, year)` should be unique — enforced via `updateOrCreate`/`firstOrNew` everywhere it's written, never a raw `insert`.
- `(cash_cost_monthlies.yearly_id, month, type)` likewise.

---

## 4. Business Rules (the parts that must survive the rewrite exactly)

### 4.1 Budget cycle period creation — `firstOrCreate`, not `create`
Whenever a period needs to exist for a given `(start_year, version=0)` — on manual project creation, Excel import (first-time), or duplicate — the app calls the equivalent of:

```
period = BudgetCyclePeriod.firstOrCreate(
    match: { start_year, version: 0 },
    defaults: { approval_status: <passed-in status>, end_year: start_year + 4, total_cost: 0 }
)
```

**Critical**: the `approval_status` passed in is only applied if the row is newly created. If a period for that `(start_year, 0)` already exists, its current status is left untouched — even if a caller passes a different status. This is intentional: every caller passes a fixed status regardless of program state (upload/store/duplicate always pass `APPROVED`), so honoring the passed status on a match would silently reset an already-progressed period's status back to `APPROVED` on every subsequent action.

**Why this matters**: an earlier version of this code used unconditional `create()`. That let two rows share `(start_year, version)`, and every "which version is the latest" query elsewhere (`ORDER BY version DESC LIMIT 1`, `WHERE version = MAX(version)`) then became ambiguous about which physical row it meant — different pages could silently resolve to different periods, causing one user's import to be invisible to another user looking at "the same" period. **Do not reintroduce unconditional creation of a period row anywhere.**

### 4.2 Project import upsert — `firstOrNew`, not `create`
When importing a row from Excel into an **existing** period/version (the "re-import" flow, see §4.3), each row is matched by `(sap_code, budget_cycle_period_id)`:

```
project = Projects.firstOrNew(match: { sap_code, budget_cycle_period_id })
project.fill(...all mapped fields...)
project.save()
```

If a project with that SAP code already exists in that exact period+version, it's **updated in place** (all fields overwritten with the new file's values). If not, a new row is created. This must apply **regardless of whether the period itself was just created or already existed** — an earlier bug conditioned this on a flag and used unconditional `create()` on one branch, which inserted a duplicate project every time the same SAP code was re-uploaded into the same period.

### 4.3 Two distinct import endpoints with different semantics

**A. `POST /budgets/upload`** (`ProjectsController::upload`) — used to **create a brand-new cycle** from an Excel file (year not previously seeeded). Creates/reuses a version-0 period via §4.1, imports every row via §4.2. **Does not delete anything** — there's no "stale row" concept here because it's a new/reused period, not a full-cycle replace.
- If zero valid rows were parsed (see SAP code validation, §4.4), the just-created period is deleted and the request fails with 422 — this guards against silently creating an empty, orphaned period.

**B. `POST /budgets/import-project`** (`ProjectsController::uploadProject`) — used to **re-import into an existing version** from the main grid page ("Budget Cycle Detail"). This is a **full sync/replace** for that one `(year, version)`:
1. Resolve the target `BudgetCyclePeriod` by `(start_year, version)` from the request. Reject (423) if it's not the latest version for that year, or if `approval_status == final` (locked).
2. Run the import (upsert every row per §4.2).
3. If zero valid rows processed → abort entirely (rollback), to avoid the deletion step below wiping out every project in the version because of an empty/garbled file.
4. **Delete every project in that period whose `sap_code` is *not* present anywhere in the uploaded file** (`getImportedSapCodes()` — every SAP code *seen*, valid or not, so a row that failed validation still "protects" that project from deletion). For each deleted project: delete its `cash_cost_yearlies` rows, its `budget_settings` row, then the project itself.
5. The whole operation (steps 2–4) runs inside one DB transaction.
6. **Dry-run mode** (`dry_run=1` in the request): steps 2–4 still execute against the DB (so accurate counts can be computed), but the transaction is **rolled back** instead of committed, and the response reports `{ dry_run: true, updated: N, deleted: N, deleted_titles: [...] }` (first 10 titles) without persisting anything. This exists so the frontend can show the user "this will update N and delete N projects (e.g. X, Y, Z...)" before they confirm a destructive import.
   - **Bug class to avoid in the rewrite**: any side effect that fires as a result of the import running (e.g. a "data changed" real-time broadcast/event) must be suppressed during dry-run — the transaction rolls back the DB writes, but an out-of-band broadcast fired mid-transaction is not rolled back with it, and would leak about-to-be-discarded data to every connected client. The fix here was to thread an `isDryRun` flag into the import class and check it before broadcasting.
7. On real (non-dry-run) success: recompute dashboard/list caches, write one `ActivityLog` entry (`project.imported`) summarizing counts, commit.

### 4.4 SAP code validation (import row acceptance)
A row is only processed if `sap_code` matches the regex `^C[0-9]` — i.e. starts with the literal letter `C` followed by a digit `0`–`9` (so `C0...` through `C9...` are all valid; earlier code mistakenly excluded `C0` codes with `^C[1-9]`, this was fixed). Rows with a non-null `sap_code` that fail this check are recorded as "rejected" (shown to the user, up to first 10, in error messages) but not persisted. Rows with a null/empty `sap_code` are silently skipped (not counted as rejected).

### 4.5 Budget 5YP (remaining CAR balance) formula
`budget_car` (the approved CAR) is an immutable baseline set once. The "remaining balance not yet drawn" is recomputed every time actual-to-date or forecast changes:

```
budget_5yp       = budget_car - actual_to_date      - forecast_cash
budget_5yp_cost  = budget_car - actual_to_date_cost - forecast_cost
```

Never mutate `budget_car` itself when recomputing — only these two derived fields change.

### 4.6 CAR variance / status badge (frontend-only, not persisted)
Shown per row as a "CAR Status" indicator:
```
used = actual_to_date + forecast_cash
usedPct = used / budget_car * 100   (if budget_car <= 0 → status "none", no badge)
usedPct > 100  → status "over"   ("Over CAR {pct}%")
usedPct >= 90  → status "near"   ("Near Limit {pct}%")
else           → status "within" ("{pct}%")
```

### 4.7 Annual + monthly auto-distribution of the remaining balance
When a user edits `actual_to_date`, `forecast_cost`, `forecast_cash`, `start_year`, or `num_of_year_budget` (on the main grid or the simplified "My Forecast" page), the app:
1. Recomputes `budget_5yp`/`budget_5yp_cost` (§4.5).
2. Spreads that remaining balance **evenly** across `num_of_year_budget` years starting at `start_year`:
   ```
   years = int(num_of_year_budget) || 1
   perYearCash = budget_5yp > 0 ? budget_5yp / years : 0
   perYearCost = budget_5yp_cost > 0 ? budget_5yp_cost / years : 0
   for each year in [gridStartYear .. gridEndYear]:
       inRange = year >= start_year && year < start_year + years
       cash_{year} = inRange ? perYearCash : 0
       cost_{year} = inRange ? perYearCost : 0
   ```
3. For years that fall **before `start_year + 2`** (i.e. "near-term", detailed enough to need month-level timing) **and** within the funded window, further spreads that year's `cost` total evenly across its 12 months: `cost_{month}_{year} = perYearCost / 12`. (Cash is never broken into months — only cost.) `yearlyBudget = startYear + 2` is the cutoff constant used both on the main grid and the "My Forecast" page — keep them in sync in the rewrite.
4. This distribution can be **manually overridden** per year/month by directly editing a `cash_{year}`/`cost_{year}`/`cost_{month}_{year}` cell — the auto-distribution only runs in response to editing the *driving* fields listed above, never overwrites a manually-edited cell as a side effect of an unrelated edit.
5. **Distribution-mismatch flag** (frontend, informational only): if the sum of `cash_{year}` across the funded window differs from `budget_5yp` by more than 1 (rounding tolerance), flag the row — this catches a manual per-year edit that's drifted from what the even split would produce.

### 4.8 Editing a project — persisted writes + audit trail
On every project field update (`PUT /budgets/{id}`):
1. Reject with 423 if the project's period `isLocked` (see §4.10).
2. Update the `projects` row and its `budget_settings` row (create the settings row if it doesn't exist yet).
3. For every request key matching `^(cash|cost|commitment)_(\d{4})$` (e.g. `cash_2027`): upsert the corresponding `CashCostYearly` row (`project_id`, `type`, `year`) — update `amount` if it exists, else create it.
4. For every request key matching `^(cash|cost)_(1-12)_(\d{4})$` (e.g. `cost_3_2027` = March 2027 cost): find the parent yearly row, then upsert the matching `CashCostMonthly` row the same way. (`commitment` never has a monthly breakdown.)
5. **Change tracking**: diff the pre-update snapshot vs. post-update for `projects` fields, `budget_settings` fields, and the yearly cash/cost/commitment fields touched in step 3 (monthly fields in step 4 are *not* individually diffed into the change log). For every field that actually changed (skip no-ops and the internal fields `id`, `created_at`, `updated_at`, `project_id`, `budget_cycle_period_id`):
   - Write one `ProjectChangeLog` row (`field`, `old_value`, `new_value`).
   - Accumulate into a single `properties` map.
6. If anything changed, write **one** `ActivityLog` entry (`project.updated`) with a description listing every changed field name, and `properties` = the full old/new map from step 5.
7. Recompute and broadcast updated dashboard/budget-list/single-budget data (real-time, see §5).
8. If the project row referenced by `{id}` no longer exists (e.g. it was replaced by a more recent import, which mints new row IDs) → return a friendly 404, not a raw "No query results for model" error.

### 4.9 Every `ActivityLog` action string currently emitted
| action | when |
|---|---|
| `project.created` | manual blank-row add, or `store()` |
| `project.updated` | any field-level edit via `PUT /budgets/{id}` (only if something actually changed) |
| `project.deleted` | bulk delete (`DELETE /budgets`) |
| `project.duplicated` | `duplicate()` |
| `project.imported` | either import endpoint, on success — description includes filename, row-updated count, and (for the re-import endpoint) deleted-project count |
| `budget.finalized` | `PUT /budgets-finalize/{year}/{version}` |
| `budget.locked` | `PUT /budgets-lock/{year}/{version}` |
| `budget.version_deleted` | `DELETE /budgets-version/{year}/{version}` |
| `user.created` / `user.updated` / `user.deleted` | user management (editor-only) |

`ActivityLog::record()` is the single write path — always call through one helper so `user_id` (from the current auth session) is never forgotten.

### 4.10 Locking rules
A project (and therefore its period) is **locked** (read-only) if:
- Its period's `approval_status === 'final'`, **or**
- Its period's `version` is **not** the highest version that exists for that `start_year` (i.e. only the single latest version of any cycle is ever editable; every older version is permanently frozen once superseded).

Locked projects cannot be edited (`PUT`) or bulk-deleted. A locked *version* cannot be imported into, finalized again, or locked again (each of those actions independently re-checks "is this the latest version" and "is this already final", returning HTTP 423 if either check fails).

### 4.11 Finalize / Lock / Version lifecycle
- **Finalize** (`PUT /budgets-finalize/{year}/{version}`): only allowed on the latest, non-final version. Sets `approval_status = submission`, then **duplicates the entire period** (`duplicateDataFinalize`): clone the `BudgetCyclePeriod` row with `version = version + 1`, and deep-clone every project under it (project → budget_settings → cash_cost_yearlies → cash_cost_monthlies), all via `chunk(20)` for the projects loop to bound memory. The new version starts as an editable copy; the old version is now permanently frozen (superseded, so `isLocked` becomes true for it via the "not the latest version" rule) — its `approval_status` is left at `submission`, not changed to `final`.
- **Lock** (`PUT /budgets-lock/{year}/{version}`): only allowed on the latest, non-final version. Sets `approval_status = final` directly (no duplication) — this is the terminal, fully-approved state. A `final` version can never be finalized/locked/imported into again.
- **Delete version** (`DELETE /budgets-version/{year}/{version}`): refuses if it's the only version for that year (at least one version must always exist). Otherwise deletes the period and everything under it (projects → cash_cost_yearlies → cash_cost_monthlies → budget_settings), all in one transaction, and logs `budget.version_deleted` with the pre-delete project count in the description (compute the count *before* deleting).

### 4.12 Export (Excel download) — exact column order
`POST /export/budgets` (viewer role forbidden — 403). Streams an `.xlsx` built from `resources/views/export/export_budget.blade.php`, columns **in this exact order** (1-indexed as they'd appear in Excel; the import mapping in §4.13 depends on this exact order):

1. ID
2. SAP Code
3. Project's Title
4. Note
5. ongoing/new (status_progress)
6. PM (project_manager)
7. PC (project_control)
8. Directorate
9. Owner Area
10. Type of Investment
11. Category
12. Risk Residual
13. Risk Forecast
14. BC Budget
15. Approved Budget (budget_car)
16. Actual Up to {year-1} Cost (actual_to_date_cost)
17. Actual Up to {year-1} Cash (actual_to_date)
18. A/F {year} Cost (forecast_cost)
19. A/F {year} Cash (forecast_cash)
20. Budget 5YP Cost
21. Budget 5YP Cash (budget_5yp)
22. Start year
23. Budget Year 1/2/3/4/5 (num_of_year_budget)
24. Fund (fm_new)
25–29. Cost {year} .. Cost {year+4} (5 columns)
30. Cost {year}-{year+4} Total (total_cost)
31–35. Cash {year} .. Cash {year+4} (5 columns)
36. Cash {year}-{year+4} Total (total_cash)
37–89. **52 monthly placeholder columns** — 4 blocks of 13 (Jan–Dec + a "Total" column) for Cost-2026/Cash-2026/Cost-2027/Cash-2027 headers. **These are always exported as literal `-`** (the app doesn't track monthly figures at the export granularity/window shown here) — they exist purely to keep column *count* stable so the next two columns land in a fixed position.
90. Commitment {year-1}
91. Commitment {year}

**Why the padding matters**: commitment was added late in this app's life and deliberately placed as the *very last two columns* (after 52 padding placeholders) specifically so its position never shifts regardless of what happens to the columns before it. If you redesign the export in the rewrite, you don't need to keep the 52 dead placeholder columns — but you do need §4.13's import to read whatever position you put commitment in, and that position must stay stable release-to-release (a real production incident occurred from this position drifting between the export and import sides not agreeing).

### 4.13 Import — exact column → field mapping (positional, 0-indexed array offsets as read by PhpSpreadsheet)
The importer reads by **column position**, not header name (the header row is skipped via `startRow() = 2`). Current mapping (`ProjectsImport::map()`):

| Excel col (0-idx) | Field | Excel col (0-idx) | Field |
|---|---|---|---|
| 1 | sap_code (trimmed) | 20 | budget_5yp |
| 2 | project_title | 21 | start_year |
| 3 | note | 22 | num_of_year_budget |
| 4 | status_progress | 23 | fm_new |
| 5 | project_manager | 24–28 | cost_first..cost_fifth |
| 6 | project_control | 29 | cost_total |
| 7 | directorate | 30–34 | cash_first..cash_fifth |
| 8 | owner_area | 35 | cash_total |
| 9 | type_of_investment | 88 | commitment_previous_year |
| 10 | category | 89 | commitment_current_year |
| 11 | risk_residual | | |
| 12 | risk_forecast | | |
| 13 | bc_budget | | |
| 14 | budget_car | | |
| 15 | actual_to_date_cost | | |
| 16 | actual_to_date | | |
| 17 | forecast_cost | | |
| 18 | forecast_cash | | |
| 19 | budget_5yp_cost | | |

Column 0 is skipped (that's the "ID" column on export — not consumed on import). Columns 36–87 (the 52 monthly placeholders) are **not read at all**.

`cash_first`..`cash_fifth` and `cost_first`..`cost_fifth` map to `CashCostYearly` rows for `year = importYear + 0` through `importYear + 4` respectively (index-aligned, not by column header). `commitment_previous_year`/`commitment_current_year` map to `year = importYear - 1` and `year = importYear` respectively — commitment is **only ever these two years**, never the full 5-year span.

**This positional mapping is fragile by nature** (a column inserted/removed anywhere before position 88 silently shifts commitment onto the wrong data) — if the .NET rewrite still needs to support the existing Excel template, keep this exact layout. If you control both sides fresh in the rewrite, strongly prefer **header-name-based** mapping instead of position-based — this was a repeated source of real bugs in the current app (see §6).

### 4.14 Dashboard aggregation formulas
All dashboard chart figures are **cash-only** unless explicitly labeled "Cost" — this was a deliberate late fix (see §6) after count/budget mismatches were found from not consistently filtering by `type = 'cash'`.

- **5YP Plan bar chart**: for each year in `[startYear-1 .. startYear+4]`, sum `cash` amounts across every project in the latest version of that period. A trailing "5YP" aggregate bar = sum of all the per-year bars. "Prior Cycle" comparison line = the same sum computed against `startYear - 1`'s own period (its own latest version) if a real `BudgetCyclePeriod` exists for that year; otherwise (only ever true for the literal year 2025, which predates this system) falls back to a hardcoded reference array `[150000000, 200281789, 194704553, 178882078, 104596538, 0]`. Any other year with no real prior data shows as a genuine zero — never borrow the 2025 fallback numbers for a different year.
- **Cost vs Cash bar chart**: same per-year sums, both types, no prior-cycle comparison.
- **Project Status / Type of Investment / Category charts**: group projects by `status_progress` / `type_of_investment` / `category` (blank → `"Unspecified"`), for each group return `{ label, value: count, budget: sum-of-cash-for-that-year-in-millions }`. The membership query (which projects count toward a group) and the budget sum **must use the same `type = 'cash'` filter** — a past bug filtered membership without the type constraint, so a project with only cost/commitment data (and $0 cash) still inflated a group's project count while contributing nothing to its budget sum.
- **Budget by Owner Area**: same shape, grouped by `owner_area`, sorted descending by budget, with a trailing `"Total"` row appended.
- **Directorate Trend**: per-owner-area, per-year cash sums across the 5-year window (for a stacked/line trend chart), excluding projects with `status_progress = 'CAP'`.
- All monetary chart values are in **millions** (raw amount ÷ 1,000,000, rounded to 2 decimals) and must be emitted as **plain numbers**, not locale-formatted strings with thousands separators — a past bug used `number_format()` (producing e.g. `"1,234.56"`), which the frontend's `Number()` coercion silently turned into `NaN` the moment a value crossed 1,000 million.
- **"Latest period"** for the dashboard's default view = `MAX(start_year)` among periods that **actually have projects** (`whereHas('projects')`) — not a raw `MAX(start_year)` (which could resolve to an empty, never-used period) and not a hardcoded `currentYear + 1` calculation.

### 4.15 KPI cards (main grid detail page, `/budgets/{year}`)
Computed **client-side**, live, from whatever rows currently pass the AG Grid's active filters (excluding the pinned "Total" aggregate row, to avoid double-counting) — recomputed on every filter change, every cell edit save, and on initial grid render:
- **Total 5YP Budget {startYear}-{endYear}**: sum of `total_cash` / `total_cost` (the full-5-year-plan totals from `budget_settings`) across visible rows.
- **Total Budget {startYear}**: sum of `cash_{startYear}` / `cost_{startYear}` (just that one year) across visible rows.
- **Actual to Date**: sum of `actual_to_date` / `actual_to_date_cost`.
- **Remaining Forecast (Unused)**: sum of `budget_5yp` (cash remaining-CAR balance).
- **Number of Projects**: count of visible rows.

These live only on the **detail** page (`/budgets/{year}`), not the list page. The list page (`/budgets`) instead shows one row per budget cycle period with that period's own `total_cash`/`total_cost` (from `getDataProjectIndex()`, summed server-side across the period's `cash_cost_yearlies`) and its yearly cash/cost/commitment breakdown inline — no KPI card row.

### 4.16 Version comparison
`compareVersions(year, versionA, versionB)`: loads both versions' projects keyed by `sap_code`, computes per-project deltas (`cost_b - cost_a`, `cash_b - cash_a`, and the same per-year for the 5-year window), and a `status` per project: `added` (only in B), `removed` (only in A), `changed` (in both, but cost/cash delta ≠ 0), `unchanged` otherwise. Also returns cycle-wide totals and per-year totals for both versions. Percent deltas are `null` (not `0` or `Infinity`) when the baseline (version A) value is zero, to avoid a nonsensical "divide by zero" percentage.

`getVersionTrend(year)`: across every version of a year (oldest to newest), returns `{ version, approval_status, project_count, total_car, total_actual, total_forecast, total_budget_5yp }` — a supervisor-facing view of how the cycle's totals evolved finalize-to-finalize.

### 4.17 Role-based access control
Two roles only: `editor` (full access) and `viewer` (read-only). Enforced two ways:
- **Route middleware** `role:editor` on every mutating route (create/update/delete/import/finalize/lock/user-management/activity-log) — a `viewer` hitting any of these gets a 403 before the controller even runs.
- **Explicit in-controller checks** for cases middleware can't express: export is blocked for viewers (`$request->user()->isViewer()` → 403) even though `GET`-style in spirit, because it's a `POST` route without the `role:editor` middleware attached (export was intentionally left reachable by both roles at the route level, then gated in code) — a **quiet exception to the pattern**, not a mistake — mirror this specific carve-out deliberately in the rewrite rather than "cleaning it up" to route middleware, since editor-authored comments elsewhere note it was a deliberate late addition.
- **Frontend-only UI gating** (hide buttons, disable inputs) for `isViewer` is a UX nicety, never the actual security boundary — the backend check is authoritative and must exist independent of what the frontend hides.
- **Cannot demote/delete the last remaining editor** — `UserController` checks `User::where('role','editor')->where('id','!=',$user->id)->doesntExist()` before allowing a demote-to-viewer or delete, to guarantee at least one editor always exists (otherwise no one could ever manage users or mutate data again).
- **Cannot delete your own account** (`UserController::destroy`).

---

## 5. Real-time / broadcast events (Pusher channels)

| Event | Channel | Broadcast name | Payload | Fired when |
|---|---|---|---|---|
| `BudgetUpdated` | `budgets` (public) | `budgets.update` | `{ data: <single project's full budgets-by-year shape> }` | after any single project create/update |
| `BudgetListUpdated` | `budgetList` (public) | `budgetList.update` | `{ data: <full getDataProjectIndex() result> }` | after any import, create, update, delete, duplicate, finalize, lock, version-delete |
| `DashboardUpdated` | `dashboard` (public) | `dashboard.update` | `{ data, dataCostCash, dataCategory, dataOwner, dataDirectorateTrend, dataByType, dataByCategory, year }` | after `updateChart($year)` is called (import, create, update) |

All three are `ShouldBroadcast`/`ShouldBroadcastNow` events on **public** channels (no auth/private-channel scoping — any logged-in user's browser receives every broadcast regardless of which page/year they're viewing; the frontend is responsible for ignoring broadcasts for a year it isn't currently displaying, via an `event.year` guard on the dashboard).

**Broadcast failures must never fail the underlying request** — the DB write has already committed by the time a broadcast fires; a Pusher/network error broadcasting the update is caught and logged, never surfaced to the user as if their save/import failed (`safeBroadcast()` wrapper).

Frontend: `laravel-echo` + `pusher-js`, one `window.Echo.channel(name).listen('.event.name', handler)` per page that needs live updates (Dashboard, Budgets Index, Budgets Show).

---

## 6. Known historical bugs (do not reintroduce these in the rewrite)

These were each real production issues found and fixed during this app's development — listed so the rewrite's design avoids the same traps from the start:

1. **Duplicate `BudgetCyclePeriod` rows** for the same `(start_year, version)` from unconditional `create()` instead of `firstOrCreate()` — caused account-to-account visibility inconsistency (different users' "latest version" queries resolved to different physical rows). → Always upsert-by-natural-key for periods (§4.1).
2. **Duplicate `Projects` rows** on re-upload, same root cause, on the import upsert path. → Always upsert-by-`(sap_code, period_id)` (§4.2).
3. **Mass accidental project deletion** — a real user's import triggered the stale-project cleanup (§4.3.B step 4) against far more rows than intended, because there was no preview before the destructive step ran. → Dry-run preview mode (§4.3.B) plus the zero-processed-rows abort guard (§4.3.B step 3) are both required safety nets, not optional polish.
4. **Dry-run leaking uncommitted data** — the dashboard-update broadcast fired during a dry-run import, before the transaction rolled back, pushing about-to-be-discarded data to every connected client. → Any broadcast/side-effect triggered mid-import must check a dry-run flag first.
5. **SAP code regex excluding valid codes** — `^C[1-9]` wrongly rejected `C0...` codes; must be `^C[0-9]`.
6. **Commitment column position drift** between export and import — the two sides must agree exactly on column position/order; this was fixed by pinning commitment to the very last two columns specifically so future column insertions in the middle never affect it.
7. **NaN in dashboard charts for large numbers** — backend used `number_format()` (locale string with thousands commas) for chart values; frontend's `Number()` coercion breaks on the embedded comma past 1,000. → Emit plain numeric values from any API that feeds a chart, format only at final render time.
8. **Count/budget mismatch in "by group" dashboard charts** — the query deciding which projects count toward a group didn't filter by `type = 'cash'`, but the sum computing that group's budget did — so a project with a cost-only or commitment-only entry (and $0 cash) inflated the count without contributing to the budget total. → Membership and aggregation queries for the same chart must use identical filters.
9. **Hardcoded "Prior Cycle" dashboard reference line** — a fixed array was shown regardless of which period the user was viewing, instead of only for the one year (2025) it was actually authored for. → Check for real data first; only fall back to a hardcoded reference for the exact case with no possible real data.
10. **Dashboard defaulting to an empty/unused period** — `MAX(start_year)` alone could resolve to a period created but never populated. → Constrain "latest" to periods that have at least one project.
11. **"No query results for model" on save** — a raw framework "not found" error leaked to the user when the row they had open was replaced by a more recent import (which mints new row IDs). → Catch not-found specifically and return an actionable message ("refresh the page").
12. **Pinned/aggregate grid row treated as editable** — editing the "Total" summary row attempted to PUT to a fake/non-existent ID. → Aggregate/summary rows must be explicitly non-editable, never rely on "no matching ID" failing safely.
13. **Money-column sort treated as string sort** — decimal DB columns serialize to JSON as strings; without an explicit numeric comparator, grid columns sorted lexicographically ("100" before "20"). → Any grid/table column backed by a decimal value needs an explicit numeric comparator, never rely on the default string comparator.

---

## 7. Full API surface (routes)

All routes require `auth` middleware (session cookie) unless noted. Routes are Inertia page renders unless marked "(JSON)".

| Method | Path | Controller@method | Role | Purpose |
|---|---|---|---|---|
| GET | `/` | closure → `Auth/Login` | guest | Login page (also gate for register) |
| GET | `/dashboard` | `HomeController@index` | auth+verified | Dashboard page |
| GET | `/getDashboardByVersion` (JSON) | `HomeController@getDashboardByVersion` | auth+verified | Re-fetch dashboard data for a different period/version |
| GET | `/budgets` | `ProjectsController@index` | any | Budget cycles list page |
| GET | `/budgets/{year}` | `ProjectsController@show` | any | Main grid detail page (latest version) |
| GET | `/budgets/{year}/compare` | `ProjectsController@compare` | any | Version comparison page |
| GET | `/budgets/{year}/my-forecast` | `ProjectsController@myForecast` | any | Simplified per-PM forecast page |
| GET | `/budgets/{id}/history` (JSON) | `ProjectsController@history` | any | One project's change-log entries |
| GET | `/budgets-compare/{year}` (JSON) | `ProjectsController@compareData` | any | AJAX refresh for the compare page |
| POST | `/budgets/upload` (JSON) | `ProjectsController@upload` | editor | Create new cycle from Excel |
| POST | `/export/budgets` (file download) | `ProjectsController@export` | any (viewer blocked in-code) | Export cycle to .xlsx |
| POST | `/budgets/import-project` (JSON) | `ProjectsController@uploadProject` | editor | Re-import Excel into existing version (full sync) |
| POST | `/budgets/create` (JSON) | `ProjectsController@create` | editor | Add one blank project row |
| PUT | `/budgets/{id}` (JSON) | `ProjectsController@update` | editor | Save edits to one project |
| PUT | `/budgets-finalize/{year}/{version}` (JSON) | `ProjectsController@finalize` | editor | Finalize → duplicate to next version |
| PUT | `/budgets-lock/{year}/{version}` (JSON) | `ProjectsController@lock` | editor | Lock a version (terminal) |
| GET | `/budgets-version/{year}/{version}` (JSON) | `ProjectsController@getBudgetByYearAndVersion` | any | Load a specific version's data |
| GET | `/budgets-versions/{year}` (JSON) | `ProjectsController@getVersionList` | any | List version numbers for a year |
| GET | `/budgets-trend/{year}` (JSON) | `ProjectsController@versionTrend` | any | Version-over-version trend series |
| DELETE | `/budgets-version/{year}/{version}` (JSON) | `ProjectsController@deleteVersion` | editor | Delete a whole version |
| POST | `/budgets/` (JSON) | `ProjectsController@store` | editor | Create one project (form path, not import) |
| DELETE | `/budgets` (JSON) | `ProjectsController@destroy` | editor | Bulk-delete projects by id array |
| POST | `/budgets/duplicate` (JSON) | `ProjectsController@duplicate` | editor | Duplicate one or more projects |
| GET | `/users` | `UserController@index` | editor | User management page |
| POST | `/users` | `UserController@store` | editor | Create user |
| PATCH | `/users/{user}` | `UserController@update` | editor | Update user (name/email/role) |
| DELETE | `/users/{user}` | `UserController@destroy` | editor | Delete user |
| GET | `/activity-logs` | `ActivityLogController@index` | editor | Activity log page (filters: user, action, date range) |
| GET/PATCH/DELETE | `/profile` | `ProfileController` | auth | Own-account profile management (standard Breeze) |
| — | `/register`, `/login`, `/forgot-password`, `/reset-password/{token}`, `/verify-email`, `/confirm-password`, `/logout`, `/password` | Breeze auth controllers | guest/auth | Standard auth flows — reproduce with whatever ASP.NET Identity/auth mechanism the rewrite uses; no custom business logic here beyond the `role` field defaulting to `editor` on registration (see `add_role_to_users_table` migration default) |

---

## 8. Pages / Screens (behavior summary)

### 8.1 Dashboard (`/dashboard`)
- Defaults to the most recent budget cycle period that actually has projects (§4.14).
- **Period** selector (every distinct `start_year` with projects) and **Version** selector (every version for the selected year) — switching either re-fetches all chart data via `GET /getDashboardByVersion` without a full page reload; a full-content loading overlay (dimmed backdrop + spinner, both selects disabled) covers the charts while the fetch is in flight.
- Charts: 5YP Plan vs Prior Cycle (bar), Cost vs Cash (bar), Project Status (donut/pie, toggle between project-count and cash-budget view), Budget by Type of Investment (bar chart, count/budget toggle), Budget by Category (bar chart, count/budget toggle), Budget by Owner Area (waterfall bar), Directorate Trend (stacked bar across the 5-year window).
- Every chart subtitle explicitly states its unit and whether it's cash/cost/count (e.g. "Cash budget by category · in million") — don't let a chart imply a currency figure without saying which currency dimension (cash vs cost) and scale (million) it is.
- Live-updates via the `dashboard` Pusher channel, but ignores a broadcast whose `year` doesn't match the currently-selected period.

### 8.2 Budgets list (`/budgets`)
- One row per budget cycle period (latest version of each `start_year`), showing: period range, cash total, cost total, approval status pill, and an inline yearly cash/cost/commitment breakdown table.
- "Upload Excel" and "Create New Budget Cycle" actions (editor only) open a modal (`UploadModal`) — pick a start year (years already in use are excluded from the dropdown) and, for Excel mode, a file.
- Click a row → navigates to `/budgets/{start_year}`.
- Live-updates via the `budgetList` channel.
- No KPI/grand-total card row on this page (that lives only on the detail page).

### 8.3 Budget detail / main grid (`/budgets/{year}`)
The core page. An AG Grid spreadsheet, one row per project, with:
- **Three tabs**: "Budget 5 Years" (Tab1 — full 5-year cost/cost-remaining/cash/cash-remaining columns + totals, commitment columns), "Year To Date" (Tab2 — near-term years broken into monthly columns plus "Top"/timing field, no 5-year totals), "Forecasts" (Tab3 — read-only analytics: exception list of rows needing attention, CAR-usage-by-group chart, cash flow calendar, cross-version trend chart; hidden entirely for viewers).
- KPI card row (§4.15) above the grid, live-recomputed from filtered rows.
- Excel-style multi-select column filters (`ExcelStyleFilter` — a from-scratch AG Grid Community equivalent of the Enterprise Set Filter) on every text/categorical column, including a search box within the filter dropdown.
- Numeric columns use an explicit numeric comparator for sort (not default string sort — see bug #13).
- Inline cell editing (dropdowns for status/type/category/start_year/num_of_year_budget, free text/number for the rest), auto-save on cell value change, with a save-status indicator (idle/saving/saved/error).
- Pinned "Total" aggregate row at the top, never editable (see bug #12), recalculated from `rowData` on every change.
- Row-level actions: view field-level history (opens a side panel backed by `GET /budgets/{id}/history`), delete.
- Multi-row selection → bulk delete, bulk duplicate.
- Column visibility panel (show/hide columns), persisted to `localStorage`.
- Grid filter model persisted to `localStorage` per year.
- Period/Version selector in the header, "LIVE VERSION"/"Final & Approved"/"Version N Draft" status badge, Finalize/Lock/Delete-version actions (editor only, each respects the locking rules in §4.10–4.11), Import/Export actions.
- Import flow: pick file → preview (dry-run, shows "N updated, N deleted" with example titles) → confirm → real import; all wrapped in loading states and SweetAlert2 confirm dialogs for destructive steps.
- Editability is fully gated by `isLocked` (§4.10) and `isViewer` — locked/viewer state disables cell editing, hides mutating buttons.
- Live-updates via both `budgets` (per-row patch) and `budgetList` channels.

### 8.4 Compare versions (`/budgets/{year}/compare`)
- Two version selectors (Version A / Version B), defaulting to the two most recent versions.
- Summary stat cards (cost/cash totals per version, % delta).
- Bar chart of yearly totals, both versions overlaid.
- Project-level variance table: SAP code, title, status pill (`added`/`removed`/`changed`/`unchanged`), cost Δ, cash Δ — sorted by biggest absolute change first; unchanged rows hidden by default with a toggle to reveal them.
- Switching either version dropdown re-fetches via `GET /budgets-compare/{year}` without a full reload.

### 8.5 My Forecast (`/budgets/{year}/my-forecast`)
- A thinner, simplified view over the **same data source** as the main grid (`getBudgetsByYear`) — always reflects the latest version, intentionally cannot drift out of sync with the main grid's numbers.
- One row per project: SAP code, title, PM, CAR, actual-to-date (read-only), editable forecast cost/cash, editable start-year/num-of-years, computed remaining CAR (red if negative).
- Search (title/SAP code) and PM filter.
- Editing any of the driving fields triggers the same annual+monthly auto-distribution as the main grid (§4.7) and auto-saves via `PUT /budgets/{id}`.
- Disabled entirely (read-only) if the version is `final` or the user is a viewer.

### 8.6 Users (`/users`, editor only)
- Table of all users (name, email, role), add/edit via modal form, delete with confirmation.
- Cannot delete/demote the last editor, cannot delete your own account (backend-enforced, §4.17).

### 8.7 Activity Log (`/activity-logs`, editor only)
- Paginated (50/page), filterable by user, action, and date range (from/to).
- Rows grouped visually under day-headers ("Wednesday, 12 August 2026 · 3 activities") — grouping is a **frontend-only** presentation concern over the already-paginated, already-day-ordered result set (not a separate aggregate query) — each row still shows full time/user/action/description/property-diff detail.
- Each row shows: timestamp, user, action (icon + label), description, and (if present) a field-level old→new diff list from `properties`.

---

## 9. Suggested `.NET` architecture mapping (guidance, not prescriptive)

This section is intentionally light — the point of this document is the *behavior* to reproduce, not to force a specific .NET shape. A reasonable mapping:

- **Domain model** → EF Core entities mirroring §2/§3 exactly (add the real unique constraints §3 calls out that the original app only enforced in code).
- **`ProjectsService`/`HomeController` business logic** → an application service layer (e.g. `IProjectsService`, `IDashboardService`) — keep the aggregation formulas (§4.14) and locking rules (§4.10) as pure, independently-testable methods given the bug history in §6.
- **Import/export** → ClosedXML or EPPlus for the Excel side; strongly consider switching from positional to header-based column mapping (§4.13) if you're not required to byte-match the existing template.
- **Real-time** → SignalR hubs replacing the three Pusher channels (§5) 1:1; keep the "never let a broadcast failure fail the request" rule and the "never broadcast mid-rollback" rule (bug #4).
- **Auth/roles** → ASP.NET Core Identity with a two-value role claim (`editor`/`viewer`), policy-based authorization mirroring the route table in §7, plus the same in-code carve-outs (export's viewer check, last-editor guard) that don't cleanly fit a declarative policy.
- **Frontend**: if keeping React (e.g. under Blazor's static hosting or a separate SPA calling a .NET Web API), AG Grid/Chart.js/Inertia-equivalent patterns can mostly carry over conceptually; if moving to Blazor, the main grid (§8.3) is by far the highest-complexity single piece — budget disproportionate time for it.
- **Background/queue**: nothing in the current app relies on a queue (imports run synchronously in the request) — fine to keep synchronous in the rewrite unless import file sizes grow enough to need it.

---

*Generated from a full read of the live database schema, every backend controller/service/model/migration, and every frontend page plus the shared grid/chart/filter components, in the original Laravel + React codebase at `d:\project\budget-cycles` (branch `feature/new-version`).*
