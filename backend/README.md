# Système de Vote Électronique - Backend Flask

## 🗳️ Description

Backend complet pour un système de vote électronique sécurisé avec authentification à trois niveaux :
1. **Identifiants** (ID électeur + Aadhar)
2. **OTP** (Code SMS)  
3. **Reconnaissance faciale** (Haar Cascade + LBPH)

## 🏗️ Architecture

```
backend/
├── app.py                 # Application Flask principale
├── models.py              # Modèles de base de données
├── config.py              # Configuration
├── requirements.txt       # Dépendances Python
├── run.py                 # Script de lancement
├── routes/
│   ├── auth.py           # Routes d'authentification
│   ├── voting.py         # Routes de vote
│   └── face_recognition.py # Routes reconnaissance faciale
├── utils/
│   ├── sms_service.py    # Service d'envoi SMS
│   └── face_utils.py     # Utilitaires reconnaissance faciale
├── faces_data/           # Images d'entraînement (créé automatiquement)
├── models/               # Modèles IA (créé automatiquement)
└── logs/                 # Logs (créé automatiquement)
```

## 🚀 Installation

### 1. Prérequis
```bash
# Python 3.8+
python --version

# Installer pip si nécessaire
python -m ensurepip --upgrade
```

### 2. Installation des dépendances
```bash
# Dans le dossier backend/
pip install -r requirements.txt
```

### 3. Configuration (optionnel)
```bash
# Créer un fichier .env pour la configuration
cp .env.example .env

# Modifier les variables selon vos besoins
export SECRET_KEY="votre-clé-secrète-sécurisée"
export TWILIO_ACCOUNT_SID="votre-twilio-sid"
export TWILIO_AUTH_TOKEN="votre-twilio-token"
export TWILIO_PHONE_NUMBER="votre-numéro-twilio"
```

## 🏃 Lancement

### Mode développement
```bash
python run.py
```

### Mode production
```bash
# Avec Gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app

# Ou avec les variables d'environnement
export FLASK_ENV=production
python run.py
```

## 📡 API Endpoints

### Authentification
- `POST /api/auth/register` - Inscription électeur
- `POST /api/auth/verify-otp` - Vérification OTP
- `POST /api/auth/login` - Connexion électeur
- `POST /api/auth/logout` - Déconnexion
- `GET /api/auth/status` - Statut d'authentification

### Reconnaissance Faciale
- `POST /api/face/capture` - Capture images pour entraînement
- `POST /api/face/recognize` - Reconnaissance faciale
- `GET /api/face/model-status` - Statut des modèles IA
- `GET /api/face/download-haar-cascade` - Télécharger Haar Cascade

### Vote
- `GET /api/vote/candidates` - Liste des candidats
- `POST /api/vote/submit` - Soumettre un vote
- `GET /api/vote/results` - Résultats du vote
- `GET /api/vote/stats` - Statistiques de vote

## 📋 Utilisation

### 1. Inscription d'un électeur
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "identifiant_electeur": "EL123456",
    "identifiant_aadhar": "123456789012",
    "numero_telephone": "+33123456789"
  }'
```

### 2. Vérification OTP
```bash
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "numero_telephone": "+33123456789",
    "otp_code": "123456"
  }'
```

### 3. Capture faciale (après OTP)
```bash
curl -X POST http://localhost:5000/api/face/capture \
  -H "Content-Type: application/json" \
  -d '{
    "electeur_id": 1,
    "images": ["data:image/jpeg;base64,/9j/4AAQ..."]
  }'
```

### 4. Connexion
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifiant_electeur": "EL123456",
    "identifiant_aadhar": "123456789012"
  }'
```

### 5. Vote
```bash
curl -X POST http://localhost:5000/api/vote/submit \
  -H "Content-Type: application/json" \
  -d '{"candidat_id": 1}'
```

## 🔧 Configuration

### Base de données
- **Développement** : SQLite (`voting_system.db`)
- **Production** : PostgreSQL/MySQL (configurez `DATABASE_URL`)

### Reconnaissance faciale
- **Seuil de confiance** : 100 (modifiable dans `config.py`)
- **Images d'entraînement minimales** : 10 par électeur
- **Taille des images** : 200x200 pixels

### SMS (Twilio)
```python
# Configuration dans config.py ou variables d'environnement
TWILIO_ACCOUNT_SID = "votre_sid"
TWILIO_AUTH_TOKEN = "votre_token" 
TWILIO_PHONE_NUMBER = "votre_numéro"
```

## 🛡️ Sécurité

### Authentification à 3 niveaux
1. **Identifiants** - Vérification base de données
2. **OTP SMS** - Code temporaire 6 chiffres
3. **Biométrie** - Reconnaissance faciale LBPH

### Protection des données
- Sessions chiffrées
- Mots de passe hachés
- Tokens de session expirables
- Validation CSRF
- Limitation de tentatives

## 🧪 Tests

```bash
# Tests unitaires
python -m pytest tests/

# Test de l'API
python -m pytest tests/test_api.py

# Test reconnaissance faciale
python -m pytest tests/test_face_recognition.py
```

## 📊 Base de données

### Tables principales
- **electeurs** - Informations des électeurs
- **votes** - Votes enregistrés
- **candidats** - Liste des candidats
- **otps** - Codes OTP temporaires
- **sessions_auth** - Sessions d'authentification

### Migration
```bash
# Initialiser les migrations
flask db init

# Créer une migration
flask db migrate -m "Description"

# Appliquer les migrations
flask db upgrade
```

## 🐳 Docker

```dockerfile
# Dockerfile example
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 5000

CMD ["python", "run.py"]
```

## 📝 Logs

Les logs sont stockés dans `logs/` :
- `app.log` - Logs généraux
- `auth.log` - Logs d'authentification  
- `face.log` - Logs reconnaissance faciale
- `vote.log` - Logs de vote

## ⚠️ Limitation et notes

1. **OpenCV** - Nécessite des bibliothèques système (`libglib2.0`, `libgtk-3-0`)
2. **Twilio** - Compte requis pour SMS en production
3. **Performance** - Reconnaissance faciale CPU-intensive
4. **Stockage** - Images d'entraînement prennent de l'espace
5. **Sécurité** - Changez `SECRET_KEY` en production

## 📞 Support

Pour toute question ou problème :
1. Vérifiez les logs dans `logs/`
2. Consultez la documentation OpenCV
3. Testez avec `curl` ou Postman
4. Vérifiez la configuration Twilio

