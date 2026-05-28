let charts = {};
let currentYear = 'Facility_2025-26';

async function loadMonths(sheet = 'Facility_2025-26') {
    try {
        console.log(`[OPS] Loading months for sheet: ${sheet}`);
        const response = await fetch(`/api/operations/months?sheet=${encodeURIComponent(sheet)}`);
        const months = await response.json();
        const selector = document.getElementById('monthSelector');
        selector.innerHTML = ''; 
        if (!Array.isArray(months) || months.length === 0 || months[0] === "Month Column Missing") {
            const opt = document.createElement('option');
            opt.text = "No Data Found";
            selector.add(opt);
            return;
        }

        // Insert a Yearly option at the top and default to it
        const yearlyOpt = document.createElement('option');
        yearlyOpt.value = 'Yearly';
        yearlyOpt.text = 'Yearly';
        selector.add(yearlyOpt);

        months.forEach(month => {
            const opt = document.createElement('option');
            opt.value = month;
            opt.text = month;
            selector.add(opt);
        });

        // Default view: Yearly
        selector.value = 'Yearly';
        fetchAndRenderOperations('Yearly');
    } catch (e) { 
        console.error("Error loading months:", e); 
    }
}

async function fetchAndRenderOperations(month) {
    try {
        const yearDisplay = currentYear.includes('2026') ? '2026-27' : '2025-26';
        const title = month && month !== 'Yearly' ? `MIT-WPU Monthly Sports Operations Report - ${month} (${yearDisplay})` : `MIT-WPU Yearly Sports Operations Report (${yearDisplay})`;
        document.getElementById('reportTitle').innerText = title;

        const url = month && month !== 'Yearly' ? `/api/operations?sheet=${encodeURIComponent(currentYear)}&month=${encodeURIComponent(month)}` : `/api/operations?sheet=${encodeURIComponent(currentYear)}&yearly=true`;
        console.log(`[OPS] Fetching from: ${url}`);
        const response = await fetch(url);
        const data = await response.json();

        // Render KPIs if provided
        // Animated KPI counters
        function animateCount(el, to, duration = 900) {
            if (!el) return;
            to = Number(to) || 0;
            const start = 0;
            const startTime = performance.now();
            function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
            function tick(now) {
                const raw = Math.min((now - startTime) / duration, 1);
                const progress = easeOutCubic(raw);
                const value = Math.floor(start + (to - start) * progress);
                el.innerText = value.toLocaleString();
                if (raw < 1) requestAnimationFrame(tick);
            }
            requestAnimationFrame(tick);
        }

        if (data.kpis) {
            animateCount(document.getElementById('totalAvailable'), Math.round(Number(data.kpis.total_capacity)));
            animateCount(document.getElementById('totalUtilized'), Math.round(Number(data.kpis.total_utilized)));
            animateCount(document.getElementById('totalSports'), Math.round(Number(data.kpis.total_sports)));
            // Donut for overall utilization
            const cap = Number(data.kpis.total_capacity) || 0;
            const used = Number(data.kpis.total_utilized) || 0;
            const pct = cap > 0 ? Math.round((used / cap) * 100) : 0;
            document.getElementById('utilPct').innerText = pct + '% utilized';
            
            const donutSeries = cap > 0 ? [used, Math.max(0, cap - used)] : [0, 1];
            const headerColor = getComputedStyle(document.documentElement).getPropertyValue('--header-color') || '#1a237e';
            const donutBg = '#eef3ff';
            const donutOptions = {
                series: donutSeries,
                labels: ['Utilized', 'Unutilized'],
                chart: { type: 'donut', height: 120, animations: { enabled: true, easing: 'easeout', dynamicAnimation: { speed: 600 } } },
                colors: ['#05fa7f', '#f50226'],
                legend: { show: false },
                dataLabels: { enabled: false },
                stroke: { colors: ['transparent'] },
                tooltip: { enabled: true, y: { formatter: (val) => val.toLocaleString() } },
                plotOptions: { pie: { donut: { size: '65%' } } }
            };

            if (charts.donut) charts.donut.destroy();
            charts.donut = new ApexCharts(document.querySelector('#utilDonut'), donutOptions);
            charts.donut.render();
        } else {
            document.getElementById('totalAvailable').innerText = '—';
            document.getElementById('totalUtilized').innerText = '—';
            document.getElementById('totalSports').innerText = '—';
            document.getElementById('utilPct').innerText = '—';
            if (charts.donut) { charts.donut.destroy(); charts.donut = null; }
        }

        const totalCapacities = data.used.map((u, i) => u + data.unused[i]);
        const maxOpsVal = totalCapacities.length ? Math.max(...totalCapacities) : 0;

        const usageOptions = {
            series: [
                { name: 'Consumed', data: data.used },
                { name: 'Remaining', data: data.unused }
            ],
            chart: { type: 'bar', height: 550, stacked: true, toolbar: { show: false }, animations: { enabled: true, easing: 'easeout', dynamicAnimation: { speed: 600 } } },
            colors: ['#f50226', '#05fa7f'],
            grid: { padding: { right: 80, left: 0 } },
            plotOptions: {
                bar: { 
                    horizontal: true, 
                    barHeight: '55%', 
                    dataLabels: { 
                        total: { 
                            enabled: true, 
                            offsetX: 10, 
                            style: { fontSize: '12px', fontWeight: 700, color: '#333' },
                            formatter: function(val) {
                                return val.toLocaleString();
                            }
                        } 
                    } 
                }
            },
            dataLabels: { 
                enabled: true,
                style: { fontSize: '12px', fontWeight: 'bold', colors: ['#fff'] },
                formatter: function (val, opts) {
                    const index = opts.dataPointIndex;
                    const total = data.used[index] + data.unused[index];
                    const percent = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                    return percent > 5 ? percent + "%" : "";
                }
            },
            xaxis: { 
                categories: data.facilities, 
                min: 0, 
                max: maxOpsVal * 1.15, 
                labels: { formatter: (val) => val.toLocaleString() } 
            },
            yaxis: { 
                labels: { 
                    maxWidth: 250, 
                    style: { fontSize: '12px', fontFamily: 'Poppins' } 
                } 
            },
            tooltip: { 
                y: { 
                    formatter: function (val, { dataPointIndex }) {
                        const total = data.used[dataPointIndex] + data.unused[dataPointIndex];
                        const percent = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                        return val.toLocaleString() + " (" + percent + "%)";
                    }
                } 
            },
            legend: { position: 'top' }
        };

        if (charts.usage) charts.usage.destroy();
        charts.usage = new ApexCharts(document.querySelector("#opsUsageChart"), usageOptions);
        charts.usage.render();

    } catch (error) { 
        console.error("Error loading operations:", error); 
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const yearSelect = document.getElementById('yearSelect');
    if (yearSelect) {
        currentYear = yearSelect.value || 'Facility_2025-26';
        console.log(`[OPS] Page loaded, initial year: ${currentYear}`);
        yearSelect.addEventListener('change', (e) => {
            currentYear = e.target.value;
            console.log(`[OPS] Year changed to: ${currentYear}`);
            loadMonths(currentYear);
        });
    }
    loadMonths(currentYear);
});