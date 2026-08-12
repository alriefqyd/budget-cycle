import React, { useEffect, useRef } from "react";
import {
    Chart,
    CategoryScale,
    LinearScale,
    BarElement,
    Tooltip,
    Legend
} from "chart.js";
import EmptyChartState from "@/Components/EmptyChartState.jsx";
import { CHART_CHROME, formatMillions } from "@/lib/chartTheme.js";

Chart.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// Plugin to draw value labels
const LABEL_HEIGHT = 14;

const valueLabelPlugin = {
    id: "valueLabel",
    afterDatasetsDraw(chart) {
        const { ctx, chartArea } = chart;

        chart.data.datasets.forEach((dataset, datasetIndex) => {
            if (dataset.label !== "Change") return; // Only draw for 'Change' dataset

            const meta = chart.getDatasetMeta(datasetIndex);
            meta.data.forEach((bar, index) => {
                const value = dataset.data[index];

                // Skip bars that are null or undefined
                if (value === null || value === undefined) return;

                // Skip drawing if it's a "base only" bar (value is 0 and label is not 'Total')
                if (value === 0 && chart.data.labels[index] !== "Total") return;

                // Clamp so labels on bars near the top of the stack never run off the canvas
                const labelY = Math.max(bar.y - 6, chartArea.top + LABEL_HEIGHT);

                ctx.save();
                ctx.fillStyle = "#000";
                ctx.font = "bold 10px sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "bottom";
                ctx.fillText(formatMillions(value), bar.x, labelY);
                ctx.restore();
            });
        });
    }
};



// Helper to create stacked bar dataset for waterfall
const createWaterfallData = (steps, colors) => {
    // Convert all values to numbers
    const numericSteps = steps.map(v => parseFloat(v));

    let base = 0;
    const bases = [];
    const values = [];

    numericSteps.forEach((step, idx) => {
        if (idx === numericSteps.length - 1) {
            // Last value ("Total") starts from 0
            bases.push(0);
            values.push(step);
        } else {
            bases.push(base);
            values.push(step);
            base += step;
        }
    });

    return [
        {
            label: "Base",
            data: bases,
            backgroundColor: "transparent",
            stack: "stack1"
        },
        {
            label: "Change",
            data: values,
            backgroundColor: colors,
            borderRadius: 4,
            borderSkipped: false,
            maxBarThickness: 48,
            stack: "stack1"
        }
    ];
};


export default function WaterfallComparison({dataChart, year}) {

    const hasData = (dataChart.budget ?? []).some(value => Number(value) > 0);
    const totalBudget = Number((dataChart.budget ?? []).at(-1) || 0);
    const catChartRef = useRef(null);
    const ownerInitialRef = useRef(null);
    const catChartInstance = useRef(null);
    const ownerInitialInstance = useRef(null);
    const ownerPreCRCInstance = useRef(null);

    useEffect(() => {
        // Destroy old charts if rerender
        [catChartInstance, ownerInitialInstance, ownerPreCRCInstance].forEach((ref) => {
            if (ref.current) ref.current.destroy();
        });

        if (!hasData) return;

        // ===== By Owner Area =====
        const ownerLabels = dataChart.label;
        const ownerInitialSteps = dataChart.budget;

        // Initial chart
        ownerInitialInstance.current = new Chart(ownerInitialRef.current, {
            type: "bar",
            data: {
                labels: ownerLabels,
                datasets: createWaterfallData(ownerInitialSteps, "#1E88E5")
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 24 } },
                plugins: {
                    datalabels: { display: false },
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            label: (context) => context.dataset.label === "Change"
                                ? `${formatMillions(context.raw)} M`
                                : null,
                        },
                    },
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: {
                            font: { size: 12, weight: '600' },
                            maxRotation: 20,
                            minRotation: 10
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: CHART_CHROME.grid },
                        border: { display: false },
                        ticks: { display: false },
                    }
                }
            },
            plugins: [valueLabelPlugin]
        });

        return () => {
            [catChartInstance, ownerInitialInstance, ownerPreCRCInstance].forEach((ref) => {
                if (ref.current) ref.current.destroy();
            });
        };
    }, [dataChart]);

    return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-start mb-stack-md">
                <div>
                    <h3 className="font-title-sm text-title-sm text-on-surface">Budget by Owner Area</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">Cumulative cash budget contribution per owner area · in million</p>
                    </div>
                </div>
                {hasData && (
                    <div className="px-4 py-2 rounded-lg bg-surface-container-low border border-outline-variant min-w-[140px]">
                        <p className="font-label-caps text-label-caps text-on-surface-variant">
                            Total Budget
                        </p>
                        <p className="font-data-tabular text-lg font-bold text-on-surface tabular-nums">
                            {formatMillions(totalBudget)} M
                        </p>
                    </div>
                )}
            </div>
            {hasData ? (
                <div style={{ height: '280px' }}>
                    <canvas ref={ownerInitialRef}></canvas>
                </div>
            ) : (
                <EmptyChartState year={year} />
            )}
        </div>
    );
}
