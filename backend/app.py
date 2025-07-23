from flask import Flask, request, jsonify, session, send_file
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import os
import cv2
import numpy as np
import base64
import random
import string
from datetime import datetime, timedelta
import json

# Configuration
app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-change-in-production'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///voting_system.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'faces_data'
app.config['MODELS_FOLDER'] = 'models'

# Initialize extensions
db = SQLAlchemy(app)
CORS(app, supports_credentials=True)

# Create folders if they don't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['MODELS_FOLDER'], exist_ok=True)

# Import models and routes
from models import Electeur, Vote, Candidat, OTP
from routes.auth import auth_bp
from routes.voting import voting_bp
from routes.face_recognition import face_bp

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(voting_bp, url_prefix='/api/vote')
app.register_blueprint(face_bp, url_prefix='/api/face')


def create_tables():
    """Create database tables and sample data"""
    db.create_all()
    
    # Create sample candidates if they don't exist
    if not Candidat.query.first():
        candidats = [
            Candidat(nom='Jean Dupont', parti='Parti A', description='Candidat expérimenté'),
            Candidat(nom='Marie Martin', parti='Parti B', description='Nouvelle génération'),
            Candidat(nom='Pierre Durand', parti='Parti C', description='Indépendant')
        ]
        for candidat in candidats:
            db.session.add(candidat)
        db.session.commit()

@app.route('/api/health')
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'message': 'Server is running'})

@app.route('/api/candidates')
def get_candidates():
    """Get all candidates"""
    candidats = Candidat.query.all()
    return jsonify([{
        'id': c.id,
        'nom': c.nom,
        'parti': c.parti,
        'description': c.description
    } for c in candidats])

@app.route('/api/results')
def get_results():
    """Get voting results"""
    results = db.session.query(
        Candidat.nom,
        Candidat.parti,
        db.func.count(Vote.id).label('votes')
    ).outerjoin(Vote, Candidat.id == Vote.id_candidat).group_by(Candidat.id).all()
    
    total_votes = Vote.query.count()
    
    return jsonify({
        'results': [{
            'candidat': r.nom,
            'parti': r.parti,
            'votes': r.votes,
            'pourcentage': round((r.votes / total_votes * 100) if total_votes > 0 else 0, 2)
        } for r in results],
        'total_votes': total_votes
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
