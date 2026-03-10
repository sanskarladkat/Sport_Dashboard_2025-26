let charts = {};

async function loadMonths() {
    try {
        const response = await fetch('/api/operations/months');
        const months = await response.json();
        const selector = document.getElementById('monthSelector');
        selector.innerHTML = ''; 

        if (months.length === 0 || months[0] === "Month Column Missing") {
            const opt = document.createElement('option');
            opt.text = "No Data Found"; 
            selector.add(opt); 
            return;
        }

        months.forEach(month => {
            const opt = document.createElement('option');
            opt.value = month; 
            opt.text = month; 
            selector.add(opt);
        });

        if (months.length > 0) {
            selector.value = months[0];
            fetchAndRenderOperations(months[0]);
        }
    } catch (e) { 
        console.error("Error loading months:", e); 
    }
}

async function fetchAndRenderOperations(month) {
    try {
        document.getElementById('reportTitle').innerText = `MIT-WPU Monthly Sports Operations Report - ${month}`;
        const response = await fetch(`/api/operations?month=${encodeURIComponent(month)}`);
        const data = await response.json();

        const totalCapacities = data.used.map((u, i) => u + data.unused[i]);
        const maxOpsVal = Math.max(...totalCapacities);

        const usageOptions = {
            series: [
                { name: 'Consumed', data: data.used },
                { name: 'Remaining', data: data.unused }
            ],
            chart: { type: 'bar', height: 550, stacked: true, toolbar: { show: false } },
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

document.addEventListener('DOMContentLoaded', loadMonths);