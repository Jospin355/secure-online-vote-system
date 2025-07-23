
// Login JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initializeLogin();
});

let currentStep = 1;
let loginData = {};
let otpTimer = null;

function initializeLogin() {
    console.log('Initializing login process');
    
    initializeLoginForm();
    initializeStepNavigation();
    initializeOTPHandlers();
    initializeFaceRecognition();
    
    showStep(1);
}

function initializeLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        handleLoginSubmit();
    });
    
    // Real-time validation
    const inputs = form.querySelectorAll('input[required]');
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateLoginField(this);
        });
    });
}

function validateLoginField(field) {
    const value = field.value.trim();
    const fieldName = field.name;
    let isValid = true;
    let message = '';
    
    if (!value) {
        isValid = false;
        message = 'Ce champ est obligatoire';
    } else {
        switch (fieldName) {
            case 'voterID':
                if (value.length < 8) {
                    isValid = false;
                    message = 'ID électeur invalide';
                }
                break;
            case 'aadharID':
                if (!/^\d{12}$/.test(value.replace(/\s/g, ''))) {
                    isValid = false;
                    message = 'ID Aadhar invalide';
                }
                break;
        }
    }
    
    if (isValid) {
        window.VoteSecure.setFieldSuccess(field);
    } else {
        window.VoteSecure.setFieldError(field, message);
    }
    
    return isValid;
}

function handleLoginSubmit() {
    const form = document.getElementById('loginForm');
    const submitBtn = form.querySelector('button[type="submit"]');
    const voterID = form.querySelector('input[name="voterID"]').value;
    const aadharID = form.querySelector('input[name="aadharID"]').value;

    if (!voterID || !aadharID) {
        window.VoteSecure.showNotification('Veuillez remplir tous les champs', 'error');
        return;
    }
    
    window.VoteSecure.showLoading(submitBtn);
    
    fetch('http://127.0.0.1:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifiant_electeur: voterID,
        identifiant_aadhar: aadharID
      })
    })
    .then(response => response.json())
    .then(data => {
      window.VoteSecure.hideLoading(submitBtn);
      
      // CORRECTION : La valeur attendue est 'verify_otp'.
      if (data.next_step === 'verify_otp' && data.session_token) {
        // CORRECTION : Stocker le jeton ET le numéro de téléphone pour l'étape suivante.
        localStorage.setItem('session_token', data.session_token);
        
        // NOTE : Assurez-vous que votre backend renvoie bien 'numero_telephone'.
        if (data.numero_telephone) {
            localStorage.setItem('login_phone_number', data.numero_telephone);
        } else {
            window.VoteSecure.showNotification("Erreur critique : le numéro de téléphone n'a pas été fourni par le serveur.", 'error');
            return;
        }
        
        window.VoteSecure.showNotification('Code OTP envoyé', 'success');
        showStep(2);
      } else {
        window.VoteSecure.showNotification(data.error || 'Erreur de connexion', 'error');
      }
    })
    .catch(error => {
      console.error('Erreur de connexion:', error);
      window.VoteSecure.hideLoading(submitBtn);
      window.VoteSecure.showNotification('Erreur de communication avec le serveur', 'error');
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
    console.log(`Showing login step ${step}`);
    
    // Hide all steps
    document.querySelectorAll('.step-form').forEach(form => {
        form.classList.remove('active');
    });
    
    // Show current step
    const stepSelectors = {
        1: '#loginForm',
        2: '#otpForm',
        3: '#faceRecognitionForm'
    };
    
    const currentForm = document.querySelector(stepSelectors[step]);
    if (currentForm) {
        currentForm.classList.add('active');
    }
    
    // Update progress
    updateProgressIndicator(step);
    currentStep = step;
    
    // Initialize step-specific functionality
    switch (step) {
        case 2:
            initializeOTPInputs();
            break;
        case 3:
            initializeLoginCamera();
            break;
    }
}

function updateProgressIndicator(step) {
    document.querySelectorAll('.progress-step').forEach((stepElement, index) => {
        const stepNumber = index + 1;
        
        stepElement.classList.remove('active', 'completed');
        
        if (stepNumber < step) {
            stepElement.classList.add('completed');
        } else if (stepNumber === step) {
            stepElement.classList.add('active');
        }
    });
}

function initializeOTPHandlers() {
    const verifyBtn = document.getElementById('verifyOTP');
    const resendBtn = document.getElementById('resendOTP');
    
    if (verifyBtn) {
        verifyBtn.addEventListener('click', verifyLoginOTP);
    }
    
    if (resendBtn) {
        resendBtn.addEventListener('click', function() {
            sendLoginOTP();
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
                
                if (index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }
            } else if (value.length === 0) {
                this.classList.remove('filled');
            } else {
                e.target.value = '';
            }
            
            // Auto-verify when complete
            const allFilled = Array.from(otpInputs).every(inp => inp.value.length === 1);
            if (allFilled) {
                setTimeout(verifyLoginOTP, 500);
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
    
    if (otpInputs.length > 0) {
        otpInputs[0].focus();
    }
}

function sendLoginOTP() {
    console.log('Sending login OTP...');
    
    // Get user phone from registration data
    const registrationData = window.VoteSecure.getFromStorage('registrationData');
    
    startOTPTimer();
    window.currentLoginOTP = '123456';
    
    console.log('Login OTP sent');
}

function startOTPTimer() {
    let timeLeft = 300;
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
            if (resendBtn) {
                resendBtn.disabled = false;
            }
        }
        
        timeLeft--;
    }, 1000);
}

function verifyLoginOTP() {
    const otpInputs = document.querySelectorAll('#otpForm .otp-input');
    const enteredOTP = Array.from(otpInputs).map(input => input.value).join('');
    const verifyBtn = document.getElementById('verifyOTP');
    
    if (enteredOTP.length !== 6) {
        showOTPFeedback('Code incomplet', 'error');
        return;
    }
    
    window.VoteSecure.showLoading(verifyBtn);

    // CORRECTION : Récupérer le numéro de téléphone stocké, requis par l'API.
    const numero_telephone = localStorage.getItem('login_phone_number');
    if (!numero_telephone) {
        window.VoteSecure.hideLoading(verifyBtn);
        showOTPFeedback('Session invalide. Veuillez recommencer.', 'error');
        showStep(1);
        return;
    }
    
    fetch('http://127.0.0.1:5000/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        numero_telephone: numero_telephone, // CORRECTION : Envoi du bon paramètre.
        otp_code: enteredOTP
      })
    })
    .then(response => response.json())
    .then(data => {
      window.VoteSecure.hideLoading(verifyBtn);
      
      // La réponse attendue du backend est 'face_recognition'.
      if (data.next_step === 'face_recognition') {
        showOTPFeedback('Code vérifié', 'success');
        clearInterval(otpTimer);
        
        setTimeout(() => {
          showStep(3);
          window.VoteSecure.showNotification('Procédez à la reconnaissance faciale', 'success');
        }, 1000);
      } else {
        showOTPFeedback(data.error || 'Code incorrect', 'error');
        otpInputs.forEach(input => { input.value = ''; input.classList.remove('filled'); });
        otpInputs[0].focus();
      }
    })
    .catch(error => {
      console.error('Erreur de vérification OTP:', error);
      window.VoteSecure.hideLoading(verifyBtn);
      showOTPFeedback('Erreur serveur', 'error');
    });
}
function showOTPFeedback(message, type) {
    const feedback = document.querySelector('.otp-feedback');
    if (feedback) {
        feedback.textContent = message;
        feedback.className = `otp-feedback ${type}`;
    }
}

function initializeFaceRecognition() {
    const startBtn = document.getElementById('startRecognition');
    const proceedBtn = document.getElementById('proceedToVote');
    
    if (startBtn) {
        startBtn.addEventListener('click', startFaceRecognition);
    }
    
    if (proceedBtn) {
        proceedBtn.addEventListener('click', function() {
            window.location.href = 'vote.html';
        });
    }
}

function initializeLoginCamera() {
    const video = document.getElementById('video');
    const status = document.getElementById('cameraStatus');
    const statusIcon = document.getElementById('statusIcon');
    const statusText = document.getElementById('statusText');
    
    if (!video) return;
    
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(function(stream) {
            video.srcObject = stream;
            
            statusIcon.className = 'fas fa-circle ready';
            statusText.textContent = 'Caméra prête pour reconnaissance';
            
            console.log('Login camera initialized');
        })
        .catch(function(error) {
            console.error('Camera error:', error);
            
            statusIcon.className = 'fas fa-circle error';
            statusText.textContent = 'Erreur d\'accès à la caméra';
        });
}
function startFaceRecognition() {
    const startBtn = document.getElementById('startRecognition');
    const video = document.getElementById('video');
    const sessionToken = localStorage.getItem('session_token');

    if (!sessionToken) {
        window.VoteSecure.showNotification('Session invalide. Veuillez recommencer.', 'error');
        showStep(1);
        return;
    }

    window.VoteSecure.showLoading(startBtn);
    
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const imageBase64 = canvas.toDataURL('image/jpeg').split(',')[1];
    
    // CORRECTION : Remplacement de la simulation par l'appel API réel.
    fetch('http://127.0.0.1:5000/api/face/recognize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: imageBase64,
        session_token: sessionToken
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.recognized && data.authentication_complete) {
        // CORRECTION : Appel de la fonction de finalisation au lieu de manipuler l'UI directement.
        completeLoginFlow(sessionToken);
      } else {
        window.VoteSecure.hideLoading(startBtn);
        window.VoteSecure.showNotification(data.message || 'Reconnaissance échouée', 'error');
      }
    })
    .catch(error => {
      console.error('Erreur de reconnaissance faciale:', error);
      window.VoteSecure.hideLoading(startBtn);
      window.VoteSecure.showNotification('Erreur serveur lors de la reconnaissance', 'error');
    });
}




function completeLoginFlow(sessionToken) {
    const startBtn = document.getElementById('startRecognition');
    fetch('http://127.0.0.1:5000/api/auth/complete-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_token: sessionToken })
    })
    .then(response => response.json())
    .then(data => {
        window.VoteSecure.hideLoading(startBtn);
        if (data.next_step === 'vote') {
            // Mise à jour de l'UI pour montrer le succès
            document.querySelector('.face-frame')?.classList.add('success');
            document.getElementById('startRecognition').style.display = 'none';
            document.getElementById('proceedToVote').style.display = 'inline-flex';
            
            // Stockage du jeton final et nettoyage
            localStorage.setItem('auth_bearer_token', sessionToken);
            localStorage.removeItem('login_phone_number');

            // --- AJOUT ICI ---
            const currentUser = {
                voterID: data.voterID || 'inconnu',
                firstName: data.firstName || 'Électeur',
                lastName: data.lastName || '',
                authenticated: true
            };
            window.VoteSecure.saveToStorage('currentUser', currentUser);
            // ------------------

            window.VoteSecure.showNotification('Connexion réussie ! Vous allez être redirigé.', 'success');
            setTimeout(() => {
                localStorage.removeItem('voteRecord');
                window.location.href = 'vote.html';
            }, 2000);
        } else {
            window.VoteSecure.showNotification(data.error || "Impossible de finaliser la connexion.", 'error');
        }
    })
    .catch(error => {
        window.VoteSecure.hideLoading(startBtn);
        window.VoteSecure.showNotification('Erreur lors de la finalisation de la connexion.', 'error');
    });
}


// Export login functions
window.LoginModule = {
    showStep,
    validateLoginField,
    sendLoginOTP,
    verifyLoginOTP,
    startFaceRecognition
};
