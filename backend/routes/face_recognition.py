# Fichier face_bp.py - VERSION CORRIGÉE ET NETTOYÉE

from flask import Blueprint, request, jsonify
from models import db, Electeur, SessionAuthentification
import cv2
import numpy as np
import base64
import os
import traceback

# --- Configuration ---
face_bp = Blueprint('face', __name__)

# CORRIGÉ : Constantes définies une seule fois en haut du fichier
HAAR_CASCADE_PATH = 'models/haarcascade_frontalface_default.xml'
FACES_DATA_PATH = 'faces_data'
MODELS_FOLDER = 'models'

# --- Fonctions Utilitaires (Pas de changement majeur) ---

def decode_base64_image(base64_string):
    """Décoder une image base64 en array numpy"""
    try:
        if base64_string.startswith('data:image'):
            base64_string = base64_string.split(',')[1]
        img_data = base64.b64decode(base64_string)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        print(f"Erreur décodage image: {e}")
        return None

def detect_face(image):
    """Détecter un visage dans l'image avec Haar Cascade"""
    try:
        if not os.path.exists(HAAR_CASCADE_PATH):
            return None, "Modèle Haar Cascade non trouvé. Veuillez le télécharger via l'API."
        
        face_cascade = cv2.CascadeClassifier(HAAR_CASCADE_PATH)
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(30, 30))
        
        if len(faces) == 0:
            return None, "Aucun visage n'a été détecté. Assurez-vous d'être bien éclairé et de face."
        if len(faces) > 1:
            return None, "Plusieurs visages détectés. Seul un visage est autorisé par image."
        
        (x, y, w, h) = faces[0]
        return gray[y:y+h, x:x+w], None
    except Exception as e:
        return None, f"Erreur technique lors de la détection: {str(e)}"

def save_training_images(electeur_id, images):
    """Sauvegarde les images d'entraînement. Retourne (succès, nb_sauvegardées, message_erreur)."""
    error_message = None
    saved_count = 0
    try:
        electeur_folder = os.path.join(FACES_DATA_PATH, f"user_{electeur_id}")
        os.makedirs(electeur_folder, exist_ok=True)

        for i, img_base64 in enumerate(images):
            img = decode_base64_image(img_base64)
            if img is None:
                error_message = f"L'image {i+1} est invalide."
                continue

            face, error = detect_face(img)
            if face is None:
                error_message = f"Pour l'image {i+1}: {error}"
                continue

            face_resized = cv2.resize(face, (200, 200))
            filepath = os.path.join(electeur_folder, f"user.{electeur_id}.{saved_count + 1}.jpg")
            cv2.imwrite(filepath, face_resized)
            saved_count += 1
        
        if saved_count == 0:
            return False, 0, error_message or "Aucune image valide n'a pu être traitée."
            
        return True, saved_count, None
    except Exception as e:
        traceback.print_exc()
        return False, 0, str(e)

def train_face_model_for_user(electeur_id):
    """Entraîner le modèle LBPH uniquement pour un utilisateur donné."""
    try:
        recognizer = cv2.face.LBPHFaceRecognizer_create()
        faces, ids = [], []
        
        user_folder = os.path.join(FACES_DATA_PATH, f"user_{electeur_id}")
        if not os.path.exists(user_folder):
            return False, "Aucune image d'entraînement trouvée"
        
        for filename in os.listdir(user_folder):
            if filename.endswith('.jpg'):
                img = cv2.imread(os.path.join(user_folder, filename), cv2.IMREAD_GRAYSCALE)
                if img is not None:
                    faces.append(img)
                    ids.append(electeur_id)  # <-- toujours le même id pour cet utilisateur
        
        if not faces:
            return False, "Aucune image valide trouvée dans le dossier d'entraînement."
        
        #  CORRECTION : Forcer dtype à np.int32
        recognizer.train(faces, np.array(ids, dtype=np.int32))
        
        user_model_folder = os.path.join(MODELS_FOLDER, f"user_{electeur_id}")
        os.makedirs(user_model_folder, exist_ok=True)
        model_path = os.path.join(user_model_folder, 'trainer.yml')
        recognizer.save(model_path)
        
        return True, f"Modèle entraîné avec {len(faces)} images."
    except Exception as e:
        traceback.print_exc()
        return False, f"Erreur lors de l'entraînement: {str(e)}"

def recognize_face_multiple_models(image):
    """Reconnaître un visage en testant tous les modèles utilisateurs."""
    try:
        face, error = detect_face(image)
        if face is None:
            return None, 0, error
        face_resized = cv2.resize(face, (200, 200))

        best_user_id, best_confidence = None, float('inf')

        for user_folder in os.listdir(MODELS_FOLDER):
            user_path = os.path.join(MODELS_FOLDER, user_folder)
            model_path = os.path.join(user_path, 'trainer.yml')

            if os.path.isdir(user_path) and os.path.exists(model_path):
                recognizer = cv2.face.LBPHFaceRecognizer_create()
                recognizer.read(model_path)
                user_id, confidence = recognizer.predict(face_resized)
                
                # Le user_id est intégré au nom du dossier, on le récupère pour plus de sûreté
                try:
                    current_user_id = int(user_folder.replace('user_', ''))
                    if confidence < best_confidence:
                        best_confidence = confidence
                        best_user_id = current_user_id
                except ValueError:
                    continue # Dossier non conforme

        if best_user_id is None:
            return None, 0, "Aucun modèle n'a pu reconnaître ce visage."
            
        return best_user_id, best_confidence, None
    except Exception as e:
        return None, 0, f"Erreur technique lors de la reconnaissance: {str(e)}"


# --- Routes API ---

@face_bp.route('/detect-single', methods=['POST'])
def detect_single_face():
    """Vérifie si un visage est détecté dans une image (feedback UI)."""
    try:
        img = decode_base64_image(request.get_json().get('image'))
        if img is None:
            return jsonify({'detected': False, 'reason': 'Image invalide'})

        face, error = detect_face(img)
        return jsonify({'detected': face is not None, 'reason': error})
    except Exception as e:
        return jsonify({'detected': False, 'reason': str(e)})

# CORRIGÉ : Un seul décorateur de route
@face_bp.route('/capture', methods=['POST'])
def capture_faces():
    """Capturer les images, vérifier le nombre et entraîner le modèle."""
    MIN_IMAGES_REQUIRED = 5
    try:
        data = request.get_json()
        electeur_id, images = data.get('electeur_id'), data.get('images')

        if not all([electeur_id, images, isinstance(images, list)]):
            return jsonify({'error': 'Données invalides fournies.'}), 400

        electeur = Electeur.query.get(electeur_id)
        if not electeur:
            return jsonify({'error': f"Électeur ID {electeur_id} non trouvé."}), 404
        if electeur.modele_facial_entraine:
            return jsonify({'error': 'Un modèle a déjà été entraîné.'}), 400

        success, count, error_msg = save_training_images(electeur_id, images)
        if not success:
            return jsonify({'error': error_msg or "Échec de la sauvegarde."}), 500
        
        if count < MIN_IMAGES_REQUIRED:
            return jsonify({'error': f"Seulement {count} visages détectés. Minimum requis: {MIN_IMAGES_REQUIRED}."}), 400

        train_success, train_message = train_face_model_for_user(electeur_id)
        if not train_success:
            return jsonify({'error': f"Entraînement échoué: {train_message}"}), 500

        electeur.modele_facial_entraine = True
        db.session.commit()
        return jsonify({'message': 'Modèle entraîné avec succès.', 'images_saved': count}), 201

    except Exception as e:
        db.session.rollback()
        traceback.print_exc()
        return jsonify({'error': f"Erreur serveur: {str(e)}"}), 500

@face_bp.route('/recognize', methods=['POST'])
def recognize():
    """Reconnaître un visage et le valider contre la session en cours (modèle unique)."""
    try:
        data = request.get_json()
        img = decode_base64_image(data.get('image'))
        session_token = data.get('session_token')

        if not all([img is not None, session_token]):
            return jsonify({'recognized': False, 'message': 'Données invalides.'}), 400

        # Récupérer la session pour obtenir l'ID utilisateur
        auth_session = SessionAuthentification.query.filter_by(session_token=session_token).first()
        if not auth_session:
            return jsonify({'recognized': False, 'message': 'Session invalide.'}), 401

        user_id = auth_session.id_electeur

        # Charger uniquement le modèle de cet utilisateur
        user_model_folder = os.path.join(MODELS_FOLDER, f"user_{user_id}")
        model_path = os.path.join(user_model_folder, 'trainer.yml')

        if not os.path.exists(model_path):
            return jsonify({'recognized': False, 'message': 'Modèle facial non trouvé pour cet utilisateur.'}), 404

        recognizer = cv2.face.LBPHFaceRecognizer_create()
        recognizer.read(model_path)

        # Détection du visage
        face, error = detect_face(img)
        if face is None:
            return jsonify({'recognized': False, 'message': error}), 200

        face_resized = cv2.resize(face, (200, 200))

        predicted_id, confidence = recognizer.predict(face_resized)

        CONFIDENCE_THRESHOLD = 100
        if confidence > CONFIDENCE_THRESHOLD:
            return jsonify({'recognized': False, 'message': 'Visage non reconnu.', 'confidence': confidence}), 200

        # Vérifier que l'ID prédit correspond à l'utilisateur
        if predicted_id != user_id:
            return jsonify({'recognized': False, 'message': 'Le visage ne correspond pas à la session.', 'confidence': confidence}), 403

        # Marquer l'étape 3 complète
        auth_session.etape_3_complete = True
        db.session.commit()

        return jsonify({
            'recognized': True,
            'message': 'Reconnaissance réussie.',
            'user_id': user_id,
            'confidence': confidence,
            'authentication_complete': True
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'recognized': False, 'message': str(e)}), 500


# Les routes de statut sont utiles, pas de changement nécessaire
@face_bp.route('/model-status', methods=['GET'])
def model_status():
    """Vérifier l'état des dépendances du modèle et le nombre d'images d'entraînement."""
    try:
        haar_exists = os.path.exists(HAAR_CASCADE_PATH)

        training_images = 0
        if os.path.exists(FACES_DATA_PATH):
            # Compter toutes les images .jpg dans chaque dossier utilisateur
            for user_folder in os.listdir(FACES_DATA_PATH):
                user_path = os.path.join(FACES_DATA_PATH, user_folder)
                if os.path.isdir(user_path):
                    images = [f for f in os.listdir(user_path) if f.endswith('.jpg')]
                    training_images += len(images)

        # Compter le nombre de modèles entraînés
        trained_models = 0
        if os.path.exists(MODELS_FOLDER):
            for user_folder in os.listdir(MODELS_FOLDER):
                user_path = os.path.join(MODELS_FOLDER, user_folder)
                model_path = os.path.join(user_path, 'trainer.yml')
                if os.path.isfile(model_path):
                    trained_models += 1

        return jsonify({
            'haar_cascade_available': haar_exists,
            'training_images_count': training_images,
            'trained_models_count': trained_models,
            'models_ready': haar_exists and trained_models > 0
        }), 200

    except Exception as e:
        return jsonify({'error': f"Erreur lors du check model-status: {str(e)}"}), 500

