import os
from datetime import timedelta

class Config:
    """Configuration de base pour Flask"""
    
    # Clé secrète pour les sessions (CHANGEZ EN PRODUCTION!)
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-secret-key-change-in-production'
    
    # Configuration base de données
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///voting_system.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Configuration des fichiers
    UPLOAD_FOLDER = 'faces_data'
    MODELS_FOLDER = 'models'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max pour upload
    
    # Configuration des sessions
    PERMANENT_SESSION_LIFETIME = timedelta(minutes=30)
    
    # Configuration CORS
    CORS_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000']
    
    # Configuration OTP
    OTP_EXPIRY_MINUTES = 5
    OTP_LENGTH = 6
    
    # Configuration reconnaissance faciale
    CONFIDENCE_THRESHOLD = 100
    MIN_TRAINING_IMAGES = 10
    FACE_IMAGE_SIZE = (200, 200)
    
    # Configuration Twilio (optionnel)
    TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID')
    TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN')
    TWILIO_PHONE_NUMBER = os.environ.get('TWILIO_PHONE_NUMBER')

class DevelopmentConfig(Config):
    """Configuration pour le développement"""
    DEBUG = True
    TESTING = False

class ProductionConfig(Config):
    """Configuration pour la production"""
    DEBUG = False
    TESTING = False
    
    # En production, utilisez des variables d'environnement sécurisées
    SECRET_KEY = os.environ.get('SECRET_KEY')
    if not SECRET_KEY:
        raise ValueError("SECRET_KEY doit être définie en production")

class TestingConfig(Config):
    """Configuration pour les tests"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False

# Dictionnaire des configurations
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}