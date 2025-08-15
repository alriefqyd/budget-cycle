import React, { useEffect, useRef } from "react";
import {
    Chart,
    CategoryScale,
    LinearScale,
    BarElement,
    Tooltip,
    Legend
} from "chart.js";

Chart.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// Plugin to draw value labels
const valueLabelPlugin = {
    id: "valueLabel",
    afterDatasetsDraw(chart) {
        const { ctx } = chart;

        chart.data.datasets.forEach((dataset, datasetIndex) => {
            if (dataset.label !== "Change") return; // Only draw for 'Change' dataset

            const meta = chart.getDatasetMeta(datasetIndex);
            meta.data.forEach((bar, index) => {
                const value = dataset.data[index];

                // Skip bars that are null or undefined
                if (value === null || value === undefined) return;

                // Skip drawing if it's a "base only" bar (value is 0 and label is not 'Total')
                if (value === 0 && chart.data.labels[index] !== "Total") return;

                ctx.save();
                ctx.fillStyle = "#000";
                ctx.font = "bold 10px sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "bottom";
                ctx.fillText(value, bar.x, bar.y - 5);
                ctx.restore();
            });
        });
    }
};



// Helper to create stacked bar dataset for waterfall
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
            stack: "stack1"
        }
    ];
};


export default function WaterfallComparison({dataChart}) {

    console.log(dataChart)
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
                plugins: {
                    datalabels: { display: false },
                    tooltip: { enabled: true },
                    legend: { display: false }
                },
                scales: {
                    x: {
                        ticks: {
                            font: {
                                size: 12 // 🔹 smaller font for category labels
                            },
                            maxRotation: 20, // 🔹 tilt text
                            minRotation: 10
                        }
                    },
                    y: {
                        beginAtZero: true
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
        <div className="card bg-white shadow-lg rounded-lg p-6">
            {/* By Owner Area */}
            <h2 className="text-lg font-bold mt-10 mb-4">By Owner Area</h2>
            <div className="grid grid-cols-1 gap-4">
                <div>
                    <canvas ref={ownerInitialRef} height="120"></canvas>
                </div>
            </div>
        </div>
    );
}
