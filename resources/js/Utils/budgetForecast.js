// Shared forecast math used by both the main /budgets/{year} grid (Show.jsx)
// and the simplified per-PM forecast view (MyForecast.jsx), so the two stay
// in sync instead of drifting apart with duplicated logic.

const toNumber = (value) => {
    if (value === null || value === undefined || value === '') return 0;
    return typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, '')) || 0;
};

export const toNum = toNumber;

export const formatCompact = (value) => {
    const num = toNumber(value);
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// CAR (Capital Appropriation Request) is the immutable approved baseline for
// a project. "Used" = what's already been spent (actual_to_date) plus what's
// now forecast to be spent (forecast_cash) — i.e. budget_car - budget_5yp.
// Going over 100% means the current forecast would exceed the approved CAR.
export function getCarVariance(data) {
    const budgetCar = toNumber(data.budget_car);
    const actual = toNumber(data.actual_to_date);
    const forecast = toNumber(data.forecast_cash);
    const used = actual + forecast;
    if (budgetCar <= 0) return { status: 'none', pct: null, label: 'No CAR', used, budgetCar };
    const usedPct = (used / budgetCar) * 100;
    if (usedPct > 100) return { status: 'over', pct: usedPct, label: `Over CAR ${usedPct.toFixed(0)}%`, used, budgetCar };
    if (usedPct >= 90) return { status: 'near', pct: usedPct, label: `Near Limit ${usedPct.toFixed(0)}%`, used, budgetCar };
    return { status: 'within', pct: usedPct, label: `${usedPct.toFixed(0)}%`, used, budgetCar };
}

// Flags when the years actually keyed into cash_YYYY drift from what the
// budget_5yp auto-distribution would produce — e.g. a PM hand-edited one
// year's cell after the even split ran. Small rounding gaps are ignored.
export function getDistributionMismatch(data) {
    const years = parseInt(data.num_of_year_budget) || 0;
    const startYear = parseInt(data.start_year) || 0;
    if (!years || !startYear) return false;
    let sum = 0;
    for (let year = startYear; year < startYear + years; year++) {
        sum += toNumber(data[`cash_${year}`]);
    }
    return Math.abs(sum - toNumber(data.budget_5yp)) > 1;
}

// budget_5yp = remaining CAR balance not yet drawn: the approved CAR minus
// what's already been spent (actual_to_date) minus what the PM now forecasts
// spending (forecast_cost/forecast_cash). The CAR total (budget_car) itself
// never changes here — only how much of it is still "left to phase in".
export function computeBudget5YP(data) {
    const budgetCar = toNumber(data.budget_car);
    return {
        budget_5yp_cost: budgetCar - toNumber(data.actual_to_date_cost) - toNumber(data.forecast_cost),
        budget_5yp: budgetCar - toNumber(data.actual_to_date) - toNumber(data.forecast_cash),
    };
}

// Spreads the remaining CAR balance (budget_5yp/budget_5yp_cost) evenly across
// `num_of_year_budget` years starting at `start_year`, zeroing out years
// outside that window. Only touches annual cost_YYYY/cash_YYYY fields —
// month-level timing is a separate refinement done in the main grid.
export function distributeAnnualBudget(data, startYear, endYear) {
    const years = parseInt(data.num_of_year_budget) || 1;
    const budgetPerYear = toNumber(data.budget_5yp) > 0 ? toNumber(data.budget_5yp) / years : 0;
    const budgetCostPerYear = toNumber(data.budget_5yp_cost) > 0 ? toNumber(data.budget_5yp_cost) / years : 0;
    const newStartYear = parseInt(data.start_year);
    const newEndYear = newStartYear + years - 1;

    const updates = {};
    if (data.start_year !== null && data.start_year !== undefined && data.start_year > 2000) {
        for (let year = startYear; year <= endYear; year++) {
            const inRange = year >= newStartYear && year <= newEndYear;
            updates[`cash_${year}`] = inRange ? budgetPerYear : 0;
            updates[`cost_${year}`] = inRange ? budgetCostPerYear : 0;
        }
    }
    return updates;
}

// Spreads one year's cost total evenly across its 12 months, but only for
// "near-term" years (before `yearlyBudget`, i.e. years detailed enough to
// need month-level timing) that fall within the funded start_year window.
// Mirrors the existing app behavior of auto-distributing cost month-by-month
// while leaving cash timing to a separate procurement-lag step (`top`).
export function distributeMonthlyCost(data, budgetPerYear, year, yearlyBudget) {
    const inFundedWindow = year < yearlyBudget && year >= toNumber(data.start_year);
    const budgetPerMonth = inFundedWindow ? budgetPerYear / 12 : 0;

    const updates = {};
    for (let month = 1; month <= 12; month++) {
        updates[`cost_${month}_${year}`] = budgetPerMonth;
    }
    return updates;
}
