from app import db
from datetime import datetime



class Electeur(db.Model):
    """Table des électeurs"""
    __tablename__ = 'electeurs'
    
    id = db.Column(db.Integer, primary_key=True)
    identifiant_electeur = db.Column(db.String(50), unique=True, nullable=False)
    identifiant_aadhar = db.Column(db.String(50), unique=True, nullable=False)
    numero_telephone = db.Column(db.String(20), nullable=False)
    a_vote = db.Column(db.Boolean, default=False)
    date_inscription = db.Column(db.DateTime, default=datetime.utcnow)
    modele_facial_entraine = db.Column(db.Boolean, default=False)
    
    def __repr__(self):
        return f'<Electeur {self.identifiant_electeur}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'identifiant_electeur': self.identifiant_electeur,
            'identifiant_aadhar': self.identifiant_aadhar,
            'numero_telephone': self.numero_telephone,
            'a_vote': self.a_vote,
            'date_inscription': self.date_inscription.isoformat() if self.date_inscription else None,
            'modele_facial_entraine': self.modele_facial_entraine
        }

class Vote(db.Model):
    """Table des votes"""
    __tablename__ = 'votes'
    
    id = db.Column(db.Integer, primary_key=True)
    id_electeur = db.Column(db.Integer, db.ForeignKey('electeurs.id'), nullable=False)
    id_candidat = db.Column(db.Integer, db.ForeignKey('candidats.id'), nullable=False)
    heure_vote = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    electeur = db.relationship('Electeur', backref=db.backref('votes', lazy=True))
    candidat = db.relationship('Candidat', backref=db.backref('votes', lazy=True))
    
    def __repr__(self):
        return f'<Vote {self.id} - Electeur: {self.id_electeur} - Candidat: {self.id_candidat}>'

class Candidat(db.Model):
    """Table des candidats"""
    __tablename__ = 'candidats'
    
    id = db.Column(db.Integer, primary_key=True)
    nom = db.Column(db.String(100), nullable=False)
    parti = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    date_ajout = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Candidat {self.nom} - {self.parti}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'nom': self.nom,
            'parti': self.parti,
            'description': self.description,
            'date_ajout': self.date_ajout.isoformat() if self.date_ajout else None
        }

class OTP(db.Model):
    """Table pour les codes OTP"""
    __tablename__ = 'otps'
    
    id = db.Column(db.Integer, primary_key=True)
    numero_telephone = db.Column(db.String(20), nullable=False)
    code = db.Column(db.String(6), nullable=False)
    expire_at = db.Column(db.DateTime, nullable=False)
    utilise = db.Column(db.Boolean, default=False)
    type_otp = db.Column(db.String(20), nullable=False)  # 'registration' or 'login'
    
    def __repr__(self):
        return f'<OTP {self.code} for {self.numero_telephone}>'
    
    def is_expired(self):
        return datetime.utcnow() > self.expire_at
    
    def is_valid(self):
        return not self.utilise and not self.is_expired()

class SessionAuthentification(db.Model):
    """Table pour les sessions d'authentification"""
    __tablename__ = 'sessions_auth'
    
    id = db.Column(db.Integer, primary_key=True)
    id_electeur = db.Column(db.Integer, db.ForeignKey('electeurs.id'), nullable=False)
    etape_1_complete = db.Column(db.Boolean, default=False)  # Identifiants
    etape_2_complete = db.Column(db.Boolean, default=False)  # OTP
    etape_3_complete = db.Column(db.Boolean, default=False)  # Reconnaissance faciale
    session_token = db.Column(db.String(100), unique=True, nullable=False)
    expire_at = db.Column(db.DateTime, nullable=False)
    date_creation = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    electeur = db.relationship('Electeur', backref=db.backref('sessions', lazy=True))
    
    def __repr__(self):
        return f'<SessionAuth {self.session_token} for electeur {self.id_electeur}>'
    
    def is_expired(self):
        return datetime.utcnow() > self.expire_at
    
    def is_fully_authenticated(self):
        return (self.etape_1_complete and 
                self.etape_2_complete and 
                self.etape_3_complete and 
                not self.is_expired())
