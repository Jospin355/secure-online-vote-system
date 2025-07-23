
// Camera handling JavaScript
class CameraManager {
    constructor() {
        this.stream = null;
        this.video = null;
        this.canvas = null;
        this.isInitialized = false;
    }
    
    async initialize(videoElementId = 'video') {
        console.log('Initializing camera...');
        
        this.video = document.getElementById(videoElementId);
        this.canvas = document.getElementById('canvas');
        
        if (!this.video) {
            console.error('Video element not found');
            return false;
        }
        
        try {
            const constraints = {
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            };
            
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;
            
            this.video.addEventListener('loadedmetadata', () => {
                console.log('Camera ready');
                this.isInitialized = true;
                this.updateStatus('ready', 'Caméra prête');
            });
            
            return true;
        } catch (error) {
            console.error('Error accessing camera:', error);
            this.handleCameraError(error);
            return false;
        }
    }
    
    handleCameraError(error) {
        let message = 'Erreur d\'accès à la caméra';
        
        switch (error.name) {
            case 'NotAllowedError':
                message = 'Accès à la caméra refusé';
                break;
            case 'NotFoundError':
                message = 'Aucune caméra trouvée';
                break;
            case 'NotReadableError':
                message = 'Caméra déjà utilisée';
                break;
            case 'OverconstrainedError':
                message = 'Contraintes caméra non supportées';
                break;
        }
        
        this.updateStatus('error', message);
        
        if (window.VoteSecure) {
            window.VoteSecure.showNotification(message, 'error');
        }
    }
    
    updateStatus(type, text) {
        const statusIcon = document.getElementById('statusIcon');
        const statusText = document.getElementById('statusText');
        
        if (statusIcon) {
            statusIcon.className = `fas fa-circle ${type}`;
        }
        
        if (statusText) {
            statusText.textContent = text;
        }
    }
    
    captureFrame() {
        if (!this.isInitialized || !this.video || !this.canvas) {
            console.error('Camera not initialized');
            return null;
        }
        
        const context = this.canvas.getContext('2d');
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        
        context.drawImage(this.video, 0, 0);
        
        return this.canvas.toDataURL('image/jpeg', 0.8);
    }
    
    startDetection(callback, interval = 1000) {
        if (!this.isInitialized) {
            console.error('Camera not initialized');
            return null;
        }
        
        const detectionInterval = setInterval(() => {
            const frameData = this.captureFrame();
            if (frameData && callback) {
                callback(frameData);
            }
        }, interval);
        
        return detectionInterval;
    }
    
    stopDetection(intervalId) {
        if (intervalId) {
            clearInterval(intervalId);
        }
    }
    
    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => {
                track.stop();
            });
            this.stream = null;
        }
        
        if (this.video) {
            this.video.srcObject = null;
        }
        
        this.isInitialized = false;
        console.log('Camera stopped');
    }
    
    // Face detection simulation
    detectFace(imageData) {
        // Simulate face detection
        return new Promise((resolve) => {
            setTimeout(() => {
                // Random detection success (90% success rate)
                const detected = Math.random() > 0.1;
                
                resolve({
                    detected: detected,
                    confidence: detected ? Math.random() * 0.3 + 0.7 : Math.random() * 0.4,
                    bounds: detected ? {
                        x: Math.random() * 100 + 100,
                        y: Math.random() * 100 + 100,
                        width: Math.random() * 100 + 150,
                        height: Math.random() * 100 + 180
                    } : null
                });
            }, 100);
        });
    }
    
    // Face recognition simulation
    recognizeFace(imageData, userId = null) {
        return new Promise((resolve) => {
            setTimeout(() => {
                // Simulate recognition process
                const recognized = Math.random() > 0.2; // 80% success rate
                const confidence = recognized ? Math.random() * 0.2 + 0.8 : Math.random() * 0.6;
                
                resolve({
                    recognized: recognized,
                    confidence: confidence,
                    userId: recognized ? userId : null,
                    message: recognized ? 'Visage reconnu' : 'Visage non reconnu'
                });
            }, 1500);
        });
    }
}

// Face detection visualization
class FaceOverlay {
    constructor(container) {
        this.container = container;
        this.overlay = null;
        this.createOverlay();
    }
    
    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'face-overlay';
        this.overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 10;
        `;
        
        if (this.container) {
            this.container.appendChild(this.overlay);
        }
    }
    
    drawFaceBox(bounds, type = 'detected') {
        if (!this.overlay) return;
        
        // Clear previous boxes
        this.overlay.innerHTML = '';
        
        const faceBox = document.createElement('div');
        faceBox.className = `face-box face-box-${type}`;
        faceBox.style.cssText = `
            position: absolute;
            border: 3px solid ${this.getBoxColor(type)};
            border-radius: 8px;
            left: ${bounds.x}px;
            top: ${bounds.y}px;
            width: ${bounds.width}px;
            height: ${bounds.height}px;
            transition: all 0.3s ease;
        `;
        
        // Add corners
        const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
        corners.forEach(corner => {
            const cornerElement = document.createElement('div');
            cornerElement.className = `face-corner ${corner}`;
            cornerElement.style.cssText = `
                position: absolute;
                width: 20px;
                height: 20px;
                border: 3px solid ${this.getBoxColor(type)};
                ${this.getCornerStyles(corner)}
            `;
            faceBox.appendChild(cornerElement);
        });
        
        this.overlay.appendChild(faceBox);
    }
    
    getBoxColor(type) {
        const colors = {
            detected: '#3b82f6',
            recognized: '#10b981',
            error: '#ef4444',
            searching: '#f59e0b'
        };
        return colors[type] || colors.detected;
    }
    
    getCornerStyles(corner) {
        const styles = {
            'top-left': 'top: -3px; left: -3px; border-right: none; border-bottom: none;',
            'top-right': 'top: -3px; right: -3px; border-left: none; border-bottom: none;',
            'bottom-left': 'bottom: -3px; left: -3px; border-right: none; border-top: none;',
            'bottom-right': 'bottom: -3px; right: -3px; border-left: none; border-top: none;'
        };
        return styles[corner] || '';
    }
    
    clear() {
        if (this.overlay) {
            this.overlay.innerHTML = '';
        }
    }
    
    showMessage(message, type = 'info') {
        const messageElement = document.createElement('div');
        messageElement.className = `face-message face-message-${type}`;
        messageElement.textContent = message;
        messageElement.style.cssText = `
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            white-space: nowrap;
        `;
        
        this.overlay.appendChild(messageElement);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }, 3000);
    }
}

// Global camera instance
window.cameraManager = new CameraManager();

// Export camera functionality
window.CameraModule = {
    CameraManager,
    FaceOverlay
};
