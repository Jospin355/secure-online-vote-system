import cv2
import numpy as np
import os
import base64
from flask import current_app

class FaceRecognitionSystem:
    """Système de reconnaissance faciale pour le vote électronique"""
    
    def __init__(self):
        self.haar_cascade_path = os.path.join('models', 'haarcascade_frontalface_default.xml')
        self.lbph_model_path = os.path.join('models', 'trainer.yml')
        self.faces_data_path = 'faces_data'
        self.confidence_threshold = current_app.config.get('CONFIDENCE_THRESHOLD', 100)
        
        # Créer les dossiers nécessaires
        os.makedirs('models', exist_ok=True)
        os.makedirs(self.faces_data_path, exist_ok=True)
    
    def download_haar_cascade(self):
        """Télécharger le modèle Haar Cascade depuis GitHub OpenCV"""
        try:
            import urllib.request
            
            url = "https://raw.githubusercontent.com/opencv/opencv/master/data/haarcascades/haarcascade_frontalface_default.xml"
            urllib.request.urlretrieve(url, self.haar_cascade_path)
            
            current_app.logger.info("Haar Cascade téléchargé avec succès")
            return True, "Haar Cascade téléchargé"
            
        except Exception as e:
            current_app.logger.error(f"Erreur téléchargement Haar Cascade: {e}")
            return False, str(e)
    
    def decode_base64_image(self, base64_string):
        """Décoder une image base64"""
        try:
            # Supprimer le préfixe data:image si présent
            if ',' in base64_string:
                base64_string = base64_string.split(',')[1]
            
            # Décoder
            img_data = base64.b64decode(base64_string)
            nparr = np.frombuffer(img_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            return img, None
            
        except Exception as e:
            return None, f"Erreur décodage image: {str(e)}"
    
    def detect_face(self, image):
        """Détecter un visage dans l'image"""
        try:
            # Vérifier que Haar Cascade existe
            if not os.path.exists(self.haar_cascade_path):
                # Essayer de le télécharger
                success, message = self.download_haar_cascade()
                if not success:
                    return None, None, f"Haar Cascade non disponible: {message}"
            
            # Charger le classificateur
            face_cascade = cv2.CascadeClassifier(self.haar_cascade_path)
            
            # Convertir en niveaux de gris
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Améliorer l'image
            gray = cv2.equalizeHist(gray)
            
            # Détecter les visages
            faces = face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(30, 30),
                flags=cv2.CASCADE_SCALE_IMAGE
            
            # Normaliser l'histogramme
            face_normalized = cv2.equalizeHist(face_resized)
            
            return face_normalized, None
            
        except Exception as e:
            return None, f"Erreur prétraitement: {str(e)}"
    
    def save_training_images(self, electeur_id, images_base64):
        """Sauvegarder les images d'entraînement"""
        try:
            electeur_folder = os.path.join(self.faces_data_path, f"user_{electeur_id}")
            os.makedirs(electeur_folder, exist_ok=True)
            
            saved_count = 0
            errors = []
            
            for i, img_base64 in enumerate(images_base64):
                # Décoder l'image
                img, decode_error = self.decode_base64_image(img_base64)
                if img is None:
                    errors.append(f"Image {i+1}: {decode_error}")
                    continue
                
                # Détecter le visage
                face, coords, detect_error = self.detect_face(img)
                if face is None:
                    errors.append(f"Image {i+1}: {detect_error}")
                    continue
                
                # Prétraiter
                face_processed, preprocess_error = self.preprocess_face(face)
                if face_processed is None:
                    errors.append(f"Image {i+1}: {preprocess_error}")
                    continue
                
                # Sauvegarder
                filename = f"user.{electeur_id}.{saved_count+1}.jpg"
                filepath = os.path.join(electeur_folder, filename)
                cv2.imwrite(filepath, face_processed)
                saved_count += 1
            
            min_images = current_app.config.get('MIN_TRAINING_IMAGES', 10)
            if saved_count < min_images:
                return False, 0, f"Seulement {saved_count} images sauvegardées. Minimum requis: {min_images}"
            
            return True, saved_count, None
            
        except Exception as e:
            return False, 0, f"Erreur sauvegarde: {str(e)}"
    
    def train_model(self):
        """Entraîner le modèle LBPH"""
        try:
            # Initialiser le recognizer
            recognizer = cv2.face.LBPHFaceRecognizer_create()
            
            faces = []
            ids = []
            
            # Charger toutes les images d'entraînement
            if not os.path.exists(self.faces_data_path):
                return False, "Aucune donnée d'entraînement"
            
            for user_folder in os.listdir(self.faces_data_path):
                if user_folder.startswith('user_'):
                    try:
                        user_id = int(user_folder.split('_')[1])
                        user_path = os.path.join(self.faces_data_path, user_folder)
                        
                        # Charger les images de cet utilisateur
                        for filename in os.listdir(user_path):
                            if filename.endswith('.jpg'):
                                img_path = os.path.join(user_path, filename)
                                img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
                                
                                if img is not None:
                                    faces.append(img)
                                    ids.append(user_id)
                    except ValueError:
                        continue
            
            if len(faces) == 0:
                return False, "Aucune image d'entraînement valide"
            
            # Entraîner le modèle
            recognizer.train(faces, np.array(ids))
            
            # Sauvegarder
            recognizer.save(self.lbph_model_path)
            
            current_app.logger.info(f"Modèle entraîné avec {len(faces)} images")
            return True, f"Modèle entraîné avec {len(faces)} images"
            
        except Exception as e:
            current_app.logger.error(f"Erreur entraînement: {e}")
            return False, f"Erreur entraînement: {str(e)}"
    
    def recognize_face(self, image_base64):
        """Reconnaître un visage"""
        try:
            # Vérifier que le modèle existe
            if not os.path.exists(self.lbph_model_path):
                return None, 0, "Modèle non entraîné"
            
            # Décoder l'image
            img, decode_error = self.decode_base64_image(image_base64)
            if img is None:
                return None, 0, decode_error
            
            # Détecter le visage
            face, coords, detect_error = self.detect_face(img)
            if face is None:
                return None, 0, detect_error
            
            # Prétraiter
            face_processed, preprocess_error = self.preprocess_face(face)
            if face_processed is None:
                return None, 0, preprocess_error
            
            # Charger le modèle
            recognizer = cv2.face.LBPHFaceRecognizer_create()
            recognizer.read(self.lbph_model_path)
            
            # Reconnaître
            user_id, confidence = recognizer.predict(face_processed)
            
            return user_id, confidence, None
            
        except Exception as e:
            return None, 0, f"Erreur reconnaissance: {str(e)}"
    
    def is_face_recognized(self, confidence):
        """Vérifier si la confiance est suffisante pour la reconnaissance"""
        return confidence <= self.confidence_threshold
    
    def get_system_status(self):
        """Obtenir le statut du système de reconnaissance"""
        haar_exists = os.path.exists(self.haar_cascade_path)
        lbph_exists = os.path.exists(self.lbph_model_path)
        
        # Compter les images d'entraînement
        training_images = 0
        users_trained = 0
        
        if os.path.exists(self.faces_data_path):
            for user_folder in os.listdir(self.faces_data_path):
                if user_folder.startswith('user_'):
                    user_path = os.path.join(self.faces_data_path, user_folder)
                    if os.path.isdir(user_path):
                        user_images = len([f for f in os.listdir(user_path) if f.endswith('.jpg')])
                        if user_images > 0:
                            training_images += user_images
                            users_trained += 1
        
        return {
            'haar_cascade_available': haar_exists,
            'lbph_model_available': lbph_exists,
            'training_images_count': training_images,
            'users_trained': users_trained,
            'system_ready': haar_exists and lbph_exists,
            'confidence_threshold': self.confidence_threshold
        }
