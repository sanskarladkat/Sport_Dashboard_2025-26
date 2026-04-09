let charts = {};
let globalDashboardData = null;
let currentListData = []; 

async function fetchData() {
    try {
        const response = await fetch('/api/data');
        const data = await response.json();
        globalDashboardData = data;
        
        document.getElementById('totalAchievementsValue').innerText = data.kpiMetrics.totalAchievements;
        document.getElementById('totalPointsValue').innerText = data.kpiMetrics.totalPoints;
        document.getElementById('uniqueSportsValue').innerText = data.kpiMetrics.uniqueSports;
        
        const schoolDrop = document.getElementById('schoolDropdown');
        const sportDrop = document.getElementById('sportDropdown');
        
        data.schoolParticipation.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.School; opt.innerHTML = item.School;
            schoolDrop.appendChild(opt);
        });

        data.sportsPie.labels.forEach(sport => {
            const opt = document.createElement('option');
            opt.value = sport; opt.innerHTML = sport;
            sportDrop.appendChild(opt);
        });
        
        renderDashboard(data);
    } catch (error) { console.error("Error fetching data:", error); }
}

async function loadFilteredParticipants() {
    const school = document.getElementById('schoolDropdown').value;
    const sport = document.getElementById('sportDropdown').value;
    const tableBody = document.getElementById('participantTableBody');

    try {
        const response = await fetch(`/api/participants_by_school?school=${encodeURIComponent(school)}&sport=${encodeURIComponent(sport)}`);
        currentListData = await response.json();

        tableBody.innerHTML = currentListData.map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td style="font-weight: 600;">${item['NAME OF STUDENT']}</td>
                <td>${item['School']}</td>
                <td>${item['RESULTS']}</td>
                <td>${item['Sport']}</td>
                <td>${item['VENUE'] || '-'}</td>
                <td>${item['Rank'] || '-'}</td>
            </tr>
        `).join('');

        const listSection = document.getElementById('listSection');
        listSection.style.display = 'block';

        // Trigger reflow to enable animation
        void listSection.offsetWidth;
        listSection.style.animation = 'fadeInUp 0.5s ease forwards';
        listSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) { console.error(err); }
}

function searchTable() {
    const query = document.getElementById('studentSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#participantTableBody tr');
    rows.forEach(row => {
        const name = row.cells[1].innerText.toLowerCase(); 
        row.style.display = name.includes(query) ? '' : 'none';
    });
}

function downloadExcel() {
    if (!currentListData.length) return;
    let csv = "\uFEFFSr No,Student Name,School,Achievement,Sport,Venue,Rank\n";
    currentListData.forEach((r, i) => {
        csv += `${i+1},"${r['NAME OF STUDENT']}","${r['School']}","${r['RESULTS']}","${r['Sport']}","${r['VENUE']}","${r['Rank']}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "MIT-WPU_Sports_Filtered_List.csv";
    link.click();
}

function renderDashboard(data) {
    Object.values(charts).forEach(c => { if(c) c.destroy(); });
    charts = {};

    // Gender 
    charts.gender = new ApexCharts(document.querySelector("#genderDistributionChart"), {
        series: data.genderDistribution.series, labels: data.genderDistribution.labels,
        chart: { type: 'donut', height: 400 }, colors: ['#0e6cf0', '#07ed4c'],
        legend: { position: 'bottom' },
        plotOptions: { pie: { donut: { labels: { show: true, total: { show: true } } } } }
    }).render();

    // Bar 
    const barConfig = (element, title, vals, categories) => {
        const maxVal = Math.max(...vals);
        new ApexCharts(document.querySelector(element), {
            series: [{ name: title, data: vals }],
            chart: { type: 'bar', height: 450, toolbar: { show: false } },
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

// Chart 
function updateSportsPieView(type) {
    const container = document.getElementById('sportsPieViewContainer');
    if (charts.sportsPie) charts.sportsPie.destroy();
    container.innerHTML = "";
    document.getElementById('btnSportsPieChart').classList.toggle('active', type === 'chart');
    document.getElementById('btnSportsPieList').classList.toggle('active', type === 'list');
    if (type === 'chart') {
        charts.sportsPie = new ApexCharts(container, { series: globalDashboardData.sportsPie.series, labels: globalDashboardData.sportsPie.labels, chart: { type: 'pie', height: 400 }, legend: { position: 'bottom', fontSize: '10px' } });
    } else {
        charts.sportsPie = new ApexCharts(container, { series: [{ data: globalDashboardData.sportsPie.series }], chart: { type: 'bar', height: 600 }, plotOptions: { bar: { horizontal: true, distributed: true } }, xaxis: { categories: globalDashboardData.sportsPie.labels }, legend: { show: false } });
    }
    charts.sportsPie.render();
}

function getAchievementSortOrder(label) {
    const order = [
        'International Invitational Competition Medal',
        'International Invitational Competitions',
        'AIU Participation',
        'AIU - 1st Place',
        'AIU 1st Place',
        'AIU - 1st place',
        'AIU - 2nd Place',
        'AIU 2nd Place',
        'AIU - 2nd place',
        'AIU - 3rd Place',
        'AIU 3rd Place',
        'AIU - 3rd place',
        'West Zone - Participation',
        'West Zone Participation',
        'West Zone - 1st Place',
        'West Zone 1st Place',
        'West Zone - 2nd Place',
        'West Zone 2nd Place',
        'West Zone - 3rd Place',
        'West Zone 3rd Place',
        'Asso. - National - 1st Place',
        'Asso. National - 1st Place',
        'Asso. - National - Participation',
        'Asso. National - Participation',
        'Asso. - National - 2nd Place',
        'Asso. National - 2nd Place',
        'Asso. - National - 3rd Place',
        'Asso. National - 3rd Place',
        'Local Inter Collegiate Comp. - 1st Place',
        'Inter College Comp. - 1st Place',
        'Local Inter Collegiate Comp. - 2nd Place',
        'Inter College Comp. - 2nd Place',
        'Local Inter Collegiate Comp. - 3rd Place',
        'Inter College Comp. - 3rd Place',
        'Private University Comp. - 1st Place',
        'Private University Comp. - 2nd Place',
        'Private University Comp. - 3rd Place',
        'Asso. State - 1st Place',
        'Asso. State - Participation',
        'Asso. State - 2nd Place',
        'Asso. State - 3rd Place',
        'Khelo India - 1st Place',
        'Khelo India - 2nd Place',
        'Khelo India - 3rd Place',
        'Shiv Chhatrapati Krida Puraskar Awardee'
    ];

    const index = order.findIndex(item => item.toLowerCase() === label.toLowerCase());
    return index === -1 ? order.length : index;
}

function sortAchievementsByCustomOrder(labels, series) {
    const combined = labels.map((label, index) => ({
        label,
        value: series[index],
        sortOrder: getAchievementSortOrder(label)
    })).sort((a, b) => a.sortOrder - b.sortOrder);

    return {
        labels: combined.map(item => item.label),
        series: combined.map(item => item.value)
    };
}

function updateAchievementsView(type) {
    const container = document.getElementById('achievementsViewContainer');
    if (charts.achPie) charts.achPie.destroy();
    container.innerHTML = "";
    document.getElementById('btnAchChart').classList.toggle('active', type === 'chart');
    document.getElementById('btnAchList').classList.toggle('active', type === 'list');
    if (type === 'chart') {
        charts.achPie = new ApexCharts(container, { series: globalDashboardData.achievementTypesPie.series, labels: globalDashboardData.achievementTypesPie.labels, chart: { type: 'pie', height: 500 }, legend: { position: 'right', width: 350 } });
    } else {
        const sortedData = sortAchievementsByCustomOrder(globalDashboardData.achievementTypesPie.labels, globalDashboardData.achievementTypesPie.series);
        charts.achPie = new ApexCharts(container, { series: [{ data: sortedData.series }],
            chart: { type: 'bar', height: 700 }, plotOptions: { bar: { horizontal: true, distributed: true } },
            xaxis: { categories: sortedData.labels},
            yaxis: {
                labels: {
                    show: true,
                    maxWidth: 300,
                    style: { fontSize: '13px' }
                }
            },
            legend: { show: false } });
    }
    charts.achPie.render();
}

document.addEventListener('DOMContentLoaded', fetchData);