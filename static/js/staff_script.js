let charts = {};
let currentWinnersData = [];
let chartsLoaded = false;
let currentStaffSheet = 'Staff_Summit_2025-26';

function updateStaffTitle(sheet) {
    const displayYear = sheet.includes('2026') ? '2026-27' : '2025-26';
    document.getElementById('staffTitle').innerText = `MIT-WPU Staff Summit Performance Overview (${displayYear})`;
}

async function loadStaffData(sheet = currentStaffSheet) {
    try {
        currentStaffSheet = sheet;
        updateStaffTitle(sheet);
        chartsLoaded = false;
        console.log('[STAFF] Starting data load for sheet:', sheet);
        const res = await fetch(`/api/staff_data?sheet=${encodeURIComponent(sheet)}`);
        console.log('[STAFF] Response status:', res.status);
        
        if (!res.ok) {
            const error = await res.json();
            console.error('[STAFF] API Error:', error);
            document.getElementById('sportButtonContainer').innerHTML = `<p style="color:red;font-size:0.75rem;">Error: ${error.error || 'Unknown error'}</p>`;
            return;
        }
        
        const data = await res.json();
        console.log('[STAFF] Data received:', data);

        if (data.error) {
            console.error('[STAFF] Data error:', data.error);
            document.getElementById('sportButtonContainer').innerHTML = `<p style="color:red;font-size:0.75rem;">Error: ${data.error}</p>`;
            return;
        }

        // Display KPI immediately
        console.log('[STAFF] KPI data:', {
            totalParticipants: data.kpi.totalParticipants,
            totalSports: data.kpi.totalSports,
            totalPoints: data.kpi.totalPoints
        });
        
        document.getElementById('totalParticipants').innerText = data.kpi.totalParticipants;
        document.getElementById('totalSports').innerText = data.kpi.totalSports;
        document.getElementById('totalPts').innerText = data.kpi.totalPoints;

        // Display Sport Buttons immediately
        const btnContainer = document.getElementById('sportButtonContainer');
        btnContainer.innerHTML = "";
        console.log('[STAFF] Sports count:', data.sports.labels.length);
        if (data.sports.labels.length === 0) {
            btnContainer.innerHTML = '<p style="font-size:0.75rem;">No sports data available</p>';
        } else {
            const allBtn = document.createElement('button');
            allBtn.className = 'sport-btn';
            allBtn.innerText = 'All';
            allBtn.onclick = () => showWinners('All');
            btnContainer.appendChild(allBtn);

            data.sports.labels.forEach(sport => {
                const btn = document.createElement('button');
                btn.className = 'sport-btn';
                btn.innerText = sport;
                btn.onclick = () => showWinners(sport);
                btnContainer.appendChild(btn);
            });
        }
        console.log('[STAFF] KPIs and buttons loaded');

        // Render all charts (re-render on year change)
        Promise.all([
            renderGenderChart(data.gender),
            renderDeptChart(data.department),
            renderDeptPointsChart(data.department_points)
        ]).catch(err => console.error("Error rendering charts:", err));

    } catch (err) { 
        console.error("[STAFF] Exception during load:", err); 
        document.getElementById('sportButtonContainer').innerHTML = `<p style="color:red;font-size:0.75rem;">Connection error: ${err.message}</p>`;
    }
}

function renderGenderChart(data) {
    return new Promise((resolve) => {
        try {
            const container = document.querySelector("#genderDonut");
            if (!container) {
                console.error('[CHART] Gender chart container not found');
                resolve();
                return;
            }
            if (charts.gender) {
                charts.gender.destroy();
                charts.gender = null;
            }
            container.innerHTML = '';
            charts.gender = new ApexCharts(container, {
                series: data.series,
                labels: data.labels,
                chart: { type: 'donut', height: 400 },
                colors: ['#008FFB', '#FF4560'],
                legend: { position: 'bottom' }
            });
            charts.gender.render().then(() => {
                console.log('[CHART] Gender chart rendered');
                resolve();
            });
        } catch (err) {
            console.error('[CHART] Gender chart error:', err);
            resolve();
        }
    });
}

function renderDeptChart(data) {
    return new Promise((resolve) => {
        try {
            const container = document.querySelector("#deptBar");
            if (charts.dept) {
                charts.dept.destroy();
                charts.dept = null;
            }
            if (container) container.innerHTML = '';
            charts.dept = new ApexCharts(document.querySelector("#deptBar"), {
                series: [{ name: 'Participants', data: data.series }],
                chart: { type: 'bar', height: 650, toolbar: { show: true } },
                plotOptions: { 
                    bar: { 
                        horizontal: true, 
                        distributed: true,
                        barHeight: '85%', 
                        dataLabels: { position: 'top' } 
                    } 
                },
                xaxis: { categories: data.categories, min: 0 },
                yaxis: { labels: { maxWidth: 270, style: { fontSize: '12px' } } },
                legend: { show: false },
                dataLabels: { enabled: true, offsetX: 10, style: { colors: ['#444'], fontSize: '12px' } }
            });
            charts.dept.render().then(() => {
                console.log('[CHART] Dept chart rendered');
                resolve();
            });
        } catch (err) {
            console.error('[CHART] Dept chart error:', err);
            resolve();
        }
    });
}

function renderDeptPointsChart(data) {
    return new Promise((resolve) => {
        try {
            const container = document.querySelector("#deptPointsBar");
            if (charts.deptPoints) {
                charts.deptPoints.destroy();
                charts.deptPoints = null;
            }
            if (container) container.innerHTML = '';
            charts.deptPoints = new ApexCharts(document.querySelector("#deptPointsBar"), {
                series: [{ name: 'Total Points', data: data.series }],
                chart: { type: 'bar', height: 650, toolbar: { show: true } },
                plotOptions: { 
                    bar: { 
                        horizontal: true, 
                        distributed: true, 
                        barHeight: '80%', 
                        dataLabels: { position: 'top' } 
                    } 
                },
                xaxis: { categories: data.categories, min: 0 },
                yaxis: { labels: { maxWidth: 270, style: { fontSize: '12px' } } },
                legend: { show: false },
                dataLabels: { enabled: true, offsetX: 10, style: { colors: ['#444'], fontSize: '12px' } }
            });
            charts.deptPoints.render().then(() => {
                console.log('[CHART] Dept Points chart rendered');
                resolve();
            });
        } catch (err) {
            console.error('[CHART] Dept Points chart error:', err);
            resolve();
        }
    });
}

async function showWinners(sport) {
    const listSection = document.getElementById('listSection');
    const tableBody = document.getElementById('winnerTableBody');
    
    try {
        const res = await fetch(`/api/winners_by_sport?sheet=${encodeURIComponent(currentStaffSheet)}&sport=${encodeURIComponent(sport)}`);
        currentWinnersData = await res.json();
        
        tableBody.innerHTML = currentWinnersData.length > 0 ? currentWinnersData.map(w => {
            let badgeClass = "rank-default";
            const pts = parseInt(w.Points);
            
            if (pts === 10) badgeClass = "rank-winner";
            else if (pts === 7) badgeClass = "rank-1st-runner";
            else if (pts === 5) badgeClass = "rank-2nd-runner";

            return `
            <tr>
                <td><strong>${w.Name}</strong></td>
                <td>${w.Department}</td>
                <td>${w.Gender || '-'}</td>
                <td>${w.Sport || '-'}</td>
                <td>${w.Event || '-'}</td>
                <td><span class="rank-badge ${badgeClass}">${w.Rank || '-'}</span></td>
            </tr>`;
        }).join('') : "<tr><td colspan='6' style='text-align:center;'>No winners found.</td></tr>";
        
        document.getElementById('listTitle').innerText = `${sport} Winners List`;
        listSection.style.display = 'block';
        listSection.scrollIntoView({ behavior: 'smooth' });
    } catch (err) { 
        console.error("Error fetching winners:", err); 
    }
}

function downloadExcel() {
    if (!currentWinnersData.length) return;
    let csvContent = "\uFEFFName,Department,Gender,Event,Rank\n";
    currentWinnersData.forEach(row => {
        csvContent += `"${row.Name}","${row.Department}","${row.Gender || ''}","${row.Event || ''}","${row.Rank || ''}"\n`;
    });
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${document.getElementById('listTitle').innerText.replace(/ /g, '_')}.csv`;
    link.click();
}

document.addEventListener('DOMContentLoaded', () => {
    const yearSelect = document.getElementById('yearSelect');
    if (yearSelect) {
        currentStaffSheet = yearSelect.value || currentStaffSheet;
        yearSelect.addEventListener('change', (e) => {
            currentStaffSheet = e.target.value;
            console.log('[STAFF] Year changed to:', currentStaffSheet);
            loadStaffData(currentStaffSheet);
        });
    }
    loadStaffData(currentStaffSheet);
});