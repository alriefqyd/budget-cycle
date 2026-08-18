# Budget Cycles — .NET Rewrite Design Document

**Companion to** [`MIGRATION_BLUEPRINT.md`](./MIGRATION_BLUEPRINT.md), which is the technology-agnostic behavior spec (schema, business rules, API surface, known bugs). This document makes the concrete .NET architecture decisions and shows how each part of the blueprint maps onto them. Read the blueprint first — this doc does not repeat business-rule detail that's already fully specified there; it references section numbers (`§x.y`) instead.

**Decisions locked in for this design:**
- **Frontend**: keep React 18 + AG Grid + Chart.js as a separate SPA, calling an ASP.NET Core Web API over REST/JSON. Not Blazor.
- **Database**: move from MySQL to **SQL Server**, via EF Core + `Microsoft.EntityFrameworkCore.SqlServer`. Requires a one-time data migration (§10).

---

## 1. Solution structure

Clean/onion architecture, one solution, five projects. Keeps business logic (the part with 17 subsections of rules and a 13-item bug list behind it) independently testable and free of ASP.NET or EF concerns.

```
BudgetCycles.sln
├── src/
│   ├── BudgetCycles.Domain/            # Entities, enums, value objects. No dependencies.
│   ├── BudgetCycles.Application/       # Services, DTOs, interfaces (IProjectsService, IDashboardService...).
│   │                                    # Depends only on Domain. This is where §4's rules live as testable code.
│   ├── BudgetCycles.Infrastructure/     # EF Core DbContext, repositories, SignalR hub implementations,
│   │                                    # ClosedXML import/export, Identity setup. Depends on Application+Domain.
│   ├── BudgetCycles.Api/               # ASP.NET Core Web API host: controllers, middleware, DI wiring,
│   │                                    # Program.cs. Depends on Infrastructure+Application.
│   └── BudgetCycles.Web/               # React SPA (Vite). Built assets served as static files by Api,
│                                        # or hosted separately behind a reverse proxy — see §8.
└── tests/
    ├── BudgetCycles.Application.Tests/ # Unit tests for business rules — one test class per bug in §6 (Blueprint).
    └── BudgetCycles.Api.Tests/         # Integration tests (WebApplicationFactory) for controller/HTTP contract.
```

**Why Application is separate from Infrastructure**: nearly every historical bug in Blueprint §6 was a business-rule bug (wrong upsert semantics, missing filter, wrong regex), not a framework bug. Putting those rules in a project with zero EF/HTTP dependencies means they can be unit-tested with in-memory fakes and reviewed without wading through controller plumbing.

---

## 2. Domain model (EF Core entities)

Mirrors Blueprint §2 exactly, with SQL Server type choices and the natural-key **unique constraints** the blueprint explicitly calls out as missing (§3) — these are the single highest-value fix versus the original schema, since 3 of the 13 known bugs (Blueprint §6, items 1–2) trace directly to their absence.

| Table (Blueprint §2) | SQL Server type notes |
|---|---|
| `Users` | Use ASP.NET Core Identity's `IdentityUser<int>` (or `Guid`) as base, add `Role` as a plain `nvarchar` column (not `IdentityRole` — the app only ever has two fixed roles, a full role-management system is unneeded complexity). |
| `BudgetCyclePeriods` | `StartYear`/`EndYear` → `int`, not string (no reason to carry the legacy string typing forward). `ApprovalStatus` → `nvarchar(20)`, backed by a C# enum (`ApprovalStatus.Approved/OnGoing/Submission/Final`) via an EF Core value converter. **Drop `total_cast`** — it's dead, per Blueprint §2. Add `UNIQUE (StartYear, Version)`. |
| `Projects` | Add `UNIQUE (SapCode, BudgetCyclePeriodId)` (nullable `SapCode` means SQL Server's default unique-index behavior — which treats multiple `NULL`s as distinct — is actually what's wanted here; confirm this is desired, don't accidentally use a filtered index that changes that). FK to `BudgetCyclePeriods` stays `ON DELETE NO ACTION` (originally unspecified/RESTRICT) — deleting a period must go through `DeleteVersion` (Blueprint §4.11), which explicitly cascades through children in the right order; letting a raw FK cascade would bypass the activity-log/count-before-delete logic. |
| `BudgetSettings` | 1:1 with `Projects`, `ON DELETE CASCADE`. `NumOfYearBudget` → `int` (was `varchar` — no reason to keep as string). All money fields → `decimal(18,2)`. |
| `CashCostYearlies` | `Type` → C# enum (`Cash/Cost/Commitment`) via value converter, stored as `nvarchar(20)` (SQL Server doesn't have a native `ENUM`, unlike MySQL). `Year` → `int` (SQL Server has no `YEAR` type — MySQL's was a legacy artifact anyway). Add `UNIQUE (ProjectId, Type, Year)`. |
| `CashCostMonthlies` | `ON DELETE CASCADE` from `CashCostYearlies`. `Month` → `tinyint` with a `CHECK (Month BETWEEN 1 AND 12)`. Add `UNIQUE (YearlyId, Month, Type)`. Consider dropping the redundant `Type` copy and reading it via `.Yearly.Type` — it was likely denormalized in MySQL for query performance; re-evaluate under SQL Server's join performance, or keep it if the import/read paths are hot enough to justify it. Don't remove it silently if unsure — flag it as a call for whoever validates performance. |
| `ActivityLogs` | **`Properties` → native SQL Server `nvarchar(max)` with a JSON check constraint (`ISJSON(Properties) = 1`), or `nvarchar(max)` mapped via `.HasConversion()` to/from a C# dictionary with `System.Text.Json`.** The MySQL `TEXT`-not-`JSON` workaround (Blueprint §2, `ROW_FORMAT` issue) is MySQL-specific and doesn't apply to SQL Server — use a real JSON-capable column and SQL Server's native `JSON_VALUE`/`OPENJSON` if any query ever needs to filter by a property (none currently do, per the blueprint, so a plain converted column is enough). `UserId` FK `ON DELETE SET NULL`. Index on `(SubjectType, SubjectId)` and `CreatedAt`. |
| `ProjectChangeLogs` | `ON DELETE CASCADE` from `Projects`, `ON DELETE SET NULL` from `Users`. Index on `(ProjectId, CreatedAt)`. |
| `VersionLogs` | **Omit entirely** — Blueprint §2 confirms it's unused dead weight in the current app (table exists, no model, never read/written). Don't carry it forward. |
| Breeze scaffolding (`password_reset_tokens`, `sessions`, `cache`, `jobs`) | Replaced by ASP.NET Core Identity's own tables (`AspNetUsers`, etc.) plus whatever session/cache mechanism is chosen (see §7) — not hand-modeled. |

```csharp
// Example: the single highest-value schema fix, illustrated
modelBuilder.Entity<BudgetCyclePeriod>()
    .HasIndex(p => new { p.StartYear, p.Version })
    .IsUnique();

modelBuilder.Entity<Project>()
    .HasIndex(p => new { p.SapCode, p.BudgetCyclePeriodId })
    .IsUnique();

modelBuilder.Entity<CashCostYearly>()
    .HasIndex(y => new { y.ProjectId, y.Type, y.Year })
    .IsUnique();

modelBuilder.Entity<CashCostMonthly>()
    .HasIndex(m => new { m.YearlyId, m.Month, m.Type })
    .IsUnique();
```

Even with these DB-level constraints in place, **keep the application-level upsert logic** (§4 below) — the constraints are a backstop against a future code path reintroducing Blueprint §6 bugs #1/#2, not a replacement for `firstOrCreate`/`firstOrNew`-equivalent code, since a raw `INSERT` that violates the constraint throws a 500, not a graceful upsert.

---

## 3. Application layer — services

One service per bounded concern, matching the controllers in Blueprint §7. Each method below is where a specific blueprint rule becomes testable C#.

| Service | Owns (Blueprint §) | Key methods |
|---|---|---|
| `IBudgetPeriodService` | §4.1, §4.10, §4.11 | `GetOrCreatePeriodAsync` (the `firstOrCreate` equivalent — **only apply `defaults` on actual insert**, verified by a unit test asserting an existing row's status is untouched), `IsLockedAsync`, `FinalizeAsync`, `LockAsync`, `DeleteVersionAsync` |
| `IProjectsService` | §4.2, §4.5, §4.7, §4.8 | `UpsertFromImportRowAsync` (the `firstOrNew` equivalent), `UpdateAsync` (field diff → change log, §4.8), `RecalculateCarBalance` (§4.5, pure function — no I/O, trivially unit-testable), `RedistributeBudget` (§4.7, also pure) |
| `IImportExportService` | §4.3, §4.4, §4.12, §4.13 | `ImportNewCycleAsync` (upload), `ReSyncVersionAsync` (import-project, with `dryRun: bool` threaded through — **never branch dry-run behavior by checking `Transaction.IsCompleted` after the fact; pass the flag explicitly into anything that broadcasts**, per Blueprint §6 bug #4), `ExportAsync` |
| `IActivityLogService` | §4.9 | Single `RecordAsync(action, subject, description, properties, userId)` — enforce "always call through one path" (Blueprint §4.9) by making the `DbContext`-level insert `internal`, only reachable through this service |
| `IDashboardService` | §4.14 | `GetDashboardAsync(year, version)`, plus one private aggregation method per chart — each takes an explicit `CashCostType` filter parameter so membership-query/aggregation-query drift (Blueprint §6 bug #8) is structurally harder to reintroduce (both queries pull the filter from the same parameter, not two independently-typed literals) |
| `IVersionComparisonService` | §4.16 | `CompareAsync(year, versionA, versionB)`, `GetTrendAsync(year)` — percent-delta helper returns `decimal?`, never `0` or throws on divide-by-zero (Blueprint §4.16) |
| `IUserManagementService` | §4.17 | `UpdateRoleAsync`/`DeleteAsync` both call a shared `EnsureNotLastEditorAsync` guard first |

**Locking check as a single source of truth**: implement `IsLockedAsync(periodId)` once in `IBudgetPeriodService` and have *every* mutating path (update, bulk delete, import, finalize, lock) call it — Blueprint §4.10 lists five different operations that each need to independently re-check lock state; a shared method (not five copy-pasted `WHERE` clauses) is what keeps them consistent if the rule ever changes.

---

## 4. API surface

Direct 1:1 mapping of Blueprint §7's route table to ASP.NET Core controllers. Inertia's page-render routes don't have a .NET equivalent (React SPA + client-side routing replaces them) — only the *data* routes need a server endpoint. The "page" routes become pure React Router routes that call the JSON endpoints below on mount.

| Blueprint route | Controller/action |
|---|---|
| `GET /budgets` (data) | `BudgetPeriodsController.List()` |
| `GET /budgets/{year}` (data) | `BudgetPeriodsController.GetLatest(year)` |
| `GET /budgets/{id}/history` | `ProjectsController.GetHistory(id)` |
| `GET /budgets-compare/{year}` | `VersionComparisonController.Compare(year, versionA, versionB)` |
| `POST /budgets/upload` | `ImportExportController.UploadNewCycle()` — `[Authorize(Roles = "editor")]` |
| `POST /export/budgets` | `ImportExportController.Export()` — `[Authorize]` + explicit in-code viewer check (Blueprint §4.17 carve-out, preserved deliberately, see §6 below) |
| `POST /budgets/import-project` | `ImportExportController.ReSyncVersion()` — `[Authorize(Roles = "editor")]` |
| `POST /budgets/create`, `PUT /budgets/{id}`, `DELETE /budgets`, `POST /budgets/duplicate` | `ProjectsController` |
| `PUT /budgets-finalize/{year}/{version}`, `PUT /budgets-lock/{year}/{version}`, `DELETE /budgets-version/{year}/{version}` | `BudgetPeriodsController` |
| `GET /budgets-version(s)/{year}...`, `GET /budgets-trend/{year}` | `BudgetPeriodsController` |
| `GET /getDashboardByVersion` | `DashboardController.GetByVersion(year, version)` |
| `/users*` | `UsersController` — `[Authorize(Roles = "editor")]` |
| `/activity-logs` | `ActivityLogsController` — `[Authorize(Roles = "editor")]` |

**HTTP status codes to preserve exactly** (the frontend keys off these):
- `423 Locked` — locked version/project mutation attempt (Blueprint §4.10, §4.3.B step 1).
- `422 Unprocessable Entity` — zero valid rows in an import (Blueprint §4.3.A, §4.3.B step 3).
- `404 Not Found` with a friendly message, not a raw EF `InvalidOperationException` — project replaced by a newer import (Blueprint §4.8 step 8, bug #11). Implement as a global exception filter mapping a custom `ProjectNotFoundException` → 404 with `{ message: "This project was replaced by a more recent import. Please refresh the page." }`.
- `403 Forbidden` — role-based rejection (`[Authorize(Roles=...)]` for most; explicit check for the export carve-out).

---

## 5. Business-rule preservation notes (.NET-specific implementation guidance)

These are the places where a naive EF Core implementation would *accidentally* diverge from Blueprint §4's exact behavior. Called out because "just use EF Core idiomatically" isn't enough — the blueprint's rules were hard-won from real bugs.

- **§4.1 `firstOrCreate` equivalent**: EF Core has no built-in `FirstOrCreate`. Implement explicitly:
  ```csharp
  var period = await _db.BudgetCyclePeriods
      .FirstOrDefaultAsync(p => p.StartYear == startYear && p.Version == 0);
  if (period is null) {
      period = new BudgetCyclePeriod { StartYear = startYear, Version = 0,
          ApprovalStatus = approvalStatus, EndYear = startYear + 4, TotalCost = 0 };
      _db.Add(period);
      await _db.SaveChangesAsync();
  }
  // period.ApprovalStatus is NEVER reassigned here if it already existed — this is the whole bug fix.
  ```
  Wrap the `SELECT` + conditional `INSERT` in a `SERIALIZABLE`-isolation transaction or rely on the unique index (§2) plus a retry-on-`DbUpdateException` pattern if concurrent creation is plausible (two editors racing to create the same year) — the unique constraint is the real safety net; the `FirstOrDefault` check is for the common case.

- **§4.2 `firstOrNew` equivalent**: same pattern, but always `SaveChanges` regardless of insert-vs-update branch (both write). Unit test this by asserting: importing the same SAP code twice into the same period never grows the row count.

- **§4.3.B dry-run + broadcast suppression (bug #4)**: thread a `bool isDryRun` parameter from the controller all the way into `IImportExportService.ReSyncVersionAsync`, and into any place that would call `IHubContext<...>.Clients.All.SendAsync(...)`. Structure it so broadcasting is physically impossible to reach without the flag being checked — e.g. have the transactional method return a result object and do all broadcasting in the *caller*, only `if (!isDryRun && result.Committed)`. Don't rely on "the transaction rolled back so it's fine" reasoning — a `TransactionScope`/EF transaction rollback does **not** undo a SignalR message already sent mid-transaction, which is exactly how this bug happened originally.

- **§4.4 SAP code regex**: `^C[0-9]` — write this as a named constant with a comment citing the historical `^C[1-9]` bug, so nobody "fixes" it back to excluding `C0` codes.

- **§4.7 auto-distribution**: implement as a pure function `(decimal remaining, int years, int startYear, int gridStartYear, int gridEndYear) => Dictionary<int, decimal>` with zero DB access — trivial to unit test against the blueprint's exact formula, including the `year < start_year + years` boundary and the `yearlyBudget = startYear + 2` monthly-breakdown cutoff. Keep this **one shared function** called from both the main grid's update path and "My Forecast" — Blueprint §4.7 explicitly warns these two call sites must stay in sync.

- **§4.8 change tracking**: implement the pre/post diff as a generic helper operating over reflection or an explicit field-name allowlist (excluding `Id/CreatedAt/UpdatedAt/ProjectId/BudgetCyclePeriodId`) so it can't silently start logging a newly-added internal field. Diff yearly cash/cost/commitment fields that were actually present in the request DTO — not all of them — matching "for every request key matching the regex" semantics (Blueprint §4.8 step 3), not "for every field in the DB".

- **§4.12/§4.13 Excel column order**: define the export column order and import column mapping as two arrays of named constants in a single shared file (e.g. `ExcelColumnMap.cs`) that both `ExportService` and `ImportService` reference — this is the direct fix for Blueprint §6 bug #6 (position drift between export and import). If ClosedXML header-based mapping is adopted instead of positional (recommended by Blueprint §9 if not constrained to match the legacy template byte-for-byte), this whole class of bug disappears; positional mapping should only be kept if the existing `.xlsx` template must be byte-compatible with what's already circulating among users.

- **§4.14 dashboard filters**: every "by group" aggregation (status/type/category/owner-area) must build its membership `Where()` and its budget `Sum()` off the **same** `IQueryable` filtered by `Type == CashCostType.Cash` before branching into count vs. sum — structure as one query returning `(string Group, int Count, decimal BudgetMillions)` in a single `GroupBy`, not two separate queries, to make bug #8 structurally impossible rather than just tested-against.

- **§4.14 chart JSON**: return `decimal`/`double` directly from Web API DTOs — `System.Text.Json` serializes numbers as JSON numbers by default (not locale strings), so bug #7 (`number_format()` producing `"1,234.56"`) has no direct .NET equivalent *unless* someone adds a `[JsonConverter(typeof(...))]` that stringifies for display — don't do that in any DTO consumed by a chart.

---

## 6. Real-time (SignalR)

Direct 1:1 replacement of the three Pusher channels (Blueprint §5):

| Pusher channel/event | SignalR hub / method |
|---|---|
| `budgets` / `budgets.update` | `BudgetsHub.BudgetUpdated(ProjectDto)` |
| `budgetList` / `budgetList.update` | `BudgetsHub.BudgetListUpdated(BudgetListDto)` |
| `dashboard` / `dashboard.update` | `DashboardHub.DashboardUpdated(DashboardDto)` (payload includes `Year` — frontend still does the client-side "ignore if not my year" guard, Blueprint §5) |

- No private/group channels needed (all three were public in the original app) — but consider using `IHubContext<T>.Clients.All` deliberately, not per-user groups, to preserve the existing "every connected browser gets every broadcast" semantics exactly (don't silently scope it tighter as a "security improvement" without discussing it — it'd be a behavior change).
- **`safeBroadcast()` equivalent**: wrap every `Clients.All.SendAsync(...)` call in a try/catch that logs and swallows — a SignalR send failure must never fail the underlying HTTP request, matching Blueprint §5's explicit requirement.
- React side: `@microsoft/signalr` client replacing `laravel-echo`/`pusher-js`, one `HubConnection` per hub, started on the pages that need it (Dashboard, Budgets Index, Budgets Show) — same page-scoped subscription pattern as today.

---

## 7. Auth & RBAC

- **ASP.NET Core Identity**, cookie authentication (matches the existing session-cookie model — no reason to switch to JWT/bearer tokens for a same-origin SPA+API pair, and cookie auth avoids XSS-exposed token storage in the SPA).
- Two roles only, `editor` and `viewer`, seeded once — do **not** build a general-purpose role-management system; Blueprint §4.17 is explicit that this is a fixed two-value set.
- Route-level: `[Authorize(Roles = "editor")]` on every mutating controller action, matching Blueprint §7's role column.
- **Preserve the export carve-out deliberately** (Blueprint §4.17): `POST /export/budgets` stays reachable by both roles at the `[Authorize]` level (no `Roles = "editor"` attribute), with an explicit `if (User.IsInRole("viewer")) return Forbid();` inside the action. The blueprint calls this out by name as intentional, not an oversight — don't "clean it up" to a policy attribute during the port.
- **Last-editor guard**: `IUserManagementService.EnsureNotLastEditorAsync(excludingUserId)` called before any demote-to-viewer or delete, mirroring `UserController`'s check exactly (Blueprint §4.17).
- Self-delete guard: block `DELETE /users/{id}` when `id == currentUserId`.
- Registration (if kept) defaults new users to `editor`, matching the original migration default (Blueprint §7 footnote) — confirm with the user whether self-registration should even exist in the .NET version, or whether user creation should be editor-only (`POST /users`) from day one; the blueprint documents the *current* behavior but doesn't say it's desired going forward.

---

## 8. Frontend integration (React SPA kept)

- **Build**: Vite (replaces Laravel Mix/Vite-via-Inertia). Output static assets served either (a) from `wwwroot` by the same ASP.NET Core host (simplest — one deployable, matches the current single-Laravel-app deployment shape), or (b) from a separate static host/CDN with the API behind CORS — pick (a) unless there's a specific reason to split, since it avoids CORS/cookie-`SameSite` complications entirely.
- **Routing**: Inertia's server-driven page resolution is replaced by React Router. Each current Inertia page component (Blueprint §8.1–§8.7) becomes a React Router route that fetches its data via `fetch`/`axios` from the corresponding JSON endpoint (§4 above) on mount, instead of receiving props via an Inertia response.
- **AG Grid, Chart.js, Tailwind, SweetAlert2**: all framework-agnostic to the backend — carry over essentially unchanged. The custom `ExcelStyleFilter` (Blueprint §8.3) and the numeric-comparator fix (bug #13) are pure frontend code with zero backend dependency; port as-is.
- **Auth**: cookie-based session via `credentials: 'include'` on fetch calls (or an axios instance with `withCredentials: true`); a 401 response triggers a redirect to `/login` client-side (no more server-driven Inertia redirect).
- **CSRF**: ASP.NET Core's antiforgery token system (double-submit cookie) replaces Laravel's `X-CSRF-TOKEN` — SPA reads the antiforgery cookie and echoes it as a header on mutating requests; wire this once in a shared `apiClient.ts`, not per-call.

---

## 9. Cross-cutting concerns

- **Validation**: FluentValidation (or Data Annotations) at the DTO level for shape/type checks (required fields, string lengths); business-rule validation (SAP regex, locking) stays in the Application layer per §3–§5, not duplicated in validators.
- **Global exception handling**: middleware mapping `ProjectNotFoundException → 404`, `VersionLockedException → 423`, `NoValidRowsImportedException → 422`, `FluentValidation.ValidationException → 400`, everything else → `500` with a generic message (never leak stack traces to the client).
- **Logging**: `ILogger<T>` throughout; broadcast failures (§6) logged at `Warning`, not `Error` (they're expected-and-handled, not a system fault).
- **Transactions**: `DbContext.Database.BeginTransactionAsync()` explicitly around every multi-step write documented in Blueprint §4 as transactional (import re-sync §4.3.B, finalize's duplicate-cascade §4.11, delete-version's cascade §4.11) — don't rely on EF's implicit per-`SaveChanges` transaction when multiple `SaveChanges` calls or raw SQL are involved in one logical operation.

---

## 10. Data migration (MySQL → SQL Server)

One-time cutover, not an ongoing dual-write:

1. Schema-only EF Core migration first (`dotnet ef migrations add InitialCreate`), reviewed against §2 above (types, constraints) before touching data.
2. Data move via a scripted export/import (e.g. a small console app or SSMA — SQL Server Migration Assistant for MySQL) rather than hand-written `INSERT`s — table count and volume here are small enough (per Blueprint, no queueing/background-job infra exists today, implying modest data scale) that a straightforward bulk-copy is sufficient.
3. **Backfill the new unique constraints (§2) before applying them** — run detection queries for existing duplicate `(start_year, version)` / `(sap_code, period_id)` / etc. rows first (Blueprint §6 bugs #1–#2 mean duplicates may actually exist in the live MySQL data from before those bugs were fixed); resolve or flag any found before the constraint can be added, or the migration will fail outright.
4. Recompute nothing during migration — copy `budget_5yp`/`budget_5yp_cost`/totals as stored, don't re-derive them from the formulas (Blueprint §4.5) during the move; that's a correctness cross-check to run *after* migration (compare stored vs. recomputed as a validation pass), not a transformation to apply *during* it.
5. Cut over in a single maintenance window (freeze writes on the old app, migrate, validate row counts + spot-check a handful of projects' full cash/cost/commitment figures, switch DNS/traffic) — given real-time broadcast and no queue/background jobs, there's no in-flight async work to drain first.

---

## 11. Testing strategy

Directly targeted at the 13 known bugs (Blueprint §6) and the 5 uniqueness rules (Blueprint §3) — each should exist as an explicit regression test, not just be "covered incidentally":

- `Application.Tests`: one test per Blueprint §6 bug, phrased as the failure it used to be (e.g. `GetOrCreatePeriod_ExistingPeriod_DoesNotOverwriteApprovalStatus`, `ReSync_DryRun_DoesNotBroadcast`, `SapCodeRegex_AcceptsC0Prefix`, `DashboardGroupAggregation_MembershipAndSumUseSameCashFilter`).
- `Application.Tests`: pure-function tests for §4.5 (CAR balance), §4.7 (distribution, including the monthly-breakdown year cutoff), §4.16 (percent-delta null-on-zero).
- `Api.Tests`: HTTP-contract tests asserting exact status codes (423/422/404/403) for each locking/validation scenario in §4 above.
- Manual/exploratory: the full grid UI (Blueprint §8.3) — AG Grid interaction, inline editing, filters, and real-time updates are the highest-complexity, hardest-to-unit-test surface (per Blueprint §9's own callout) and need hands-on verification against the golden path plus the specific edge cases the bug list implies (concurrent edit + import, dry-run preview accuracy, locked-version UI gating).

---

*Companion design document for the .NET rewrite of `d:\project\budget-cycles`, written against [`MIGRATION_BLUEPRINT.md`](./MIGRATION_BLUEPRINT.md). Update this file if architecture decisions in §0 change (e.g. if SQL Server is later reconsidered, or the React frontend is later replaced).*
