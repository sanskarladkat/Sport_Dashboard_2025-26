let charts = {};
let currentWinnersData = [];

async function loadStaffData() {
    try {
        const res = await fetch(`/api/staff_data`);
        const data = await res.json();

        //KPI
        document.getElementById('totalAch').innerText = data.kpi.totalAchievements;
        document.getElementById('totalPts').innerText = data.kpi.totalPoints;

        //Sport Buttons
        const btnContainer = document.getElementById('sportButtonContainer');
        btnContainer.innerHTML = "";
        data.sports.labels.forEach(sport => {
            const btn = document.createElement('button');
            btn.className = 'sport-btn';
            btn.innerText = sport;
            btn.onclick = () => showWinners(sport);
            btnContainer.appendChild(btn);
        });

        // Gender
        charts.gender = new ApexCharts(document.querySelector("#genderDonut"), {
            series: data.gender.series,
            labels: data.gender.labels,
            chart: { type: 'donut', height: 400 },
            colors: ['#008FFB', '#FF4560'],
            legend: { position: 'bottom' }
        }).render();

        // Dept Participation
        charts.dept = new ApexCharts(document.querySelector("#deptBar"), {
            series: [{ name: 'Participants', data: data.department.series }],
            chart: { type: 'bar', height: 650, toolbar: { show: true } },
            plotOptions: { 
                bar: { 
                    horizontal: true, 
                    distributed: true,
                    barHeight: '85%', 
                    dataLabels: { position: 'top' } 
                } 
            },
            xaxis: { categories: data.department.categories, min: 0 },
            yaxis: { labels: { maxWidth: 270, style: { fontSize: '12px' } } },
            legend: { show: false },
            dataLabels: { enabled: true, offsetX: 10, style: { colors: ['#444'], fontSize: '12px' } }
        }).render();

        // Dept Points
        charts.deptPoints = new ApexCharts(document.querySelector("#deptPointsBar"), {
            series: [{ name: 'Total Points', data: data.department_points.series }],
            chart: { type: 'bar', height: 650, toolbar: { show: true } },
            plotOptions: { 
                bar: { 
                    horizontal: true, 
                    distributed: true, 
                    barHeight: '80%', 
                    dataLabels: { position: 'top' } 
                } 
            },
            xaxis: { categories: data.department_points.categories, min: 0 },
            yaxis: { labels: { maxWidth: 270, style: { fontSize: '12px' } } },
            legend: { show: false },
            dataLabels: { enabled: true, offsetX: 10, style: { colors: ['#444'], fontSize: '12px' } }
        }).render();

    } catch (err) { 
        console.error("Error loading data:", err); 
    }
}

async function showWinners(sport) {
    const listSection = document.getElementById('listSection');
    const tableBody = document.getElementById('winnerTableBody');
    
    try {
        const res = await fetch(`/api/winners_by_sport?sport=${encodeURIComponent(sport)}`);
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
                <td>${w.Event || '-'}</td>
                <td><span class="rank-badge ${badgeClass}">${w.Rank || '-'}</span></td>
            </tr>`;
        }).join('') : "<tr><td colspan='5' style='text-align:center;'>No winners found.</td></tr>";
        
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

document.addEventListener('DOMContentLoaded', loadStaffData);