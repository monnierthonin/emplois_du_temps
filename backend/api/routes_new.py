from flask import Blueprint, request, jsonify
import sqlite3
import os
from datetime import datetime, timedelta

# Importer les modèles
from models.infirmier import Infirmier
from models.statistique import Statistique
from models.emplois_du_temps import EmploisDuTemps

# Création du Blueprint pour les routes d'API
api_bp = Blueprint('api', __name__)

# Chemin de la base de données
DATABASE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 
                           'database', 'schedule.db')

# Fonction pour obtenir une connexion à la base de données
def get_db_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# Route pour récupérer tous les infirmiers
@api_bp.route('/infirmiers', methods=['GET'])
@api_bp.route('/infirmiers/', methods=['GET'])
def get_infirmiers():
    try:
        conn = get_db_connection()
        infirmiers = conn.execute('SELECT * FROM listeInfirmier').fetchall()
        conn.close()
        
        # Format la réponse pour correspondre aux attentes du frontend
        return jsonify({
            'infirmiers': [dict(infirmier) for infirmier in infirmiers]
        })
    except Exception as e:
        if 'conn' in locals() and conn:
            conn.close()
        return jsonify({'error': str(e)}), 500

# Route pour récupérer un infirmier par son ID
@api_bp.route('/infirmiers/<int:id>', methods=['GET'])
def get_infirmier(id):
    try:
        conn = get_db_connection()
        infirmier = conn.execute('SELECT * FROM listeInfirmier WHERE id = ?', (id,)).fetchone()
        conn.close()
        
        if infirmier is None:
            return jsonify({'error': 'Infirmier non trouvé'}), 404
        
        return jsonify(dict(infirmier))
    except Exception as e:
        if 'conn' in locals() and conn:
            conn.close()
        return jsonify({'error': str(e)}), 500

# Route pour ajouter un nouvel infirmier
@api_bp.route('/infirmiers', methods=['POST'])
def add_infirmier():
    try:
        print(f"DEBUG: POST /infirmiers appelé avec data: {request.json}")
        if not request.json or 'nom' not in request.json or 'prenom' not in request.json:
            return jsonify({'error': 'Le nom et prénom sont obligatoires'}), 400
        
        nom = request.json['nom']
        prenom = request.json['prenom']
        equipe = request.json.get('equipe', '')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO listeInfirmier (nom, prenom, equipe) VALUES (?, ?, ?)',
            (nom, prenom, equipe)
        )
        conn.commit()
        id = cursor.lastrowid
        
        # Créer une entrée dans la table statistique pour ce nouvel infirmier
        cursor.execute(
            'INSERT INTO statistique (infirmierID) VALUES (?)',
            (id,)
        )
        conn.commit()
        
        # Récupérer l'infirmier nouvellement créé
        infirmier = conn.execute('SELECT * FROM listeInfirmier WHERE id = ?', (id,)).fetchone()
        conn.close()
        
        return jsonify(dict(infirmier)), 201
    except Exception as e:
        if 'conn' in locals() and conn:
            conn.close()
        return jsonify({'error': str(e)}), 500

# Route pour récupérer les emplois du temps d'une semaine
@api_bp.route('/emplois-du-temps/semaine', methods=['GET'])
def get_emplois_du_temps_semaine():
    try:
        debut = request.args.get('debut')
        fin = request.args.get('fin')
        
        if not debut or not fin:
            return jsonify({'error': 'Les dates de début et de fin sont requises'}), 400
        
        conn = get_db_connection()
        emplois = conn.execute(
            'SELECT * FROM emploisDuTemps WHERE date BETWEEN ? AND ? ORDER BY date',
            (debut, fin)
        ).fetchall()
        
        result = []
        
        for emploi in emplois:
            emploi_dict = dict(emploi)
            
            # Récupérer les informations des infirmiers assignés pour chaque salle
            infirmiers_info = {}
            for field in ['salle16', 'salle17', 'salle18', 'salle19', 'salle20', 'salle21', 
                       'salle22', 'salle23', 'salle24', 'reveil1', 'reveil2', 'perinduction']:
                if emploi[field]:
                    infirmier = conn.execute(
                        'SELECT id, nom, prenom FROM listeInfirmier WHERE id = ?', 
                        (emploi[field],)
                    ).fetchone()
                    if infirmier:
                        infirmiers_info[field] = dict(infirmier)
            
            # Ajouter les infos des infirmiers au dictionnaire de l'emploi du temps
            emploi_dict['infirmiers_info'] = infirmiers_info
            result.append(emploi_dict)
        
        conn.close()
        
        return jsonify(result)
    except Exception as e:
        if 'conn' in locals() and conn:
            conn.close()
        return jsonify({'error': str(e)}), 500

# Route pour assigner un infirmier à une salle pour une date spécifique
@api_bp.route('/assign-infirmier', methods=['POST'])
def assign_infirmier():
    if not request.json:
        return jsonify({'error': 'Données JSON requises'}), 400
    
    # Récupérer les données de la requête
    data = request.json
    date = data.get('date')
    salle = data.get('salle')
    # Accepter les deux formats possibles (infirmier_id ou infirmierId)
    infirmier_id = data.get('infirmier_id') if 'infirmier_id' in data else data.get('infirmierId')
    
    print(f"DEBUG: Assignation - date: {date}, salle: {salle}, infirmier_id: {infirmier_id}")
    
    # Vérifier que toutes les données nécessaires sont présentes
    if not date or not salle or infirmier_id is None:
        return jsonify({'error': 'Date, salle et ID infirmier sont requis'}), 400
    
    try:
        conn = get_db_connection()
        
        # Vérifier si l'emploi du temps pour cette date existe
        emploi = conn.execute('SELECT * FROM emploisDuTemps WHERE date = ?', (date,)).fetchone()
        
        if not emploi:
            # Si l'emploi du temps n'existe pas, le créer
            cursor = conn.cursor()
            fields = ['date', 'salle16', 'salle17', 'salle18', 'salle19', 'salle20', 'salle21', 
                    'salle22', 'salle23', 'salle24', 'reveil1', 'reveil2', 'perinduction']
            values = [date] + [None for _ in range(len(fields)-1)]
            placeholders = ', '.join(['?' for _ in range(len(fields))])
            
            cursor.execute(
                f"INSERT INTO emploisDuTemps ({', '.join(fields)}) VALUES ({placeholders})",
                tuple(values)
            )
            conn.commit()
            emploi = conn.execute('SELECT * FROM emploisDuTemps WHERE date = ?', (date,)).fetchone()
        
        # Mise à jour de l'affectation
        cursor = conn.cursor()
        cursor.execute(
            f"UPDATE emploisDuTemps SET {salle} = ? WHERE date = ?",
            (infirmier_id if infirmier_id != 0 and infirmier_id != '0' else None, date)  # Si ID=0 ou '0', mettre NULL
        )
        conn.commit()
        
        # Récupérer l'infirmier pour inclure ses informations dans la réponse
        infirmier_info = None
        if infirmier_id and infirmier_id != 0 and infirmier_id != '0':
            infirmier = conn.execute('SELECT * FROM listeInfirmier WHERE id = ?', (infirmier_id,)).fetchone()
            if infirmier:
                infirmier_info = dict(infirmier)
        
        # Pour mettre à jour les statistiques, on peut utiliser la fonction existante
        # Mais pour cela on doit la réimplémenter ici
        
        conn.close()
        
        return jsonify({
            'success': True,
            'date': date,
            'salle': salle,
            'infirmier_id': infirmier_id,
            'infirmier': infirmier_info
        })
        
    except Exception as e:
        if 'conn' in locals() and conn:
            conn.close()
        return jsonify({'error': str(e)}), 500

# Route pour réinitialiser une affectation
@api_bp.route('/reset-assignment', methods=['POST'])
def reset_assignment():
    if not request.json or 'date' not in request.json or 'salle' not in request.json:
        return jsonify({'error': 'Données incomplètes'}), 400
    
    date = request.json['date']
    salle = request.json['salle']
    
    try:
        conn = get_db_connection()
        
        # Récupérer l'ID de l'infirmier actuellement assigné
        emploi = conn.execute('SELECT * FROM emploisDuTemps WHERE date = ?', (date,)).fetchone()
        
        if not emploi or not emploi[salle]:
            conn.close()
            return jsonify({'error': 'Aucune affectation trouvée'}), 404
        
        infirmier_id = emploi[salle]
        
        # Mettre à jour les statistiques avant de réinitialiser
        conn.execute(f'UPDATE statistique SET {salle} = {salle} - 1 WHERE infirmierID = ? AND {salle} > 0',
                    (infirmier_id,))
        
        # Réinitialiser l'affectation
        conn.execute(f'UPDATE emploisDuTemps SET {salle} = NULL WHERE date = ?', (date,))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Affectation réinitialisée avec succès'
        })
        
    except Exception as e:
        if conn:
            conn.close()
        return jsonify({'error': str(e)}), 500

# Route pour vérifier si un infirmier est déjà assigné à une date spécifique
@api_bp.route('/check-nurse-availability', methods=['GET', 'POST'])
def check_nurse_availability():
    # Récupérer les données en fonction de la méthode HTTP
    if request.method == 'GET':
        infirmier_id = request.args.get('infirmier_id')
        date = request.args.get('date')
        current_room = request.args.get('current_room', None)
    else:  # POST
        if not request.json or 'infirmierId' not in request.json or 'date' not in request.json:
            return jsonify({'error': 'Données incomplètes'}), 400
        infirmier_id = request.json['infirmierId']
        date = request.json['date']
        current_room = request.json.get('sourceSalle', None)
    
    try:
        conn = get_db_connection()
        
        # Vérifier si l'emploi du temps existe pour cette date
        emploi = conn.execute('SELECT * FROM emploisDuTemps WHERE date = ?', (date,)).fetchone()
        
        if not emploi:
            conn.close()
            # Si pas d'emploi du temps pour cette date, l'infirmier est disponible partout
            return jsonify({
                'available': True,
                'assigned_room': None,
                'sallesOccupees': []
            })
        
        # Vérifier dans quelle salle l'infirmier est affecté ce jour-là
        assigned_room = None
        for field in ['salle16', 'salle17', 'salle18', 'salle19', 'salle20', 'salle21', 
                    'salle22', 'salle23', 'salle24', 'reveil1', 'reveil2', 'perinduction']:
            if str(emploi[field]) == str(infirmier_id):
                assigned_room = field
                break
        
        conn.close()
        
        # Si l'infirmier n'est affecté nulle part ou s'il est affecté dans la salle actuelle (déplacement)
        available = assigned_room is None or assigned_room == current_room
        
        return jsonify({
            'available': available,
            'assigned_room': assigned_room,
            'sallesOccupees': [assigned_room] if assigned_room and assigned_room != current_room else []
        })
        
    except Exception as e:
        if 'conn' in locals() and conn:
            conn.close()
        return jsonify({'error': str(e)}), 500
