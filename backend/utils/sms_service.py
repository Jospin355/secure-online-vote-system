import os
from flask import current_app

def send_sms(numero_telephone, message):
    """
    Service d'envoi de SMS
    
    Args:
        numero_telephone (str): Numéro de téléphone destinataire
        message (str): Message à envoyer
    
    Returns:
        bool: True si envoi réussi, False sinon
    """
    
    # Mode développement - simulation
    if current_app.config.get('DEBUG', True):
        print(f"📱 SMS SIMULÉ à {numero_telephone}: {message}")
        return True
    
    # Mode production - Twilio
    try:
        from twilio.rest import Client
        
        # Configuration Twilio
        account_sid = current_app.config.get('TWILIO_ACCOUNT_SID')
        auth_token = current_app.config.get('TWILIO_AUTH_TOKEN')
        twilio_number = current_app.config.get('TWILIO_PHONE_NUMBER')
        
        if not all([account_sid, auth_token, twilio_number]):
            current_app.logger.error("Configuration Twilio incomplète")
            return False
        
        # Initialiser le client Twilio
        client = Client(account_sid, auth_token)
        
        # Envoyer le SMS
        message = client.messages.create(
            body=message,
            from_=twilio_number,
            to=numero_telephone
        )
        
        current_app.logger.info(f"SMS envoyé avec succès. SID: {message.sid}")
        return True
        
    except Exception as e:
        current_app.logger.error(f"Erreur envoi SMS: {str(e)}")
        return False

def generate_otp(length=6):
    """
    Générer un code OTP numérique
    
    Args:
        length (int): Longueur du code OTP
    
    Returns:
        str: Code OTP généré
    """
    import random
    import string
    
    return ''.join(random.choices(string.digits, k=length))

def format_phone_number(numero):
    """
    Formater un numéro de téléphone
    
    Args:
        numero (str): Numéro de téléphone brut
    
    Returns:
        str: Numéro formaté
    """
    # Supprimer tous les espaces et caractères spéciaux
    numero_clean = ''.join(filter(str.isdigit, numero))
    
    # Ajouter l'indicatif pays si manquant (exemple pour la France)
    if len(numero_clean) == 10 and numero_clean.startswith('0'):
        numero_clean = '+33' + numero_clean[1:]
    elif len(numero_clean) == 9:
        numero_clean = '+33' + numero_clean
    elif not numero_clean.startswith('+'):
        numero_clean = '+' + numero_clean
    
    return numero_clean

def validate_phone_number(numero):
    """
    Valider un numéro de téléphone
    
    Args:
        numero (str): Numéro de téléphone à valider
    
    Returns:
        bool: True si valide, False sinon
    """
    try:
        numero_format = format_phone_number(numero)
        # Vérification basique de longueur
        return len(numero_format) >= 10 and numero_format.startswith('+')
    except:
        return False
