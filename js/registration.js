
// Registration JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initializeRegistration();
});

let currentStep = 1;
let registrationData = {};
let otpTimer = null;
let captureCount = 0;
const maxCaptures = 10;

function initializeRegistration() {
    console.log('Initializing registration process');
    
    // Initialize form handlers
    initializeFormValidation();
    initializeStepNavigation();
    initializeOTPHandlers();
    initializeFaceCapture();
    
    // Set initial step
    showStep(1);
}

function initializeFormValidation() {
    const form = document.getElementById('registrationForm');
    if (!form) return;
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        handleRegistrationSubmit();
    });
    
    // Real-time validation
    const inputs = form.querySelectorAll('input[required]');
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateField(this);
        });
        
        input.addEventListener('input', function() {
            if (this.classList.contains('error')) {
                validateField(this);
            }
        });
    });
}

function validateField(field) {
    const value = field.value.trim();
    const fieldName = field.name;
    let isValid = true;
    let message = '';
    
    // Required field validation
    if (field.hasAttribute('required') && !value) {
        isValid = false;
        message = 'Ce champ est obligatoire';
    }
    
    // Specific field validations
    switch (fieldName) {
        case 'voterID':
            if (value && value.length < 8) {
                isValid = false;
                message = 'L\'ID électeur doit contenir au moins 8 caractères';
            }
            break;
            
        case 'aadharID':
            if (value && !/^\d{12}$/.test(value.replace(/\s/g, ''))) {
                isValid = false;
                message = 'L\'ID Aadhar doit contenir 12 chiffres';
            }
            break;
            
        case 'phone':
            if (value && !window.VoteSecure.validatePhone(value)) {
                isValid = false;
                message = 'Numéro de téléphone invalide';
            }
            break;
            
        case 'email':
            if (value && !window.VoteSecure.validateEmail(value)) {
                isValid = false;
                message = 'Adresse email invalide';
            }
            break;
    }
    
    // Update field appearance
    if (isValid) {
        window.VoteSecure.setFieldSuccess(field);
    } else {
        window.VoteSecure.setFieldError(field, message);
    }
    
    return isValid;
}

function handleRegistrationSubmit() {
    const form = document.getElementById('registrationForm');
    const submitBtn = form.querySelector('button[type="submit"]');
    
    // Valider le formulaire (votre logique de validation est bonne)
    let isFormValid = Array.from(form.querySelectorAll('input[required]')).every(validateField);
    if (!document.getElementById('terms').checked) {
        window.VoteSecure.showNotification("Vous devez accepter les conditions", 'error');
        isFormValid = false;
    }
    if (!isFormValid) {
        window.VoteSecure.showNotification('Veuillez corriger les erreurs', 'error');
        return;
    }
    
    window.VoteSecure.showLoading(submitBtn);
    
    const formData = new FormData(form);
    // Stockage temporaire des données du formulaire
    registrationData = Object.fromEntries(formData.entries());
    
    // CORRECTION : Remplacement de la simulation par un appel API réel.
    fetch('http://127.0.0.1:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            identifiant_electeur: registrationData.voterID,
            identifiant_aadhar: registrationData.aadharID,
            numero_telephone: registrationData.phone
        })
    })
    .then(response => response.json())
    .then(data => {
        window.VoteSecure.hideLoading(submitBtn);

        if (data.next_step === 'verify_otp') {
            // CORRECTION : Stockage des informations pour les étapes suivantes.
            localStorage.setItem('registration_electeur_id', data.electeur_id);
            localStorage.setItem('registration_phone_number', registrationData.phone);
            
            // Mise à jour de l'UI pour l'étape OTP.
            const phoneDisplay = document.getElementById('phoneDisplay');
            if (phoneDisplay) phoneDisplay.textContent = registrationData.phone;

            showStep(2);
            startOTPTimer(); // Démarrer le minuteur après la confirmation du serveur.
            window.VoteSecure.showNotification('Inscription réussie. Code OTP envoyé.', 'success');
        } else {
            window.VoteSecure.showNotification(data.error || "Erreur lors de l'inscription.", 'error');
        }
    })
    .catch(error => {
        window.VoteSecure.hideLoading(submitBtn);
        window.VoteSecure.showNotification("Erreur de communication avec le serveur.", 'error');
        console.error("Erreur d'inscription:", error);
    });
}

function initializeStepNavigation() {
    const backButtons = document.querySelectorAll('.btn-back');
    
    backButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (currentStep > 1) {
                showStep(currentStep - 1);
            }
        });
    });
}

function showStep(step) {
    console.log(`Showing step ${step}`);
    
    // Hide all steps
    document.querySelectorAll('.step-form').forEach(form => {
        form.classList.remove('active');
    });
    
    // Show current step
    const currentForm = document.querySelector(getStepSelector(step));
    if (currentForm) {
        currentForm.classList.add('active');
    }
    
    // Update progress indicator
    updateProgressIndicator(step);
    
    currentStep = step;
    
    // Initialize step-specific functionality
    switch (step) {
        case 2:
            initializeOTPInputs();
            break;
        case 3:
            initializeCamera();
            break;
    }
}

function getStepSelector(step) {
    const selectors = {
        1: '#registrationForm',
        2: '#otpForm',
        3: '#faceRecognitionForm',
        4: '#successMessage'
    };
    return selectors[step];
}

function updateProgressIndicator(step) {
    document.querySelectorAll('.progress-step').forEach((stepElement, index) => {
        const stepNumber = index + 1;
        
        if (stepNumber < step) {
            stepElement.classList.add('completed');
            stepElement.classList.remove('active');
        } else if (stepNumber === step) {
            stepElement.classList.add('active');
            stepElement.classList.remove('completed');
        } else {
            stepElement.classList.remove('active', 'completed');
        }
    });
}

function initializeOTPHandlers() {
    const otpInputs = document.querySelectorAll('.otp-input');
    const verifyBtn = document.getElementById('verifyOTP');
    const resendBtn = document.getElementById('resendOTP');
    
    if (verifyBtn) {
        verifyBtn.addEventListener('click', verifyOTP);
    }
    
    if (resendBtn) {
        resendBtn.addEventListener('click', function() {
            sendOTP();
            this.disabled = true;
            setTimeout(() => {
                this.disabled = false;
            }, 30000);
        });
    }
}

function initializeOTPInputs() {
    const otpInputs = document.querySelectorAll('.otp-input');
    
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', function(e) {
            const value = e.target.value;
            
            if (value.length === 1 && /^\d$/.test(value)) {
                this.classList.add('filled');
                
                // Move to next input
                if (index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }
            } else if (value.length === 0) {
                this.classList.remove('filled');
            } else {
                e.target.value = '';
            }
            
            // Auto-verify when all inputs are filled
            const allFilled = Array.from(otpInputs).every(inp => inp.value.length === 1);
            if (allFilled) {
                setTimeout(verifyOTP, 500);
            }
        });
        
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && this.value === '' && index > 0) {
                otpInputs[index - 1].focus();
                otpInputs[index - 1].value = '';
                otpInputs[index - 1].classList.remove('filled');
            }
        });
    });
    
    // Focus first input
    if (otpInputs.length > 0) {
        otpInputs[0].focus();
    }
}

function sendOTP() {
    console.log('Sending OTP...');
    
    // Simulate OTP sending
    const phoneNumber = registrationData.phone;
    const countryCode = registrationData.countryCode || '+33';
    const displayNumber = `${countryCode} ${phoneNumber}`;
    
    const phoneDisplay = document.getElementById('phoneDisplay');
    if (phoneDisplay) {
        phoneDisplay.textContent = displayNumber;
    }
    
    // Start timer
    startOTPTimer();
    
    // Store OTP (in real app, this would be generated server-side)
    window.currentOTP = '123456';
    
    console.log('OTP sent to:', displayNumber);
}

function startOTPTimer() {
    let timeLeft = 300; // 5 minutes
    const timerElement = document.getElementById('otpTimer');
    const resendBtn = document.getElementById('resendOTP');
    
    if (resendBtn) {
        resendBtn.disabled = true;
    }
    
    otpTimer = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        
        if (timerElement) {
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        if (timeLeft <= 0) {
            clearInterval(otpTimer);
            if (timerElement) {
                timerElement.textContent = '00:00';
            }
            if (resendBtn) {
                resendBtn.disabled = false;
            }
        }
        
        timeLeft--;
    }, 1000);
}

function verifyOTP() {
    const otpInputs = document.querySelectorAll('#otpForm .otp-input');
    const enteredOTP = Array.from(otpInputs).map(input => input.value).join('');
    const verifyBtn = document.getElementById('verifyOTP');
    
    if (enteredOTP.length !== 6) {
        showOTPFeedback('Veuillez saisir le code complet', 'error');
        return;
    }
    
    window.VoteSecure.showLoading(verifyBtn);

    // CORRECTION : Récupération du numéro stocké, car l'API en a besoin.
    const numero_telephone = localStorage.getItem('registration_phone_number');
    if (!numero_telephone) {
        window.VoteSecure.hideLoading(verifyBtn);
        showOTPFeedback('Session expirée. Veuillez recommencer.', 'error');
        showStep(1);
        return;
    }

    // CORRECTION : Remplacement de la simulation par l'appel API.
    fetch('http://127.0.0.1:5000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            numero_telephone: numero_telephone,
            otp_code: enteredOTP
        })
    })
    .then(response => response.json())
    .then(data => {
        window.VoteSecure.hideLoading(verifyBtn);

        // Le backend renvoie 'face_capture' pour le flux d'inscription.
        if (data.next_step === 'face_capture') {
            showOTPFeedback('Code vérifié avec succès', 'success');
            clearInterval(otpTimer);
            
            setTimeout(() => {
                showStep(3);
                window.VoteSecure.showNotification('OTP vérifié, procédez à la capture faciale.', 'success');
            }, 1000);
        } else {
            showOTPFeedback(data.error || 'Code incorrect', 'error');
            otpInputs.forEach(input => { input.value = ''; input.classList.remove('filled'); });
            otpInputs[0].focus();
        }
    })
    .catch(error => {
        window.VoteSecure.hideLoading(verifyBtn);
        showOTPFeedback('Erreur serveur.', 'error');
        console.error('Erreur de vérification OTP:', error);
    });
}

function showOTPFeedback(message, type) {
    const feedback = document.querySelector('.otp-feedback');
    if (feedback) {
        feedback.textContent = message;
        feedback.className = `otp-feedback ${type}`;
    }
}

function initializeFaceCapture() {
    const startBtn = document.getElementById('startCapture');
    const completeBtn = document.getElementById('completeRegistration');
    
    if (startBtn) {
        startBtn.addEventListener('click', startFaceCapture);
    }
    
    if (completeBtn) {
        completeBtn.addEventListener('click', completeRegistration);
    }
}

function initializeCamera() {
    const video = document.getElementById('video');
    const status = document.getElementById('cameraStatus');
    const statusIcon = document.getElementById('statusIcon');
    const statusText = document.getElementById('statusText');
    
    if (!video) return;
    
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(function(stream) {
            video.srcObject = stream;
            
            // Update status
            statusIcon.className = 'fas fa-circle ready';
            statusText.textContent = 'Caméra prête';
            
            console.log('Camera initialized successfully');
        })
        .catch(function(error) {
            console.error('Error accessing camera:', error);
            
            statusIcon.className = 'fas fa-circle error';
            statusText.textContent = 'Erreur d\'accès à la caméra';
            
            window.VoteSecure.showNotification('Impossible d\'accéder à la caméra', 'error');
        });
}

// Remplacez votre fonction startFaceCapture par cette version corrigée
// Remplacez votre fonction startFaceCapture par cette nouvelle version interactive
async function startFaceCapture() {
    const startBtn = document.getElementById('startCapture');
    const completeBtn = document.getElementById('completeRegistration');
    const progressBar = document.getElementById('captureProgress');
    const captureText = document.getElementById('captureText');
    const video = document.getElementById('video'); // L'élément vidéo pour le retour visuel

    const electeurId = localStorage.getItem('registration_electeur_id');
    if (!electeurId) {
        window.VoteSecure.showNotification('Session invalide. Veuillez recommencer.', 'error');
        showStep(1);
        return;
    }

    startBtn.disabled = true;
    window.VoteSecure.showLoading(startBtn);

    const validImages = [];
    let attempts = 0;

    // Boucle jusqu'à avoir 10 images valides
    while (validImages.length < maxCaptures && attempts < 30) { // On ajoute une sécurité de 30 tentatives max
        attempts++;
        captureText.textContent = `Recherche d'un visage... Tentative ${validImages.length + 1}/${maxCaptures}`;
        
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        const imageBase64 = canvas.toDataURL('image/jpeg').split(',')[1];

        try {
            // CORRECTION : On appelle la nouvelle route de test pour chaque image
            const detectResponse = await fetch('http://127.0.0.1:5000/api/face/detect-single', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: imageBase64 })
            });
            const detectionResult = await detectResponse.json();

            if (detectionResult.detected) {
                // Succès ! Le visage est détecté
                video.style.border = '3px solid #28a745'; // Bordure verte
                validImages.push(imageBase64); // On sauvegarde l'image valide

                // Mise à jour de la progression
                const progress = (validImages.length / maxCaptures) * 100;
                progressBar.style.width = `${progress}%`;
                captureText.textContent = `Visage détecté ! ${validImages.length}/${maxCaptures} photos valides.`;
                
                await new Promise(resolve => setTimeout(resolve, 500)); // Pause pour que l'utilisateur voie le succès
            } else {
                // Échec, le visage n'est pas détecté
                video.style.border = '3px solid #dc3545'; // Bordure rouge
                captureText.textContent = `Aucun visage détecté. Rapprochez-vous et regardez la caméra.`;
                await new Promise(resolve => setTimeout(resolve, 500)); // Pause pour que l'utilisateur lise le message
            }

        } catch (error) {
            console.error("Erreur lors de la détection en temps réel", error);
            captureText.textContent = "Erreur de communication. Réessai...";
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    video.style.border = 'none'; // Réinitialiser la bordure

    // Vérifier si on a réussi à collecter assez d'images
    if (validImages.length < maxCaptures) {
        window.VoteSecure.hideLoading(startBtn);
        startBtn.disabled = false;
        window.VoteSecure.showNotification("Impossible de détecter suffisamment de visages. Veuillez améliorer l'éclairage et réessayer.", 'error');
        return;
    }

    // Si on a nos 10 images, on les envoie pour l'entraînement final
    captureText.textContent = 'Toutes les photos sont valides. Envoi pour entraînement...';
    try {
        const trainResponse = await fetch('http://127.0.0.1:5000/api/face/capture', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ electeur_id: electeurId, images: validImages })
        });
        const trainResult = await trainResponse.json();
        if (!trainResponse.ok) throw new Error(trainResult.error);

        window.VoteSecure.hideLoading(startBtn);
        startBtn.style.display = 'none';
        completeBtn.style.display = 'inline-flex';
        window.VoteSecure.showNotification('Entraînement réussi. Veuillez finaliser.', 'success');

    } catch (error) {
        window.VoteSecure.hideLoading(startBtn);
        startBtn.disabled = false;
        window.VoteSecure.showNotification(`Erreur finale: ${error.message}`, 'error');
    }
}

// Remplacez votre fonction completeRegistration par celle-ci
function completeRegistration() {
    const completeBtn = document.getElementById('completeRegistration');
    window.VoteSecure.showLoading(completeBtn);

    // Cette fonction est maintenant une confirmation côté utilisateur.
    // L'entraînement du modèle a déjà été fait dans startFaceCapture.
    // Un court délai pour une meilleure expérience utilisateur.
    setTimeout(() => {
        window.VoteSecure.hideLoading(completeBtn);

        // Nettoyage des données temporaires de la session d'inscription
        localStorage.removeItem('registration_electeur_id');
        localStorage.removeItem('registration_phone_number');
        
        console.log('Inscription finalisée côté client.');
        
        // Affichage de l'écran de succès
        showStep(4);
        window.VoteSecure.showNotification('Inscription réalisée avec succès !', 'success');
    }, 1000);
}
// Export registration functions
window.RegistrationModule = {
    showStep,
    validateField,
    sendOTP,
    verifyOTP,
    startFaceCapture,
    completeRegistration
};
