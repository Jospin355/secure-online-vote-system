#!/usr/bin/env python3
"""
Script de lancement pour le serveur Flask du système de vote électronique
"""

import os
import sys
from flask_migrate import Migrate

# Ajouter le répertoire courant au path Python
sys.path.insert(0, os.path.dirname(__file__))

from app import app, db
from models import Electeur, Vote, Candidat, OTP, SessionAuthentification

# Configuration pour les migrations
migrate = Migrate(app, db)

def init_database():
    """Initialiser la base de données avec des données de test"""
    with app.app_context():
        # Créer toutes les tables
        db.create_all()
        
        # Vérifier si des candidats existent déjà
        if Candidat.query.count() == 0:
            # Créer des candidats de test avec partis politiques camerounais
            candidats_test = [
                {
                    'nom': 'Issa Tchimoro Bakari',
                    'parti': 'FSNC',
                    'description': "Prône l’unité nationale, la transparence dans la gestion des affaires publiques et le développement rural."
                },
               
                {
                    'nom': 'Joshua Nambangi Osih',
                    'parti': 'SDF',
                    'description': "Milite pour la décentralisation, les libertés publiques et l'égalité des chances pour tous les Camerounais."
                },
                {
                    'nom': 'Maurice Kamto',
                    'parti': 'MRC',
                    'description': "Porte la voix de l'opposition réformatrice. Se concentre sur la gouvernance, la justice sociale et la jeunesse."
                },
              
                 {
                    'nom': 'SE Paul Biya',
                    'parti': 'RDPC',
                    'description': "Candidat du parti au pouvoir. Met en avant la stabilité, la continuité de l'État et le développement infrastructurel."
                }
            ]
            
            for candidat_data in candidats_test:
                candidat = Candidat(**candidat_data)
                db.session.add(candidat)
            
            db.session.commit()
            print("Candidats de test créés")
        
        print("Base de données initialisée")


def check_requirements():
    """Vérifier que toutes les dépendances sont installées"""
    try:
        import cv2
        import numpy
        import flask
        import flask_sqlalchemy
        import flask_cors
        print(" Toutes les dépendances Python sont installées")
        return True
    except ImportError as e:
        print(f" Dépendance manquante: {e}")
        print("Exécutez: pip install -r requirements.txt")
        return False

def create_directories():
    """Créer les répertoires nécessaires"""
    directories = ['faces_data', 'models', 'logs']
    
    for directory in directories:
        if not os.path.exists(directory):
            os.makedirs(directory)
            print(f" Répertoire créé: {directory}")

def main():
    """Fonction principale de lancement"""
    print("🗳️  Système de Vote Électronique - Serveur Flask")
    print("=" * 50)
    
    # Vérifications préalables
    if not check_requirements():
        sys.exit(1)
    
    create_directories()
    init_database()
    
    # Configuration de l'environnement
    env = os.environ.get('FLASK_ENV', 'development')
    debug = env == 'development'
    
    print(f"\n Démarrage du serveur en mode {env}")
    print(f"📱 Interface web disponible sur: http://localhost:5000")
    print(f"🔧 API disponible sur: http://localhost:5000/api/")
    
    if debug:
        print("⚠️  Mode développement - Ne pas utiliser en production!")
    
    print("\n Endpoints principaux:")
    print("   • POST /api/auth/register - Inscription électeur")
    print("   • POST /api/auth/login - Connexion électeur")
    print("   • POST /api/face/capture - Capture facial")
    print("   • POST /api/face/recognize - Reconnaissance faciale")
    print("   • POST /api/vote/submit - Soumission vote")
    print("   • GET  /api/vote/results - Résultats")
    
    print("\n" + "=" * 50)
    
    # Démarrer le serveur
    try:
        app.run(
            host='0.0.0.0',
            port=5000,
            debug=debug,
            threaded=True
        )
    except KeyboardInterrupt:
        print("\n Arrêt du serveur")
    except Exception as e:
        print(f" Erreur lors du démarrage: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
