
// Vote JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initializeVotePage();
});

let selectedCandidate = null;
let hasVoted = false;

function initializeVotePage() {
    console.log('Initializing vote page');
    
    // Check if user is authenticated
    checkAuthentication();
    
    // Load candidates
    loadCandidates();
    
    // Initialize voting functionality
    initializeVotingSystem();
    
    // Initialize modals
    initializeModals();
    
    // Update timer
    startElectionTimer();
    
    // Initialize logout
    initializeLogout();
}

function checkAuthentication() {
    const currentUser = window.VoteSecure.getFromStorage('currentUser');
    
    if (!currentUser || !currentUser.authenticated) {
        window.VoteSecure.showNotification('Vous devez vous connecter pour accéder à cette page', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }
    
    // Check if already voted
    const voteRecord = window.VoteSecure.getFromStorage('voteRecord');
    if (voteRecord && voteRecord.voted) {
        hasVoted = true;
        showVoteCompletedMessage();
        return;
    }
    
    // Update user display
    const userName = document.getElementById('userName');
    if (userName && currentUser.firstName) {
        userName.textContent = `${currentUser.firstName} ${currentUser.lastName}`;
    }
    
    console.log('User authenticated:', currentUser.voterID);
}

function showVoteCompletedMessage() {
    const candidatesSection = document.querySelector('.candidates-section');
    if (candidatesSection) {
        candidatesSection.innerHTML = `
            <div class="vote-completed">
                <div class="completion-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h3>Vote Enregistré</h3>
                <p>Vous avez déjà participé à cette élection. Merci pour votre participation !</p>
                <a href="results.html" class="btn btn-primary">
                    <i class="fas fa-chart-bar"></i>
                    Voir les Résultats
                </a>
            </div>
        `;
    }
}

function loadCandidates() {
    if (hasVoted) return;

    console.log('Loading candidates from backend...');

    fetch('http://localhost:5000/api/candidates', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('session_token') || ''}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Erreur lors du chargement des candidats');
        }
        return response.json();
    })
    .then(data => {
        console.log('Données candidates reçues :', data);

        if (Array.isArray(data)) {
            renderCandidates(data);
        } else {
            window.VoteSecure.showNotification('Erreur : données des candidats invalides', 'error');
        }
    })
    .catch(error => {
        console.error('Erreur chargement candidats:', error);
        window.VoteSecure.showNotification('Erreur serveur lors du chargement des candidats', 'error');
    });
}

function renderCandidates(candidates) {
    const candidatesGrid = document.getElementById('candidatesGrid');
    if (!candidatesGrid) return;

    const candidatePhotos = [
        "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Issa_Tchiroma_Bakari.jpg/250px-Issa_Tchiroma_Bakari.jpg",
        "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Josh-Osih_02.png/330px-Josh-Osih_02.png",
        "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Maurice_Kamto.jpg/250px-Maurice_Kamto.jpg",
        "https://media.gettyimages.com/id/1242119374/fr/photo/cameroons-president-paul-biya-waits-for-the-arrival-of-frances-president-emmanuel-macron-for.jpg?s=612x612&w=0&k=20&c=_PxxgwEQaIQRG9k3iaoU7MnJDCLtVbI3IcuAo_2gyK8="

    ];

    candidatesGrid.innerHTML = candidates.map((candidate, index) => {
        const photoURL = candidatePhotos[index % candidatePhotos.length]; // cycle des images
        return `
            <div class="candidate-card" data-candidate-id="${candidate.id}">
                <img src="${photoURL}" alt="${candidate.nom}" class="candidate-photo">
                <div class="candidate-info">
                    <h4 class="candidate-name">${candidate.nom}</h4>
                    <p class="candidate-party">${candidate.parti}</p>
                    <p class="candidate-description">${candidate.description}</p>
                    <button class="candidate-select">
                        <i class="fas fa-vote-yea"></i>
                        Sélectionner
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Ajout des gestionnaires d'événements sur chaque carte candidat
    document.querySelectorAll('.candidate-card').forEach(card => {
        card.addEventListener('click', function() {
            selectCandidate(this);
        });
    });

    console.log('Candidates loaded and rendered successfully');
}


function selectCandidate(candidateCard) {
    const candidateId = parseInt(candidateCard.dataset.candidateId);
    
    // Remove previous selection
    document.querySelectorAll('.candidate-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Select current candidate
    candidateCard.classList.add('selected');
    selectedCandidate = {
        id: candidateId,
        name: candidateCard.querySelector('.candidate-name').textContent,
        party: candidateCard.querySelector('.candidate-party').textContent,
        photo: candidateCard.querySelector('.candidate-photo').src
    };
    
    console.log('Candidate selected:', selectedCandidate);
    
    // Show confirmation modal after a short delay
    setTimeout(() => {
        showVoteConfirmation();
    }, 500);
}

function initializeVotingSystem() {
    // This function handles the voting workflow
    console.log('Voting system initialized');
}

function initializeModals() {
    const voteModal = document.getElementById('voteModal');
    const successModal = document.getElementById('successModal');
    const closeModal = document.getElementById('closeModal');
    const cancelVote = document.getElementById('cancelVote');
    const confirmVote = document.getElementById('confirmVote');
    const downloadReceipt = document.getElementById('downloadReceipt');
    
    // Close modal handlers
    if (closeModal) {
        closeModal.addEventListener('click', hideVoteConfirmation);
    }
    
    if (cancelVote) {
        cancelVote.addEventListener('click', hideVoteConfirmation);
    }
    
    // Confirm vote handler
    if (confirmVote) {
        confirmVote.addEventListener('click', submitVote);
    }
    
    // Download receipt handler
    if (downloadReceipt) {
        downloadReceipt.addEventListener('click', function() {
            generateVoteReceipt();
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === voteModal) {
            hideVoteConfirmation();
        }
        if (event.target === successModal) {
            hideSuccessModal();
        }
    });
}

function showVoteConfirmation() {
    if (!selectedCandidate) return;
    
    const modal = document.getElementById('voteModal');
    const confirmCandidatePhoto = document.getElementById('confirmCandidatePhoto');
    const confirmCandidateName = document.getElementById('confirmCandidateName');
    const confirmCandidateParty = document.getElementById('confirmCandidateParty');
    
    // Update modal content
    if (confirmCandidatePhoto) {
        confirmCandidatePhoto.src = selectedCandidate.photo;
        confirmCandidatePhoto.alt = selectedCandidate.name;
    }
    
    if (confirmCandidateName) {
        confirmCandidateName.textContent = selectedCandidate.name;
    }
    
    if (confirmCandidateParty) {
        confirmCandidateParty.textContent = selectedCandidate.party;
    }
    
    // Show modal
    if (modal) {
        modal.classList.add('active');
    }
    
    console.log('Vote confirmation modal shown');
}

function hideVoteConfirmation() {
    const modal = document.getElementById('voteModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function submitVote() {
    if (!selectedCandidate) return;
    
    const confirmBtn = document.getElementById('confirmVote');
    window.VoteSecure.showLoading(confirmBtn);
    
    console.log('Submitting vote for:', selectedCandidate);
    
    // Préparer les données à envoyer au backend
    const votePayload = {
        candidat_id: selectedCandidate.id,
        session_token: localStorage.getItem('session_token')
    };
    
    fetch('http://localhost:5000/api/vote/submit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('session_token')}`
        },
        body: JSON.stringify(votePayload)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Erreur lors de la soumission du vote');
        }
        return response.json();
    })
    .then(data => {
        window.VoteSecure.hideLoading(confirmBtn);
        
        if (data.success) {
            // Le backend doit renvoyer un id transaction, date, etc.
            const voteRecord = {
                voted: true,
                candidateId: selectedCandidate.id,
                candidateName: selectedCandidate.name,
                candidateParty: selectedCandidate.party,
                transactionId: data.transaction_id || ('VT-' + new Date().getFullYear() + '-' + Math.random().toString(36).substr(2, 9)),
                voteTime: data.vote_time || new Date().toISOString(),
                voterID: window.VoteSecure.getFromStorage('currentUser').voterID
            };
            
            window.VoteSecure.saveToStorage('voteRecord', voteRecord);
            
            // Fermer modal confirmation
            hideVoteConfirmation();
            
            // Afficher modal succès
            showVoteSuccess(voteRecord);
            
            hasVoted = true;
            
            window.VoteSecure.showNotification('Vote enregistré avec succès !', 'success');
        } else {
            window.VoteSecure.showNotification(data.error || 'Erreur lors de l\'enregistrement du vote', 'error');
        }
    })
    .catch(error => {
        console.error('Vote submission error:', error);
        window.VoteSecure.hideLoading(confirmBtn);
        window.VoteSecure.showNotification('Erreur serveur lors de la soumission du vote', 'error');
    });
}

function showVoteSuccess(voteRecord) {
    const modal = document.getElementById('successModal');
    const transactionId = document.getElementById('transactionId');
    const voteTimestamp = document.getElementById('voteTimestamp');
    const votedCandidate = document.getElementById('votedCandidate');
    
    // Update success modal content
    if (transactionId) {
        transactionId.textContent = voteRecord.transactionId;
    }
    
    if (voteTimestamp) {
        const date = new Date(voteRecord.voteTime);
        voteTimestamp.textContent = date.toLocaleString('fr-FR');
    }
    
    if (votedCandidate) {
        votedCandidate.textContent = `${voteRecord.candidateName} (${voteRecord.candidateParty})`;
    }
    
    // Show modal
    if (modal) {
        modal.classList.add('active');
    }
    
    console.log('Vote success modal shown');
}

function hideSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function generateVoteReceipt() {
    const voteRecord = window.VoteSecure.getFromStorage('voteRecord');
    if (!voteRecord) return;
    
    const currentUser = window.VoteSecure.getFromStorage('currentUser');
    
    const receiptContent = `
        REÇU DE VOTE ÉLECTRONIQUE
        ========================
        
        Élection Présidentielle 2024
        
        Détails du Vote:
        ---------------
        ID Transaction: ${voteRecord.transactionId}
        Date et Heure: ${new Date(voteRecord.voteTime).toLocaleString('fr-FR')}
        Candidat Sélectionné: ${voteRecord.candidateName}
        Parti: ${voteRecord.candidateParty}
        
        Électeur:
        ---------
        ID Électeur: ${voteRecord.voterID}
        Nom: ${currentUser ? currentUser.firstName + ' ' + currentUser.lastName : 'N/A'}
        
        Sécurité:
        ---------
        ✓ Identité vérifiée
        ✓ OTP confirmé
        ✓ Reconnaissance faciale validée
        ✓ Vote chiffré et sécurisé
        
        Ce reçu certifie que votre vote a été enregistré
        de manière sécurisée et anonyme dans le système
        VoteSecure.
        
        Généré le: ${new Date().toLocaleString('fr-FR')}
    `;
    
    // Create and download file
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recu-vote-${voteRecord.transactionId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    window.VoteSecure.showNotification('Reçu téléchargé avec succès', 'success');
}

function startElectionTimer() {
    const timerElement = document.getElementById('timeRemaining');
    if (!timerElement) return;
    
    // Election ends in 24 hours (for demo)
    const endTime = new Date();
    endTime.setHours(endTime.getHours() + 24);
    
    function updateTimer() {
        const now = new Date();
        const timeLeft = endTime - now;
        
        if (timeLeft <= 0) {
            timerElement.textContent = 'Élection terminée';
            return;
        }
        
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        
        timerElement.textContent = `${hours}h ${minutes}m restantes`;
    }
    
    updateTimer();
    setInterval(updateTimer, 60000); // Update every minute
}

function initializeLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            // Clear user session
            window.VoteSecure.removeFromStorage('currentUser');
            
            window.VoteSecure.showNotification('Déconnexion réussie', 'success');
            
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 1000);
        });
    }
}

// Export vote functions
window.VoteModule = {
    selectCandidate,
    submitVote,
    generateVoteReceipt
};
