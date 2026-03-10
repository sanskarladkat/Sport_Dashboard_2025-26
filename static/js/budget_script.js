async function fetchAndRenderBudget() {
    try {
        const response = await fetch('/api/budget');
        const data = await response.json();

        const actualSpendList = data.series.find(s => s.name === 'Actual Spend').data;
        const unutilizedList = data.series.find(s => s.name === 'Unutilized Amount').data;
        
        const totalActual = actualSpendList.reduce((a, b) => a + b, 0);
        const totalUnutilized = unutilizedList.reduce((a, b) => a + b, 0);

        const rowTotals = actualSpendList.map((val, i) => val + unutilizedList[i]);
        const maxBudgetVal = Math.max(...rowTotals);

        //Total Utilization
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
        new ApexCharts(document.querySelector("#totalUtilizationChart"), totalUtilOptions).render();

        //Pie Chart
        const totalPerCategory = data.categories.map((cat, i) => data.series[0].data[i] + data.series[1].data[i]);
        const pieOptions = {
            series: totalPerCategory, 
            labels: data.categories,
            chart: { type: 'pie', height: 450 }, 
            legend: { position: 'bottom' },
            tooltip: { y: { formatter: (val) => "₹ " + val.toLocaleString() } }, 
            theme: { mode: 'light' }
        };
        new ApexCharts(document.querySelector("#budgetPieChart"), pieOptions).render();

        //Bar Chart
        const stackOptions = {
            series: [
                { name: 'Consumed', data: actualSpendList },
                { name: 'Remaining', data: unutilizedList }
            ],
            chart: { 
                type: 'bar', 
                height: 600, 
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
                    barHeight: '60%', 
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
        new ApexCharts(document.querySelector("#budgetStackChart"), stackOptions).render();

    } catch (error) {
        console.error("Error loading budget data:", error);
    }
}

document.addEventListener('DOMContentLoaded', fetchAndRenderBudget);