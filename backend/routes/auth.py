from flask import Blueprint, request, jsonify, session
from models import db, Electeur, OTP, SessionAuthentification
from datetime import datetime, timedelta
import random
import string
import uuid

auth_bp = Blueprint('auth', __name__)

def generate_otp():
    """Génère un code OTP à 6 chiffres"""
    return ''.join(random.choices(string.digits, k=6))

def send_sms(numero, message):
    """Simulé - Dans la vraie vie, utilisez Twilio ou un autre service SMS"""
    print(f"SMS à {numero}: {message}")
    # Ici vous intégreriez Twilio ou un autre service SMS
    return True

@auth_bp.route('/register', methods=['POST'])
def register():
    """Inscription d'un nouvel électeur"""
    try:
        data = request.get_json()
        
        # Validation des données
        required_fields = ['identifiant_electeur', 'identifiant_aadhar', 'numero_telephone']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Tous les champs sont requis'}), 400
        
        # Vérifier si l'électeur existe déjà
        existing_electeur = Electeur.query.filter(
            (Electeur.identifiant_electeur == data['identifiant_electeur']) |
            (Electeur.identifiant_aadhar == data['identifiant_aadhar'])
        ).first()
        
        if existing_electeur:
            return jsonify({'error': 'Électeur déjà inscrit'}), 409
        
        # Créer l'électeur
        electeur = Electeur(
            identifiant_electeur=data['identifiant_electeur'],
            identifiant_aadhar=data['identifiant_aadhar'],
            numero_telephone=data['numero_telephone']
        )
        
        db.session.add(electeur)
        db.session.commit()
        
        # Générer et envoyer l'OTP
        otp_code = generate_otp()
        otp = OTP(
            numero_telephone=data['numero_telephone'],
            code=otp_code,
            expire_at=datetime.utcnow() + timedelta(minutes=5),
            type_otp='registration'
        )
        
        db.session.add(otp)
        db.session.commit()
        
        # Envoyer SMS (simulé)
        message = f"Votre code de vérification pour l'inscription au vote électronique: {otp_code}"
        send_sms(data['numero_telephone'], message)
        
        return jsonify({
            'message': 'Inscription réussie. Code OTP envoyé.',
            'next_step': 'verify_otp',
            'electeur_id': electeur.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    """Vérification du code OTP"""
    try:
        data = request.get_json()
        
        if not all(field in data for field in ['numero_telephone', 'otp_code']):
            return jsonify({'error': 'Numéro de téléphone et code OTP requis'}), 400
        
        # Trouver l'OTP valide le plus récent
        otp = OTP.query.filter_by(
            numero_telephone=data['numero_telephone'],
            code=data['otp_code'],
            utilise=False
        ).order_by(OTP.id.desc()).first()
        
        if not otp:
            return jsonify({'error': 'Code OTP invalide'}), 400
        
        if otp.is_expired():
            return jsonify({'error': 'Code OTP expiré'}), 400
        
        # Marquer l'OTP comme utilisé
        otp.utilise = True

        # Si c'est un OTP de login, mettre à jour la session d'authentification
        if otp.type_otp == 'login':
            electeur = Electeur.query.filter_by(numero_telephone=data['numero_telephone']).first()
            if electeur:
                auth_session = SessionAuthentification.query.filter_by(
                    id_electeur=electeur.id,
                    etape_2_complete=False
                ).order_by(SessionAuthentification.date_creation.desc()).first()
                if auth_session:
                    auth_session.etape_2_complete = True
                    db.session.add(auth_session)

        db.session.commit()
        
        if otp.type_otp == 'registration':
            return jsonify({
                'message': 'OTP vérifié. Procédez à la capture faciale.',
                'next_step': 'face_capture'
            }), 200
        elif otp.type_otp == 'login':
            return jsonify({
                'message': 'OTP vérifié. Procédez à la reconnaissance faciale.',
                'next_step': 'face_recognition'
            }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """Première étape de connexion - vérification des identifiants"""
    try:
        data = request.get_json()
        
        if not all(field in data for field in ['identifiant_electeur', 'identifiant_aadhar']):
            return jsonify({'error': 'Identifiant électeur et Aadhar requis'}), 400
        
        # Vérifier les identifiants
        electeur = Electeur.query.filter_by(
            identifiant_electeur=data['identifiant_electeur'],
            identifiant_aadhar=data['identifiant_aadhar']
        ).first()
        
        if not electeur:
            return jsonify({'error': 'Identifiants invalides'}), 401
        
        if electeur.a_vote:
            return jsonify({'error': 'Vous avez déjà voté'}), 403
        
        if not electeur.modele_facial_entraine:
            return jsonify({'error': 'Modèle facial non entraîné. Veuillez compléter votre inscription.'}), 400
        
        # Créer une session d'authentification
        session_token = str(uuid.uuid4())
        auth_session = SessionAuthentification(
            id_electeur=electeur.id,
            etape_1_complete=True,
            session_token=session_token,
            expire_at=datetime.utcnow() + timedelta(minutes=30)
        )
        
        db.session.add(auth_session)
        
        # Générer et envoyer l'OTP
        otp_code = generate_otp()
        otp = OTP(
            numero_telephone=electeur.numero_telephone,
            code=otp_code,
            expire_at=datetime.utcnow() + timedelta(minutes=5),
            type_otp='login'
        )
        
        db.session.add(otp)
        db.session.commit()
        
        # Envoyer SMS
        message = f"Votre code de connexion pour le vote électronique: {otp_code}"
        send_sms(electeur.numero_telephone, message)
        
        # Stocker dans la session Flask
        session['auth_session_token'] = session_token
        session['electeur_id'] = electeur.id
        
        return jsonify({
            'message': 'Identifiants vérifiés. Code OTP envoyé.',
            'next_step': 'verify_otp',
            'session_token': session_token,
            'numero_telephone': electeur.numero_telephone
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/complete-login', methods=['POST'])
def complete_login():
    """Finaliser la connexion après reconnaissance faciale"""
    try:
        data = request.get_json()
        session_token = data.get('session_token') or session.get('auth_session_token')
        
        if not session_token:
            return jsonify({'error': 'Session invalide'}), 401
        
        # Vérifier la session
        auth_session = SessionAuthentification.query.filter_by(
            session_token=session_token
        ).first()
        
        if not auth_session or auth_session.is_expired():
            return jsonify({'error': 'Session expirée'}), 401
        
        if not auth_session.is_fully_authenticated():
            return jsonify({'error': 'Authentification incomplète'}), 400
        
        # Marquer l'électeur comme connecté
        session['logged_in'] = True
        session['electeur_id'] = auth_session.id_electeur
        
        return jsonify({
            'message': 'Connexion réussie',
            'next_step': 'vote',
            'electeur_id': auth_session.id_electeur,
            'session_token': auth_session.session_token
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Déconnexion"""
    session.clear()
    return jsonify({'message': 'Déconnexion réussie'}), 200

from flask import request, jsonify, session
from models import SessionAuthentification, Electeur

@auth_bp.route('/status', methods=['GET'])
def auth_status():
    # Récupérer token Authorization Bearer
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header[7:]
        auth_session = SessionAuthentification.query.filter_by(session_token=token).first()
        
        if auth_session and not auth_session.is_expired() and auth_session.is_fully_authenticated():
            electeur = Electeur.query.get(auth_session.id_electeur)
            if electeur:
                return jsonify({
                    'authenticated': True,
                    'electeur': electeur.to_dict(),
                    'has_voted': electeur.a_vote
                }), 200

    # Sinon fallback sur session Flask classique
    if session.get('logged_in'):
        electeur_id = session.get('electeur_id')
        electeur = Electeur.query.get(electeur_id)
        if electeur:
            return jsonify({
                'authenticated': True,
                'electeur': electeur.to_dict(),
                'has_voted': electeur.a_vote
            }), 200

    return jsonify({'authenticated': False}), 200

