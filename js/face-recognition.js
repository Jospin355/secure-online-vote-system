
// Face Recognition JavaScript
class FaceRecognitionSystem {
    constructor() {
        this.isActive = false;
        this.detectionInterval = null;
        this.recognitionAttempts = 0;
        this.maxAttempts = 5;
        this.faceOverlay = null;
    }
    
    initialize(videoContainer) {
        console.log('Initializing face recognition system');
        
        if (videoContainer) {
            this.faceOverlay = new window.CameraModule.FaceOverlay(videoContainer);
        }
        
        return true;
    }
    
    async startRecognition(userId = null) {
        if (this.isActive) {
            console.log('Recognition already active');
            return;
        }
        
        this.isActive = true;
        this.recognitionAttempts = 0;
        
        console.log('Starting face recognition...');
        
        // Initialize camera if not already done
        if (!window.cameraManager.isInitialized) {
            const cameraReady = await window.cameraManager.initialize();
            if (!cameraReady) {
                this.stopRecognition();
                return false;
            }
        }
        
        // Start detection loop
        this.detectionInterval = window.cameraManager.startDetection(
            (frameData) => this.processFrame(frameData, userId),
            500 // Check every 500ms
        );
        
        // Show searching message
        if (this.faceOverlay) {
            this.faceOverlay.showMessage('Recherche de visage...', 'info');
        }
        
        return true;
    }
    
    async processFrame(frameData, userId) {
        if (!this.isActive) return;
        
        try {
            // Step 1: Detect face
            const detection = await window.cameraManager.detectFace(frameData);
            
            if (detection.detected) {
                console.log('Face detected with confidence:', detection.confidence);
                
                // Draw face box
                if (this.faceOverlay && detection.bounds) {
                    this.faceOverlay.drawFaceBox(detection.bounds, 'detected');
                }
                
                // Step 2: Recognize face if detection confidence is high enough
                if (detection.confidence > 0.7) {
                    await this.attemptRecognition(frameData, userId, detection.bounds);
                }
            } else {
                // Clear overlay if no face detected
                if (this.faceOverlay) {
                    this.faceOverlay.clear();
                    this.faceOverlay.showMessage('Positionnez votre visage dans le cadre', 'info');
                }
            }
        } catch (error) {
            console.error('Error processing frame:', error);
        }
    }
    

async attemptRecognition(frameData, userId, bounds) {
    this.recognitionAttempts++;
    console.log(`Tentative de reconnaissance ${this.recognitionAttempts}/${this.maxAttempts}`);

    if (this.faceOverlay && bounds) {
        this.faceOverlay.drawFaceBox(bounds, 'searching');
        this.faceOverlay.showMessage('Reconnaissance en cours...', 'info');
    }

    try {
        const imageBase64 = frameData;
        const sessionToken = localStorage.getItem('session_token');

        const response = await fetch('http://127.0.0.1:5000/api/face/recognize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ image: imageBase64, session_token: sessionToken })
        });

        const recognitionResult = await response.json();

        if (recognitionResult.recognized && recognitionResult.authentication_complete) {
            console.log('Reconnaissance réussie :', recognitionResult);
            this.onRecognitionSuccess(recognitionResult, bounds);
        } else if (
            recognitionResult.recognized &&
            recognitionResult.authentication_complete === false
        ) {
            console.warn("Visage reconnu mais ne correspond pas à l'utilisateur connecté.");
            this.onRecognitionFailed(
                recognitionResult.message || 'Le visage reconnu ne correspond pas à la session.',
                bounds
            );
        } else if (this.recognitionAttempts >= this.maxAttempts) {
            console.log('Nombre maximum de tentatives atteint.');
            const errorMessage = recognitionResult.message || 'La reconnaissance a échoué.';
            this.onRecognitionFailed(errorMessage, bounds);
        }

        // Sinon (recognized: false et pas encore max), on attend la prochaine frame
    } catch (error) {
        console.error('Erreur lors de l\'appel API de reconnaissance :', error);
        this.onRecognitionFailed("Erreur de communication avec le serveur.", bounds);
    }
}


    
    // Remplacez votre onRecognitionSuccess par celle-ci
onRecognitionSuccess(recognitionData, bounds) {
    // Arrête la boucle de reconnaissance (plus de détection/tentative)
    this.stopRecognition();

    // CORRECTION : La fonction reçoit directement les données de l'API, pas de nouvel appel.
    console.log("Traitement de la reconnaissance réussie :", recognitionData);

    // Mettre à jour l'overlay pour montrer le succès
    if (this.faceOverlay && bounds) {
        this.faceOverlay.drawFaceBox(bounds, 'recognized');
        this.faceOverlay.showMessage('Visage reconnu !', 'success');
    }

    // Mettre à jour le reste de l'interface utilisateur
    const resultDiv = document.getElementById('recognitionResult');
    const proceedBtn = document.getElementById('proceedToVote');
    const startBtn = document.getElementById('startRecognition');
    const recognizedUser = document.getElementById('recognizedUser');

    if (resultDiv) resultDiv.style.display = 'block';
    if (recognizedUser) {
        // Affiche l'ID de l'utilisateur reconnu par le backend
        recognizedUser.textContent = `Utilisateur ID: ${recognitionData.user_id}`;
    }

    if (startBtn) startBtn.style.display = 'none';
    if (proceedBtn) proceedBtn.style.display = 'inline-flex';

    if (window.VoteSecure) {
        window.VoteSecure.showNotification(
            recognitionData.message || 'Reconnaissance réussie !',
            'success'
        );
    }
    
    // NOTE : Le code pour finaliser la connexion (l'appel à /complete-login)
    // devrait être ici ou dans le bouton "Procéder au vote" pour une sécurité maximale.
    // Pour l'instant, on se contente d'afficher le bouton.
}

    
    // Vous pouvez remplacer votre onRecognitionFailed par cette version légèrement améliorée
onRecognitionFailed(errorMessage = null, bounds = null) {
    this.stopRecognition();

    const message = errorMessage || 'Reconnaissance échouée. Veuillez réessayer.';
    
    // CORRECTION : Affiche un cadre d'erreur sur le visage si les coordonnées sont fournies
    if (this.faceOverlay && bounds) {
        this.faceOverlay.drawFaceBox(bounds, 'error');
        this.faceOverlay.showMessage(message, 'error');
    }

    if (window.VoteSecure) {
        window.VoteSecure.showNotification(message, 'error', 8000);
    }

    // Réactiver le bouton pour une nouvelle tentative manuelle
    const startBtn = document.getElementById('startRecognition');
    if (startBtn) {
        startBtn.disabled = false;
        // On pourrait vouloir le réafficher s'il a été masqué
        // startBtn.style.display = 'inline-flex';
    }
}
    
    stopRecognition() {
    console.log('Stopping face recognition');
    
    this.isActive = false;
    
    // Arrêter l'intervalle de détection s'il existe
    if (this.detectionInterval) {
        window.cameraManager.stopDetection(this.detectionInterval);
        this.detectionInterval = null;
    }
    
    // Effacer le cadre / overlay du visage détecté si présent
    if (this.faceOverlay) {
        this.faceOverlay.clear();
    }
    
    // Optionnel : remettre le bouton démarrer visible et activé (utile pour UX)
    const startBtn = document.getElementById('startRecognition');
    if (startBtn) {
        startBtn.style.display = 'inline-flex';
        startBtn.disabled = false;
    }
    
    // Optionnel : masquer les messages de résultats s'ils sont visibles
    const resultDiv = document.getElementById('recognitionResult');
    if (resultDiv) {
        resultDiv.style.display = 'none';
    }
}

    
    reset() {
        this.stopRecognition();
        this.recognitionAttempts = 0;
        
        // Reset UI elements
        const resultDiv = document.getElementById('recognitionResult');
        const proceedBtn = document.getElementById('proceedToVote');
        const startBtn = document.getElementById('startRecognition');
        
        if (resultDiv) {
            resultDiv.style.display = 'none';
            resultDiv.textContent = ''; // Optionnel : vider le contenu
        }
        
        if (proceedBtn) {
            proceedBtn.style.display = 'none';
            proceedBtn.disabled = true; // Optionnel pour éviter clics fantômes
        }
        
        if (startBtn) {
            startBtn.style.display = 'inline-flex';
            startBtn.disabled = false;
        }
    }

}

// Initialize face recognition system
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('login.html')) {
        // Crée l'instance de ton système de reconnaissance faciale
        window.faceRecognitionSystem = new FaceRecognitionSystem();
        
        // Initialise le système quand le container caméra est prêt
        const cameraContainer = document.querySelector('.camera-container');
        if (cameraContainer) {
            window.faceRecognitionSystem.initialize(cameraContainer);
        }
        
        // Fonction globale pour démarrer la reconnaissance faciale
        window.startFaceRecognition = function() {
            const currentUser = window.VoteSecure.getFromStorage('registrationData');
            const userId = currentUser ? currentUser.voterID : null;
            
            if (!userId) {
                window.VoteSecure.showNotification('Utilisateur non identifié. Veuillez vous connecter.', 'error');
                return;
            }

            // Lancer la reconnaissance avec l'ID électeur
            window.faceRecognitionSystem.startRecognition(userId);
        };
    }
});


// Export face recognition functionality
window.FaceRecognitionModule = {
    FaceRecognitionSystem
};
