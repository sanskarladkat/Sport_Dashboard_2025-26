let charts = {};

async function fetchAndRenderBudget(sheetName = 'budget_2025-26') {
    try {
        console.log(`[BUDGET] Fetching from sheet: ${sheetName}`);
        const url = `/api/budget?sheet=${encodeURIComponent(sheetName)}`;
        console.log(`[BUDGET] Request URL: ${url}`);
        const response = await fetch(url);
        const data = await response.json();
        console.log(`[BUDGET] Response received - Sheet: ${data.sheet}, Categories: ${data.categories ? data.categories.length : 0}`);

        // Check for error response
        if (data.error || !data.series) {
            console.error("Error from API:", data.error || "Invalid data structure");
            alert("Error loading budget data: " + (data.error || "Invalid response"));
            return;
        }

        // Update page title based on returned sheet (if provided)
        if (data.sheet) {
            const titleEl = document.getElementById('budgetTitle');
            if (titleEl) {
                const displayYear = data.sheet.includes('2026') ? '2026-27' : '2025-26';
                console.log(`[BUDGET] Updating title to: ${displayYear}`);
                titleEl.innerText = `MIT-WPU Sports and Gymkhana ${displayYear}`;
            }
        }

        const actualSpendList = (data.series.find(s => s.name === 'Actual Spend') || {data: []}).data || [];
        const unutilizedList = (data.series.find(s => s.name === 'Unutilized Amount') || {data: []}).data || [];
        
        const totalActual = actualSpendList.reduce((a, b) => a + b, 0);
        const totalUnutilized = unutilizedList.reduce((a, b) => a + b, 0);
        const totalBudget = totalActual + totalUnutilized;

        // Update KPI cards
        document.getElementById('kpiTotalBudget').textContent = '₹ ' + totalBudget.toLocaleString('en-IN', {maximumFractionDigits: 0});
        document.getElementById('kpiUtilizedBudget').textContent = '₹ ' + totalActual.toLocaleString('en-IN', {maximumFractionDigits: 0});
        document.getElementById('kpiRemainingBudget').textContent = '₹ ' + totalUnutilized.toLocaleString('en-IN', {maximumFractionDigits: 0});

        const rowTotals = actualSpendList.map((val, i) => val + unutilizedList[i]);
        const maxBudgetVal = Math.max(...rowTotals);

        //Total Utilization
        if (charts.totalUtil) charts.totalUtil.destroy();
        const totalUtilOptions = {
            series: [
                { name: 'Consumed', data: [totalActual] }, 
                { name: 'Remaining', data: [totalUnutilized] }
            ],
            chart: { type: 'bar', height: 150, stacked: true, stackType: '100%', toolbar: { show: false } },
            colors: ['#f70a2c', '#05fc81'], 
            plotOptions: { bar: { horizontal: true, barHeight: '50%' } },
            xaxis: { categories: ['Total Budget'], labels: {show: false}, axisBorder: {show: false}, axisTicks: {show: false} },
            tooltip: { y: { formatter: (val) => "₹ " + val.toLocaleString() } },
            legend: { position: 'top' }
        };
        charts.totalUtil = new ApexCharts(document.querySelector("#totalUtilizationChart"), totalUtilOptions);
        charts.totalUtil.render();

        //Pie Chart
        if (charts.pie) charts.pie.destroy();
        const s0 = (data.series[0] && data.series[0].data) || [];
        const s1 = (data.series[1] && data.series[1].data) || [];
        const totalPerCategory = data.categories.map((cat, i) => (s0[i] || 0) + (s1[i] || 0));
        const pieOptions = {
            series: totalPerCategory, 
            labels: data.categories,
            chart: { type: 'pie', height: 450 }, 
            legend: { position: 'bottom' },
            tooltip: { y: { formatter: (val) => "₹ " + val.toLocaleString() } }, 
            theme: { mode: 'light' }
        };
        charts.pie = new ApexCharts(document.querySelector("#budgetPieChart"), pieOptions);
        charts.pie.render();

        //Bar Chart - Fixed for better small-bar visibility
        if (charts.stack) charts.stack.destroy();
        const numCategories = data.categories.length;
        const dynamicHeight = Math.max(400, numCategories * 50); // Scale height based on number of bars
        
        const stackOptions = {
            series: [
                { name: 'Consumed', data: actualSpendList },
                { name: 'Remaining', data: unutilizedList }
            ],
            chart: { 
                type: 'bar', 
                height: dynamicHeight, 
                stacked: true, 
                toolbar: { show: false } 
            }, 
            colors: ['#f70a2c', '#05fc81'],
            grid: {
                padding: { right: 80, left: 0 }
            },
            plotOptions: { 
                bar: { 
                    horizontal: true, 
                    barHeight: '80%',  // Increased from 60% for better visibility
                    dataLabels: { total: { enabled: true, offsetX: 10, style: { fontSize: '12px', fontWeight: 700, color: '#333' } } } 
                } 
            },
            dataLabels: { enabled: false }, 
            xaxis: { 
                categories: data.categories, 
                min: 0, 
                max: maxBudgetVal * 1.15, 
                labels: { formatter: (val) => val >= 1000000 ? (val / 1000000).toFixed(1) + 'M' : val } 
            },
            yaxis: { 
                labels: { 
                    maxWidth: 180, 
                    style: { fontSize: '12px', fontFamily: 'Poppins' } 
                } 
            },
            tooltip: { y: { formatter: (val) => "₹ " + val.toLocaleString() } }, 
            legend: { position: 'top' }
        };
        charts.stack = new ApexCharts(document.querySelector("#budgetStackChart"), stackOptions);
        charts.stack.render();

    } catch (error) {
        console.error("Error loading budget data:", error);
        alert("Failed to load budget data. Check console for details.");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const yearSelect = document.getElementById('budgetYearSelect');
    fetchAndRenderBudget(yearSelect.value || 'budget_2025-26');

    yearSelect.addEventListener('change', (e) => {
        const sheet = e.target.value;
        const title = document.getElementById('budgetTitle');
        if (title) {
            const displayYear = sheet.includes('2026') ? '2026-27' : '2025-26';
            title.innerText = `MIT-WPU Sports and Gymkhana ${displayYear}`;
        }
        fetchAndRenderBudget(sheet);
    });
});