// Candidates management JavaScript
class CandidatesManager {
    constructor() {
        this.candidates = [];
        this.loadCandidatesData();
    }

    loadCandidatesData() {
        fetch('http://localhost:5000/api/candidates', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('session_token') || ''}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Erreur lors du chargement des candidats depuis le backend');
            }
            return response.json();
        })
        .then(data => {
            if (!Array.isArray(data)) {
                 console.error("Ce n’est pas un tableau !");
                throw new Error("ln");
            }

            this.candidates = data.map(item => ({
                id: item.id,
                name: item.nom || "Nom inconnu",
                party: item.parti || "Parti inconnu",
                description: item.description || '',
                votes: 0,
                percentage: 0
            }));

            console.log(" Candidats chargés :", this.candidates);

            document.dispatchEvent(new CustomEvent('candidatesLoaded', {
                detail: { candidates: this.candidates }
            }));
        })
        .catch(error => {
            console.error(" Erreur de récupération des candidats :", error.message);
        });
    }

    getCandidateById(id) {
        return this.candidates.find(candidate => candidate.id === id);
    }

    getAllCandidates() {
        return this.candidates;
    }

    getSortedByVotes() {
        return [...this.candidates].sort((a, b) => b.votes - a.votes);
    }

    updateVotes(candidateId, newVotes) {
        const candidate = this.getCandidateById(candidateId);
        if (candidate) {
            candidate.votes = newVotes;
            this.recalculatePercentages();
        }
    }

    recalculatePercentages() {
        const totalVotes = this.candidates.reduce((sum, candidate) => sum + candidate.votes, 0);
        this.candidates.forEach(candidate => {
            candidate.percentage = totalVotes > 0 ? (candidate.votes / totalVotes * 100) : 0;
        });
    }

    renderCandidateCard(candidate, container) {
        const cardHTML = `
            <div class="candidate-card" data-candidate-id="${candidate.id}">
                <div class="candidate-info">
                    <h4 class="candidate-name">${candidate.name}</h4>
                    <p class="candidate-party">${candidate.party}</p>
                    <p class="candidate-description">${candidate.description}</p>
                    <button class="candidate-select">
                        <i class="fas fa-vote-yea"></i>
                        Sélectionner
                    </button>
                </div>
            </div>
        `;

        if (container) {
            container.innerHTML += cardHTML;
        }

        return cardHTML;
    }

    renderResultsRow(candidate, position) {
        const positionClass = position === 1 ? 'first' : position === 2 ? 'second' : position === 3 ? 'third' : 'other';
        return `
            <tr>
                <td>
                    <div class="position-badge ${positionClass}">${position}</div>
                </td>
                <td>
                    <div class="candidate-info-small">
                        <div class="candidate-name-small">${candidate.name}</div>
                        <div class="candidate-party-small">${candidate.party}</div>
                    </div>
                </td>
                <td>${candidate.party}</td>
                <td><span class="votes-number">${candidate.votes.toLocaleString('fr-FR')}</span></td>
                <td>
                    <div class="percentage-bar">
                        <span class="percentage-text">${candidate.percentage.toFixed(1)}%</span>
                        <div class="percentage-visual">
                            <div class="percentage-fill" style="width: ${candidate.percentage}%"></div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }
}

// Instance globale
window.candidatesManager = new CandidatesManager();

// Export du module
window.CandidatesModule = {
    CandidatesManager
};

