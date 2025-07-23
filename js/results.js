// Results JavaScript
document.addEventListener('DOMContentLoaded', () => {
    // On s'assure que les dépendances (comme Chart.js) sont prêtes
    if (typeof Chart === 'undefined') {
        console.error('Chart.js n\'a pas été chargé. Assurez-vous d\'inclure le script dans votre HTML.');
        return;
    }
    initializeResults().catch(console.error);
});


let resultsData = [];
let charts = {};
let liveUpdateInterval = null;

// MODIFIÉ : La fonction est maintenant 'async' pour permettre 'await'
async function initializeResults() {
    console.log('Initialisation de la page des résultats');

    // Charger les données initiales
    await loadResultsData();
    
    // Initialiser les composants de la page
    initializeCharts(); // Va maintenant utiliser les données réelles
    populateResultsTable();
    loadRegionalResults(); // Note: utilise toujours des données aléatoires pour l'exemple
    startLiveFeed();
    updateStatistics();
    initializeExportFunctions();

    // Démarrer les mises à jour en direct
    startLiveUpdates();

    // Mettre à jour l'horodatage initial
    updateLastUpdateTime();
}

async function loadResultsData() {
    try {
        const response = await fetch('http://localhost:5000/api/vote/results', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('session_token') || ''}` }
        });
        if (!response.ok) throw new Error(`Erreur HTTP ${response.status} lors du chargement des résultats.`);
        
        const data = await response.json();
        
        // S'assurer que les données reçues sont valides
        if (!data || !Array.isArray(data.results)) {
            throw new Error("Le format des données de résultats est invalide.");
        }

        resultsData = data.results.map(item => ({
            id: item.id,
            name: item.candidat,
            party: item.parti,
            votes: item.votes,
            percentage: item.pourcentage,
            photo: '', // Photo statique pour l'exemple
        }));
        console.log('Données des résultats chargées:', resultsData);

    } catch (error) {
        console.error('Erreur lors du chargement des données des résultats:', error);
        // Afficher une erreur à l'utilisateur
        const resultsTableBody = document.getElementById('resultsTableBody');
        if(resultsTableBody) resultsTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-red-500 py-4">Impossible de charger les résultats. ${error.message}</td></tr>`;
        resultsData = []; // Réinitialiser les données en cas d'erreur
    }
}


function initializeCharts() {
    initializePieChart();
    // MODIFIÉ : On appelle la nouvelle fonction pour le graphique chronologique
    initializeTimelineChart(); 
    initializeChartControls();
}

function initializePieChart() {
    const ctx = document.getElementById('votesChart');
    if (!ctx) {
        console.warn('Élément canvas "votesChart" non trouvé.');
        return;
    }
    
    const colors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    
    charts.votesChart = new Chart(ctx, {
        type: 'pie', // Type par défaut (camembert)
        data: {
            labels: resultsData.map(c => c.name),
            datasets: [{
                data: resultsData.map(c => c.percentage),
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (!resultsData[context.dataIndex]) return '';
                            const candidate = resultsData[context.dataIndex];
                            return `${candidate.name}: ${candidate.percentage.toFixed(1)}% (${candidate.votes.toLocaleString('fr-FR')} votes)`;
                        }
                    }
                }
            }
        }
    });
}

// MODIFIÉ : Utilise maintenant les données réelles de /stats
async function initializeTimelineChart() {
    const ctx = document.getElementById('timelineChart');
    if (!ctx) {
        console.warn('Élément canvas "timelineChart" non trouvé.');
        return;
    }
    
    let timelineData = { labels: [], datasets: [] };
    
    try {
        const response = await fetch('http://localhost:5000/api/vote/stats', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('session_token') || ''}` }
        });
        if (!response.ok) throw new Error('Erreur chargement des stats de la timeline.');
        const stats = await response.json();
        
        // Formater les données pour Chart.js
        if(stats.votes_par_heure && stats.votes_par_heure.length > 0) {
            timelineData.labels = stats.votes_par_heure.map(item => `${item.heure}h`);
            timelineData.datasets.push({
                label: 'Votes par heure',
                data: stats.votes_par_heure.map(item => item.votes),
                borderColor: '#10b981',
                backgroundColor: '#10b98120',
                tension: 0.4,
                fill: true
            });
        }

    } catch (error) {
        console.error("Erreur de chargement des données pour la timeline :", error);
    }
    
    charts.timelineChart = new Chart(ctx, {
        type: 'line',
        data: timelineData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top' } },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Nombre de Votes' } },
                x: { title: { display: true, text: 'Heure' } }
            }
        }
    });
}


function initializeChartControls() {
    const chartControls = document.querySelectorAll('[data-chart]');
    chartControls.forEach(control => {
        control.addEventListener('click', function() {
            const chartType = this.dataset.chart;
            if (charts.votesChart && (chartType === 'pie' || chartType === 'doughnut' || chartType === 'bar')) {
                charts.votesChart.config.type = chartType;
                charts.votesChart.update();
                chartControls.forEach(c => c.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });
}

function populateResultsTable() {
    const tableBody = document.getElementById('resultsTableBody');
    if (!tableBody) return;
    
    if (resultsData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4">Aucun résultat à afficher pour le moment.</td></tr>';
        return;
    }

    
    const renderResultsRow = (candidate, index) => `
        <tr>
            <td>${index}</td>
            <td>
                <div class="flex items-center">
                    <img class="h-10 w-10 rounded-full object-cover mr-4" src="${candidate.photo}" alt="${candidate.name}">
                    <div>
                        <div class="font-bold">${candidate.name}</div>
                        <div class="text-sm text-gray-500">${candidate.party}</div>
                    </div>
                </div>
            </td>
            <td>${candidate.votes.toLocaleString('fr-FR')}</td>
            <td>${candidate.percentage.toFixed(2)}%</td>
            <td><div class="w-full bg-gray-200 rounded-full h-2.5"><div class="bg-blue-600 h-2.5 rounded-full" style="width: ${candidate.percentage}%"></div></div></td>
        </tr>
    `;

    tableBody.innerHTML = resultsData.map((candidate, index) => 
        renderResultsRow(candidate, index + 1)
    ).join('');
    
    console.log('Tableau des résultats rempli');
}
function loadRegionalResults() {
    const regionalGrid = document.getElementById('regionalGrid');
    if (!regionalGrid) return;
    
    const regions = [
        'Adamaoua', 'Centre', 'Est', 'Extrême-Nord',
        'Littoral', 'Nord', 'Nord-Ouest', 'Ouest',
        'Sud', 'Sud-Ouest'
    ];
    
    regionalGrid.innerHTML = regions.map(region => {
        // Pick random leader from top 3 candidates
        const leader = resultsData.length > 0 ? resultsData[Math.floor(Math.random() * Math.min(3, resultsData.length))] : null;
        const percentage = (Math.random() * 20 + 25).toFixed(1);
        const progress = Math.floor(Math.random() * 30 + 70);
        
        return `
            <div class="region-card">
                <div class="region-header-card">
                    <h4 class="region-name">${region}</h4>
                    <span class="region-progress">${progress}% traités</span>
                </div>
                <div class="region-leader">
                    <img src="${leader.photo}" alt="${leader.name}">
                    <span>${leader.name}</span>
                </div>
                <div class="region-percentage">${percentage}%</div>
            </div>
        `;
    }).join('');
}

function startLiveFeed() {
    const liveFeed = document.getElementById('liveFeed');
    if (!liveFeed) return;
    
    const feedItems = [
        'Forte participation dans les grandes villes',
        'Résultats serrés dans plusieurs régions',
        'Taux de participation en augmentation constante',
        'Première tendance confirmée par les instituts de sondage',
        'Record de participation des jeunes électeurs',
        'Système de vote électronique sans incident technique',
        'Validation des résultats en cours par la commission électorale'
    ];
    
    let feedIndex = 0;
    
    function addFeedItem() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const feedItem = document.createElement('div');
        feedItem.className = 'feed-item';
        feedItem.innerHTML = `
            <div class="feed-time">${timeString}</div>
            <div class="feed-content">
                <p class="feed-text">
                    <span class="feed-highlight">INFO:</span> 
                    ${feedItems[feedIndex % feedItems.length]}
                </p>
            </div>
        `;
        
        // Add animation
        feedItem.style.opacity = '0';
        feedItem.style.transform = 'translateY(20px)';
        
        liveFeed.insertBefore(feedItem, liveFeed.firstChild);
        
        // Animate in
        setTimeout(() => {
            feedItem.style.transition = 'all 0.3s ease';
            feedItem.style.opacity = '1';
            feedItem.style.transform = 'translateY(0)';
        }, 10);
        
        // Remove old items (keep max 10)
        const items = liveFeed.querySelectorAll('.feed-item');
        if (items.length > 10) {
            items[items.length - 1].remove();
        }
        
        feedIndex++;
    }
    
    // Add initial items
    for (let i = 0; i < 5; i++) {
        setTimeout(() => addFeedItem(), i * 1000);
    }
    
    // Continue adding items
    setInterval(addFeedItem, 45000); // Every 45 seconds
}

function updateStatistics() {
    const totalVotesElement = document.getElementById('totalVotes');
    const turnoutRateElement = document.getElementById('turnoutRate');
    const processedBureauElement = document.getElementById('processedBureau');
    
    const totalVotes = resultsData.reduce((sum, candidate) => sum + candidate.votes, 0);
    const registeredVoters = 36900000; // Example total
    const turnoutRate = (totalVotes / registeredVoters * 100).toFixed(1);
    const processedBureau = Math.floor(Math.random() * 1000 + 8000);
    
    if (totalVotesElement) {
        animateNumber(totalVotesElement, totalVotes);
    }
    
    if (turnoutRateElement) {
        turnoutRateElement.textContent = `${turnoutRate}%`;
    }
    
    if (processedBureauElement) {
        processedBureauElement.textContent = processedBureau.toLocaleString('fr-FR');
    }
}

function animateNumber(element, targetValue) {
    const startValue = 0;
    const duration = 2000;
    const increment = targetValue / (duration / 16);
    let currentValue = startValue;
    
    const timer = setInterval(() => {
        currentValue += increment;
        
        if (currentValue >= targetValue) {
            currentValue = targetValue;
            clearInterval(timer);
        }
        
        element.textContent = Math.floor(currentValue).toLocaleString('fr-FR');
    }, 16);
}

async function loadLiveStatsFromServer() {
    await loadResultsData(); // Réutilise la fonction principale pour recharger les données
    
    // Mettre à jour les composants UI
    updateChartsData();
    populateResultsTable();
    updateStatistics();
    updateLastUpdateTime();

    console.log('Statistiques en direct chargées et interface mise à jour');
}

function startLiveUpdates() {
    // Rafraîchir toutes les 30 secondes pour un effet plus "direct"
    liveUpdateInterval = setInterval(loadLiveStatsFromServer, 30000); 
}

function updateChartsData() {
    // Mettre à jour le graphique en camembert/barres
    if (charts.votesChart && resultsData) {
        charts.votesChart.data.labels = resultsData.map(c => c.name);
        charts.votesChart.data.datasets[0].data = resultsData.map(c => c.percentage);
        charts.votesChart.update('none'); // 'none' pour une mise à jour sans animation
    }
    if (charts.timelineChart) {
        fetch('http://localhost:5000/api/vote/stats', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('session_token') || ''}` }
        })
        .then(res => res.json())
        .then(stats => {
            if (stats.votes_par_heure) {
                charts.timelineChart.data.labels = stats.votes_par_heure.map(item => `${item.heure}h`);
                charts.timelineChart.data.datasets[0].data = stats.votes_par_heure.map(item => item.votes);
                charts.timelineChart.update('none');
            }
        }).catch(err => console.error("Erreur de mise à jour de la timeline :", err));
    }
}


function updateLastUpdateTime() {
    const lastUpdateElement = document.getElementById('lastUpdate');
    if (lastUpdateElement) {
        lastUpdateElement.textContent = new Date().toLocaleString('fr-FR');
    }
}

function initializeExportFunctions() {
    const exportCSV = document.getElementById('exportCSV');
    const exportPDF = document.getElementById('exportPDF');
    
    if (exportCSV) {
        exportCSV.addEventListener('click', exportToCSV);
    }
    
    if (exportPDF) {
        exportPDF.addEventListener('click', exportToPDF);
    }
}

function exportToCSV() {
    const csvContent = [
        ['Position', 'Candidat', 'Parti', 'Votes', 'Pourcentage'],
        ...resultsData.map((candidate, index) => [
            index + 1,
            candidate.name,
            candidate.party,
            candidate.votes,
            candidate.percentage.toFixed(2) + '%'
        ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resultats-election-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    window.VoteSecure.showNotification('Résultats exportés en CSV', 'success');
}

function exportToPDF() {
    // This would require a PDF library like jsPDF
    // For now, we'll create a printable version
    const printWindow = window.open('', '_blank');
    const printContent = generatePrintableResults();
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
    
    window.VoteSecure.showNotification('Version imprimable générée', 'success');
}

function generatePrintableResults() {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Résultats Élection Présidentielle 2024</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .results-table { width: 100%; border-collapse: collapse; }
                .results-table th, .results-table td { 
                    border: 1px solid #ddd; 
                    padding: 12px; 
                    text-align: left; 
                }
                .results-table th { background-color: #f5f5f5; }
                .footer { margin-top: 30px; text-align: center; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Résultats Élection Présidentielle 2024</h1>
                <p>Générés le ${new Date().toLocaleString('fr-FR')}</p>
            </div>
            
            <table class="results-table">
                <thead>
                    <tr>
                        <th>Position</th>
                        <th>Candidat</th>
                        <th>Parti</th>
                        <th>Votes</th>
                        <th>Pourcentage</th>
                    </tr>
                </thead>
                <tbody>
                    ${resultsData.map((candidate, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${candidate.name}</td>
                            <td>${candidate.party}</td>
                            <td>${candidate.votes.toLocaleString('fr-FR')}</td>
                            <td>${candidate.percentage.toFixed(2)}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="footer">
                <p>Document généré par VoteSecure - Système de Vote Électronique Sécurisé</p>
            </div>
        </body>
        </html>
    `;
}

// Cleanup function
window.addEventListener('beforeunload', function() {
    if (liveUpdateInterval) {
        clearInterval(liveUpdateInterval);
    }
});

// Export results functions
window.ResultsModule = {
    loadResultsData,
    updateChartsData,
    exportToCSV,
    exportToPDF
};
