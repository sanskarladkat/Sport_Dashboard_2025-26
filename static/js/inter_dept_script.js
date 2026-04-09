let currentListData = [];
let sportsDataGlobal = null;
let sportsChartInstance = null;

async function loadData() {
    const res = await fetch('/api/inter_department_data');
    const data = await res.json();
    sportsDataGlobal = data.sportsParticipated;

    document.getElementById('kpiPoints').innerText = data.kpiMetrics.totalPoints;
    document.getElementById('kpiSports').innerText = data.kpiMetrics.uniqueSports;
    document.getElementById('kpiParticipants').innerText = data.kpiMetrics.totalParticipants;

    // Populate sports list
    const sportsContainer = document.getElementById('sportsListContainer');
    sportsContainer.innerHTML = sportsDataGlobal.labels.map((sport, index) => {
        return `<div class="sport-badge" title="${sport} (${sportsDataGlobal.series[index]} participants)">${sport}</div>`;
    }).join('');

    const barOptions = (labels, seriesData) => ({
        chart: { type: 'bar', height: 350, toolbar: { show: true } },
        plotOptions: { bar: { horizontal: true, distributed: true, barHeight: '70%' } },
        series: [{ name: 'Count', data: seriesData }],
        xaxis: { categories: labels },
        yaxis: {
            labels: {
                show: true,
                maxWidth: 220
            }
        },
        legend: { show: false }
    });

    new ApexCharts(document.querySelector("#schoolParticipantsChart"), barOptions(data.schoolParticipants.map(i => i.School), data.schoolParticipants.map(i => i.Participants))).render();
    new ApexCharts(document.querySelector("#schoolPointsChart"), barOptions(data.schoolPoints.map(i => i.School), data.schoolPoints.map(i => i.Points))).render();

    updateSportsView('chart');
}

function filterTable() {
    const filter = document.getElementById("studentSearch").value.toLowerCase();
    const tr = document.getElementById("participantTable").getElementsByTagName("tr");
    for (let i = 1; i < tr.length; i++) {
        const td = tr[i].getElementsByTagName("td")[0];
        tr[i].style.display = td && td.textContent.toLowerCase().includes(filter) ? "" : "none";
    }
}

function updateSportsView(type) {
    const btnChart = document.getElementById('btnSportsChart');
    const btnList = document.getElementById('btnSportsList');
    const container = document.getElementById('sportsViewContainer');
    if (sportsChartInstance) sportsChartInstance.destroy();
    container.innerHTML = "";
    
    if (type === 'chart') {
        btnChart.classList.add('active'); btnList.classList.remove('active');
        sportsChartInstance = new ApexCharts(container, { chart: { type: 'pie', height: 400 }, series: sportsDataGlobal.series, labels: sportsDataGlobal.labels, legend: { position: 'bottom' } });
    } else {
        btnList.classList.add('active'); btnChart.classList.remove('active');
        sportsChartInstance = new ApexCharts(container, { chart: { type: 'bar', height: 400 }, plotOptions: { bar: { horizontal: true, distributed: true } }, series: [{ data: sportsDataGlobal.series }], xaxis: { categories: sportsDataGlobal.labels }, legend: { show: false } });
    }
    sportsChartInstance.render();
}

async function showParticipantList(type) {
    const res = await fetch(`/api/inter_dept_participants?type=${type}`);
    currentListData = await res.json();
    document.getElementById("studentSearch").value = "";
    const tableBody = document.getElementById('participantTableBody');
    const titles = { '1st': 'Winner List', '2nd': '1st Runner Up List', '3rd': '2nd Runner Up List', 'all': 'Full Participant List' };
    document.getElementById('listTitle').innerText = titles[type];
    
    tableBody.innerHTML = currentListData.map(item => {
        let badge = "";
        const rank = (item['Rank'] || "").toLowerCase();
        if (rank.includes("winner")) badge = "rank-winner";
        else if (rank.includes("1st runner")) badge = "rank-1st-runner";
        else if (rank.includes("2nd runner")) badge = "rank-2nd-runner";
        
        return `
            <tr>
                <td style="white-space: pre-line; font-weight: 600;">${item['NAME OF STUDENT']}</td>
                <td>${item['School']}</td>
                <td>${item['Event'] || '-'}</td>
                <td>${item['Sport']}</td>
                <td><span class="rank-badge ${badge}">${item['Rank'] || '-'}</span></td>
            </tr>`;
    }).join('');
    
    document.getElementById('excelBtn').style.display = 'block';
}

function downloadExcel() {
    let csv = "\uFEFFStudent Name,Department,Event,Sport,Rank\n";
    currentListData.forEach(r => csv += `"${r['NAME OF STUDENT'].replace(/\n/g, ' ')}","${r['School']}","${r['Event'] || ''}","${r['Sport']}","${r['Rank'] || ''}"\n`);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Inter_Dept_${document.getElementById('listTitle').innerText.replace(/ /g, '_')}.csv`;
    link.click();
}

document.addEventListener('DOMContentLoaded', loadData);