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

# Liste des noms de salles pour validation
SALLE_NAMES = ['salle16', 'salle17', 'salle18', 'salle19', 'salle20', 'salle21', 
              'salle22', 'salle23', 'salle24', 'reveil1', 'reveil2', 'perinduction']

# États valides pour les salles
VALID_STATES = ['close', 'unuse', None]

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

# Route pour supprimer un infirmier par son ID
@api_bp.route('/infirmiers/<int:id>', methods=['DELETE'])
def delete_infirmier(id):
    try:
        conn = get_db_connection()
        
        # Vérifier si l'infirmier existe
        infirmier = conn.execute('SELECT * FROM listeInfirmier WHERE id = ?', (id,)).fetchone()
        if infirmier is None:
            conn.close()
            return jsonify({'error': 'Infirmier non trouvé'}), 404
        
        # Vérifier si l'infirmier est affecté à un emploi du temps (pour information uniquement)
        emploi = conn.execute('''
            SELECT * FROM emploisDuTemps 
            WHERE salle16 = ? OR salle17 = ? OR salle18 = ? OR salle19 = ? OR 
                  salle20 = ? OR salle21 = ? OR salle22 = ? OR salle23 = ? OR 
                  salle24 = ? OR reveil1 = ? OR reveil2 = ? OR perinduction = ?
        ''', (id,) * 12).fetchone()
        
        # On conserve l'information mais on n'empêche plus la suppression
        isInSchedule = emploi is not None
        
        # Supprimer d'abord les statistiques associées
        conn.execute('DELETE FROM statistique WHERE infirmierID = ?', (id,))
        
        # Puis supprimer l'infirmier
        conn.execute('DELETE FROM listeInfirmier WHERE id = ?', (id,))
        
        conn.commit()
        conn.close()
        
        # Message personnalisé selon que l'infirmier était assigné ou non
        if isInSchedule:
            return jsonify({
                'success': True, 
                'message': 'Infirmier supprimé avec succès. Note: cet infirmier était affecté à des emplois du temps mais a été retiré de la liste.'
            })
        else:
            return jsonify({'success': True, 'message': 'Infirmier supprimé avec succès'})
    except Exception as e:
        if 'conn' in locals() and conn:
            conn.close()
        return jsonify({'error': str(e)}), 500

# Route pour mettre à jour un infirmier par son ID
@api_bp.route('/infirmiers/<int:id>', methods=['PUT'])
def update_infirmier(id):
    try:
        print(f"DEBUG: PUT /infirmiers/{id} appelé avec data: {request.json}")
        if not request.json:
            return jsonify({'error': 'Données de mise à jour manquantes'}), 400
        
        conn = get_db_connection()
        
        # Vérifier si l'infirmier existe
        infirmier = conn.execute('SELECT * FROM listeInfirmier WHERE id = ?', (id,)).fetchone()
        if infirmier is None:
            conn.close()
            return jsonify({'error': 'Infirmier non trouvé'}), 404
        
        # Récupérer les données du formulaire
        nom = request.json.get('nom', infirmier['nom'])
        prenom = request.json.get('prenom', infirmier['prenom'])
        status = request.json.get('status', infirmier['status'])
        present = request.json.get('present', infirmier['present'])
        
        # Mettre à jour l'infirmier
        conn.execute(
            'UPDATE listeInfirmier SET nom = ?, prenom = ?, status = ?, present = ? WHERE id = ?',
            (nom, prenom, status, present, id)
        )
        
        conn.commit()
        
        # Récupérer l'infirmier mis à jour
        infirmier_updated = conn.execute('SELECT * FROM listeInfirmier WHERE id = ?', (id,)).fetchone()
        conn.close()
        
        return jsonify(dict(infirmier_updated))
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
        status = request.json.get('status', 'J')  # Valeur par défaut 'J'
        present = request.json.get('present', 1)  # Valeur par défaut 1 (présent)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO listeInfirmier (nom, prenom, status, present) VALUES (?, ?, ?, ?)',
            (nom, prenom, status, present)
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
            infirmier_count = {}  # Pour suivre les doublons
            doublons = []  # Liste des salles avec des infirmiers en doublon
            
            for field in ['salle16', 'salle17', 'salle18', 'salle19', 'salle20', 'salle21', 
                       'salle22', 'salle23', 'salle24', 'reveil1', 'reveil2', 'perinduction']:
                if emploi[field]:
                    infirmier_id = emploi[field]
                    
                    # Compter l'occurrence de cet infirmier
                    if infirmier_id in infirmier_count:
                        infirmier_count[infirmier_id].append(field)
                    else:
                        infirmier_count[infirmier_id] = [field]
                    
                    infirmier = conn.execute(
                        'SELECT id, nom, prenom FROM listeInfirmier WHERE id = ?', 
                        (infirmier_id,)
                    ).fetchone()
                    if infirmier:
                        infirmiers_info[field] = dict(infirmier)
            
            # Identifier les salles avec des infirmiers en doublon
            for infirmier_id, salles in infirmier_count.items():
                if len(salles) > 1:  # Si un infirmier apparaît plus d'une fois
                    doublons.extend(salles)
            
            # Ajouter les infos des infirmiers au dictionnaire de l'emploi du temps
            emploi_dict['infirmiers_info'] = infirmiers_info
            emploi_dict['doublons'] = doublons  # Ajouter l'info des doublons
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

# Route pour modifier l'état d'une salle
@api_bp.route('/salle-state', methods=['POST'])
def update_salle_state():
    if not request.json or 'date' not in request.json or 'salle' not in request.json or 'state' not in request.json:
        return jsonify({'error': 'Données incomplètes'}), 400
    
    date = request.json['date']
    salle = request.json['salle']
    state = request.json['state'] if request.json['state'] in ['close', 'unuse'] else None
    
    # Valider le nom de la salle
    if salle not in SALLE_NAMES:
        return jsonify({'error': f'Nom de salle invalide: {salle}'}), 400
    
    try:
        conn = get_db_connection()
        
        # Vérifier si l'emploi du temps existe pour cette date
        emploi = conn.execute('SELECT * FROM emploisDuTemps WHERE date = ?', (date,)).fetchone()
        
        if not emploi:
            # Si l'emploi du temps n'existe pas, le créer
            cursor = conn.cursor()
            fields = ['date'] + SALLE_NAMES + [f'{s}_state' for s in SALLE_NAMES]
            values = [date] + [None for _ in range(len(SALLE_NAMES) * 2)]
            placeholders = ', '.join(['?' for _ in range(len(fields))])
            
            cursor.execute(
                f"INSERT INTO emploisDuTemps ({', '.join(fields)}) VALUES ({placeholders})",
                tuple(values)
            )
            conn.commit()
        
        # Mettre à jour l'état de la salle
        cursor = conn.cursor()
        cursor.execute(
            f"UPDATE emploisDuTemps SET {salle}_state = ? WHERE date = ?",
            (state, date)
        )
        
        # Si l'état est 'close' ou 'unuse', on doit retirer l'infirmier de cette salle
        if state in ['close', 'unuse']:
            cursor.execute(
                f"UPDATE emploisDuTemps SET {salle} = NULL WHERE date = ?",
                (date,)
            )
        
        conn.commit()
        
        # Récupérer l'emploi du temps mis à jour
        emploi_updated = conn.execute('SELECT * FROM emploisDuTemps WHERE date = ?', (date,)).fetchone()
        conn.close()
        
        return jsonify({
            'success': True,
            'date': date,
            'salle': salle,
            'state': state,
            'emploi': dict(emploi_updated) if emploi_updated else None
        })
        
    except Exception as e:
        if 'conn' in locals() and conn:
            conn.close()
        return jsonify({'error': str(e)}), 500

# Route pour récupérer les états des salles pour une date spécifique
@api_bp.route('/salle-states/<string:date>', methods=['GET'])
def get_salle_states(date):
    try:
        conn = get_db_connection()
        
        # Récupérer l'emploi du temps pour cette date
        emploi = conn.execute('SELECT * FROM emploisDuTemps WHERE date = ?', (date,)).fetchone()
        conn.close()
        
        if not emploi:
            return jsonify({
                'date': date,
                'states': {salle: None for salle in SALLE_NAMES}
            })
        
        # Extraire les états des salles
        states = {}
        for salle in SALLE_NAMES:
            state_key = f'{salle}_state'
            states[salle] = emploi[state_key] if state_key in emploi.keys() else None
        
        return jsonify({
            'date': date,
            'states': states
        })
        
    except Exception as e:
        if 'conn' in locals() and conn:
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
        for field in SALLE_NAMES:
            if str(emploi[field]) == str(infirmier_id):
                assigned_room = field
                break
        
        # Vérifier les salles fermées ou non utilisées
        salles_non_disponibles = []
        for field in SALLE_NAMES:
            if emploi[f'{field}_state'] in ['close', 'unuse']:
                salles_non_disponibles.append(field)
        
        conn.close()
        
        # Si l'infirmier n'est affecté nulle part ou s'il est affecté dans la salle actuelle (déplacement)
        available = assigned_room is None or assigned_room == current_room
        
        return jsonify({
            'available': available,
            'assigned_room': assigned_room,
            'sallesOccupees': [assigned_room] if assigned_room and assigned_room != current_room else [],
            'sallesFermees': salles_non_disponibles
        })
        
    except Exception as e:
        if 'conn' in locals() and conn:
            conn.close()
        return jsonify({'error': str(e)}), 500
