let charts = {};
let globalDashboardData = null;

async function fetchData() {
    try {
        const response = await fetch('/api/data');
        const data = await response.json();
        globalDashboardData = data;
        
        document.getElementById('totalAchievementsValue').innerText = data.kpiMetrics.totalAchievements;
        document.getElementById('totalPointsValue').innerText = data.kpiMetrics.totalPoints;
        document.getElementById('uniqueSportsValue').innerText = data.kpiMetrics.uniqueSports;
        
        const dropdown = document.getElementById('schoolDropdown');
        data.schoolParticipation.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.School;
            opt.innerHTML = item.School;
            dropdown.appendChild(opt);
        });
        
        renderDashboard(data);
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

function renderDashboard(data) {
    Object.values(charts).forEach(c => { if(c) c.destroy(); });
    charts = {};

    // Gender Chart
    const genderLabels = data.genderDistribution.labels;
    const genderColors = genderLabels.map(label => label.toLowerCase().includes('boy') ? '#0e6cf0' : '#07ed4c');

    charts.gender = new ApexCharts(document.querySelector("#genderDistributionChart"), {
        series: data.genderDistribution.series,
        labels: genderLabels,
        chart: { type: 'donut', height: 400 },
        colors: genderColors,
        legend: { position: 'bottom' },
        dataLabels: {
            enabled: true,
            formatter: (val, opts) => opts.w.config.series[opts.seriesIndex],
            style: { colors: ['#333'], fontSize: '14px', fontWeight: 'bold' },
            background: { enabled: true, foreColor: '#fff', padding: 4, borderRadius: 2 }
        },
        plotOptions: {
            pie: {
                donut: {
                    labels: {
                        show: true,
                        value: {
                            show: true,
                            formatter: (val) => {
                                const total = data.genderDistribution.series.reduce((a, b) => a + b, 0);
                                return ((val / total) * 100).toFixed(1) + "%";
                            }
                        },
                        total: {
                            show: true,
                            label: 'Total',
                            formatter: (w) => w.globals.seriesTotals.reduce((a, b) => a + b, 0)
                        }
                    }
                }
            }
        }
    }).render();

    // Bar Charts
    const barConfig = (element, title, vals, categories) => {
        const maxVal = Math.max(...vals);
        new ApexCharts(document.querySelector(element), {
            series: [{ name: title, data: vals }],
            chart: { type: 'bar', height: 450, toolbar: { show: true } },
            plotOptions: { bar: { horizontal: true, distributed: true, dataLabels: { position: 'top' } } },
            xaxis: { categories: categories, min: 0, max: maxVal * 1.2 },
            yaxis: { labels: { maxWidth: 250, style: { fontSize: '12px' } } },
            legend: { show: false },
            dataLabels: { enabled: true, textAnchor: 'start', offsetX: 10, style: { colors: ['#333'], fontSize: '13px' } }
        }).render();
    };

    barConfig("#schoolParticipationChart", "Participants", data.schoolParticipation.map(i => i.Achievements), data.schoolParticipation.map(i => i.School));
    barConfig("#schoolPointsChart", "Points", data.schoolPoints.map(i => i.Points), data.schoolPoints.map(i => i.School));

    updateSportsPieView('chart');
    updateAchievementsView('chart');
}

function updateSportsPieView(type) {
    const container = document.getElementById('sportsPieViewContainer');
    if (charts.sportsPie) charts.sportsPie.destroy();
    container.innerHTML = "";
    document.getElementById('btnSportsPieChart').classList.toggle('active', type === 'chart');
    document.getElementById('btnSportsPieList').classList.toggle('active', type === 'list');
    
    if (type === 'chart') {
        charts.sportsPie = new ApexCharts(container, {
            series: globalDashboardData.sportsPie.series,
            labels: globalDashboardData.sportsPie.labels,
            chart: { type: 'pie', height: 400 },
            legend: { position: 'bottom', fontSize: '10px' }
        });
    } else {
        const vals = globalDashboardData.sportsPie.series;
        charts.sportsPie = new ApexCharts(container, {
            series: [{ data: vals }],
            chart: { type: 'bar', height: 400 },
            plotOptions: { bar: { horizontal: true, distributed: true, dataLabels: { position: 'top' } } },
            xaxis: { categories: globalDashboardData.sportsPie.labels, min: 0, max: Math.max(...vals) * 1.2 },
            yaxis: { labels: { maxWidth: 270, style: { fontSize: '11px' } } },
            dataLabels: { enabled: true, textAnchor: 'start', offsetX: 10, style: { colors: ['#333'], fontSize: '11px' } }
        });
    }
    charts.sportsPie.render();
}

function updateAchievementsView(type) {
    const container = document.getElementById('achievementsViewContainer');
    if (charts.achPie) charts.achPie.destroy();
    container.innerHTML = "";
    document.getElementById('btnAchChart').classList.toggle('active', type === 'chart');
    document.getElementById('btnAchList').classList.toggle('active', type === 'list');

    if (type === 'chart') {
        charts.achPie = new ApexCharts(container, {
            series: globalDashboardData.achievementTypesPie.series,
            labels: globalDashboardData.achievementTypesPie.labels,
            chart: { type: 'pie', height: 500 },
            legend: { position: 'right', verticalAlign: 'middle', width: 350, fontSize: '11px' }
        });
    } else {
        const vals = globalDashboardData.achievementTypesPie.series;
        charts.achPie = new ApexCharts(container, {
            series: [{ data: vals }],
            chart: { type: 'bar', height: 500 },
            plotOptions: { bar: { horizontal: true, distributed: true, dataLabels: { position: 'top' } } },
            xaxis: { categories: globalDashboardData.achievementTypesPie.labels, min: 0, max: Math.max(...vals) * 1.2 },
            yaxis: { labels: { maxWidth: 260, style: { fontSize: '11px' } } },
            dataLabels: { enabled: true, textAnchor: 'start', offsetX: 10, style: { colors: ['#333'], fontSize: '11px' } }
        });
    }
    charts.achPie.render();
}

async function loadParticipantsBySchool() {
    const schoolName = document.getElementById('schoolDropdown').value;
    const listSection = document.getElementById('listSection');
    const tableBody = document.getElementById('participantTableBody');
    if (!schoolName) { listSection.style.display = 'none'; return; }
    
    try {
        const response = await fetch(`/api/participants_by_school?school=${encodeURIComponent(schoolName)}`);
        const currentListData = await response.json();
        tableBody.innerHTML = currentListData.map(item => `
            <tr>
                <td style="font-weight: 600;">${item['NAME OF STUDENT']}</td>
                <td>${item['School']}</td>
                <td>${item['RESULTS']}</td>
                <td>${item['Sport']}</td>
                <td>${item['VENUE'] || '-'}</td>
                <td>${item['Rank'] || '-'}</td>
            </tr>
        `).join('');
        
        document.getElementById('listTitle').innerText = schoolName === 'all' ? 'Full Participants List' : `Participants - ${schoolName}`;
        listSection.style.display = 'block';
        listSection.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
        console.error("Error loading list:", err);
    }
}

document.addEventListener('DOMContentLoaded', fetchData);