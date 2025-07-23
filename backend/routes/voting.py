from flask import Blueprint, request, jsonify, session
from models import db, Electeur, Vote, Candidat, SessionAuthentification
from datetime import datetime

voting_bp = Blueprint('voting', __name__)

def is_authenticated():
    """Vérifier si l'utilisateur est authentifié via session Flask ou Bearer token"""
    # Vérifie d'abord le token Bearer
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header[7:]
        auth_session = SessionAuthentification.query.filter_by(session_token=token).first()
        
        if auth_session and not auth_session.is_expired() and auth_session.is_fully_authenticated():
            # Injecte l'id_electeur dans la session temporairement pour le reste du traitement
            session['electeur_id'] = auth_session.id_electeur
            session['logged_in'] = True
            return True

    # Sinon fallback sur session Flask classique
    return session.get('logged_in') and session.get('electeur_id')

@voting_bp.route('/candidates', methods=['GET'])
def get_candidates():
    """Obtenir la liste des candidats"""
    if not is_authenticated():
        return jsonify({'error': 'Non authentifié'}), 401
    
    candidats = Candidat.query.all()
    return jsonify([candidat.to_dict() for candidat in candidats]), 200

@voting_bp.route('/submit', methods=['POST'])
def submit_vote():
    """Soumettre un vote"""
    try:
        if not is_authenticated():
            return jsonify({'error': 'Non authentifié'}), 401
        
        data = request.get_json()
        electeur_id = session.get('electeur_id')
        candidat_id = data.get('candidat_id')
        
        if not candidat_id:
            return jsonify({'error': 'ID du candidat requis'}), 400
        
        # Vérifier que l'électeur existe et n'a pas déjà voté
        electeur = Electeur.query.get(electeur_id)
        if not electeur:
            return jsonify({'error': 'Électeur non trouvé'}), 404
        
        if electeur.a_vote:
            return jsonify({'error': 'Vous avez déjà voté'}), 403
        
        # Vérifier que le candidat existe
        candidat = Candidat.query.get(candidat_id)
        if not candidat:
            return jsonify({'error': 'Candidat non trouvé'}), 404
        
        # Créer le vote
        vote = Vote(
            id_electeur=electeur_id,
            id_candidat=candidat_id,
            heure_vote=datetime.utcnow()
        )
        
        # Marquer l'électeur comme ayant voté
        electeur.a_vote = True
        
        db.session.add(vote)
        db.session.commit()
        
        # Déconnecter l'utilisateur automatiquement
        session.clear()
        
        # 🔷 Retour complet adapté au frontend
        return jsonify({
            'success': True,
            'message': 'Vote enregistré avec succès',
            'transaction_id': f"VT-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{vote.id}",
            'vote_time': vote.heure_vote.isoformat(),
            'candidat': candidat.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@voting_bp.route('/results', methods=['GET'])
def get_results():
    """Obtenir les résultats du vote"""
    try:
        # Compter les votes par candidat
        results = db.session.query(
            Candidat.id,
            Candidat.nom,
            Candidat.parti,
            db.func.count(Vote.id).label('votes')
        ).outerjoin(Vote, Candidat.id == Vote.id_candidat).group_by(Candidat.id).all()
        
        total_votes = Vote.query.count()
        total_electeurs = Electeur.query.count()
        
        results_data = []
        for result in results:
            pourcentage = round((result.votes / total_votes * 100) if total_votes > 0 else 0, 2)
            results_data.append({
                'id': result.id,
                'candidat': result.nom,
                'parti': result.parti,
                'votes': result.votes,
                'pourcentage': pourcentage
            })
        
        # Trier par nombre de votes décroissant
        results_data.sort(key=lambda x: x['votes'], reverse=True)
        
        participation = round((total_votes / total_electeurs * 100) if total_electeurs > 0 else 0, 2)
        
        return jsonify({
            'results': results_data,
            'total_votes': total_votes,
            'total_electeurs': total_electeurs,
            'participation': participation
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@voting_bp.route('/stats', methods=['GET'])
def get_voting_stats():
    """Obtenir les statistiques de vote en temps réel"""
    try:
        total_electeurs = Electeur.query.count()
        electeurs_votes = Electeur.query.filter_by(a_vote=True).count()
        electeurs_inscrits = Electeur.query.filter_by(modele_facial_entraine=True).count()
        
        # Votes par heure (dernières 24h)
        from sqlalchemy import text
        votes_par_heure = db.session.execute(text("""
            SELECT strftime('%H', heure_vote) as heure, COUNT(*) as count
            FROM votes 
            WHERE datetime(heure_vote) >= datetime('now', '-1 day')
            GROUP BY strftime('%H', heure_vote)
            ORDER BY heure
        """)).fetchall()
        
        return jsonify({
            'total_electeurs': total_electeurs,
            'electeurs_votes': electeurs_votes,
            'electeurs_inscrits': electeurs_inscrits,
            'participation': round((electeurs_votes / total_electeurs * 100) if total_electeurs > 0 else 0, 2),
            'votes_par_heure': [{'heure': row[0], 'votes': row[1]} for row in votes_par_heure]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@voting_bp.route('/verify-eligibility', methods=['GET'])
def verify_eligibility():
    """Vérifier l'éligibilité au vote de l'électeur connecté"""
    if not is_authenticated():
        return jsonify({'error': 'Non authentifié'}), 401
    
    electeur_id = session.get('electeur_id')
    electeur = Electeur.query.get(electeur_id)
    
    if not electeur:
        return jsonify({'error': 'Électeur non trouvé'}), 404
    
    return jsonify({
        'eligible': not electeur.a_vote,
        'a_deja_vote': electeur.a_vote,
        'electeur': electeur.to_dict()
    }), 200
