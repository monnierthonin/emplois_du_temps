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

# ============================
# Helpers: statistiques / labels
# ============================

def parse_label(label: str):
    """Parse a label of the form 'Prenom Nom - Status' and return (prenom, nom, status or None).
    Be tolerant to extra spaces and optional ' - Status'."""
    if not label:
        return None, None, None
    parts = label.split('-')
    left = parts[0].strip()
    status = parts[1].strip() if len(parts) > 1 else None
    # Split left into prenom and nom by last space (to be a bit more tolerant)
    if ' ' in left:
        prenom = left.split(' ')[0].strip()
        nom = ' '.join(left.split(' ')[1:]).strip()
    else:
        # Fallback if we cannot split properly
        prenom = left.strip()
        nom = ''
    return prenom, nom, status

def get_infirmier_id_from_label(conn, label: str):
    prenom, nom, status = parse_label(label)
    if not prenom:
        return None
    if status:
        row = conn.execute(
            'SELECT id FROM listeInfirmier WHERE prenom = ? AND nom = ? AND status = ? LIMIT 1',
            (prenom, nom, status)
        ).fetchone()
    else:
        row = conn.execute(
            'SELECT id FROM listeInfirmier WHERE prenom = ? AND nom = ? LIMIT 1',
            (prenom, nom)
        ).fetchone()
    return row['id'] if row else None

def ensure_stat_row(conn, infirmier_id: int):
    if not infirmier_id:
        return
    row = conn.execute('SELECT id FROM statistique WHERE infirmierID = ?', (infirmier_id,)).fetchone()
    if not row:
        conn.execute('INSERT INTO statistique (infirmierID) VALUES (?)', (infirmier_id,))

def increment_stat(conn, infirmier_id: int, salle: str):
    if not infirmier_id or not salle:
        return
    ensure_stat_row(conn, infirmier_id)
    conn.execute(f'UPDATE statistique SET {salle} = COALESCE({salle}, 0) + 1 WHERE infirmierID = ?', (infirmier_id,))
    print_stat_table(conn)

def decrement_stat(conn, infirmier_id: int, salle: str):
    if not infirmier_id or not salle:
        return
    ensure_stat_row(conn, infirmier_id)
    conn.execute(f'UPDATE statistique SET {salle} = CASE WHEN {salle} > 0 THEN {salle} - 1 ELSE 0 END WHERE infirmierID = ?', (infirmier_id,))
    print_stat_table(conn)

def print_stat_table(conn):
    rows = conn.execute('SELECT * FROM statistique').fetchall()
    print('[STATISTIQUE] Table complète:')
    for r in rows:
        print(dict(r))

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

# ============================
# Statistiques API
# ============================

@api_bp.route('/statistiques', methods=['GET'])
def get_statistiques():
    try:
        conn = get_db_connection()

        rooms = SALLE_NAMES
        # Join nurses with stats; if no stats row, coalesce to 0
        cols = ', '.join([f"COALESCE(s.{r}, 0) AS {r}" for r in rooms])
        query = f"""
            SELECT i.id, i.prenom, i.nom, i.status, {cols}
            FROM listeInfirmier i
            LEFT JOIN statistique s ON s.infirmierID = i.id
            ORDER BY i.prenom, i.nom
        """
        rows = conn.execute(query).fetchall()
        conn.close()

        datasets = []
        for row in rows:
            label = f"{row['prenom']} {row['nom']} - {row['status']}"
            data = [row[r] for r in rooms]
            datasets.append({
                'id': row['id'],
                'label': label,
                'data': data
            })

        return jsonify({
            'rooms': rooms,
            'datasets': datasets
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
        
        # Supprimer d'abord les statistiques associées
        conn.execute('DELETE FROM statistique WHERE infirmierID = ?', (id,))
        
        # Puis supprimer l'infirmier
        conn.execute('DELETE FROM listeInfirmier WHERE id = ?', (id,))
        
        conn.commit()
        conn.close()
        
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

            # Avec le nouveau modèle, les colonnes de salle contiennent directement
            # le libellé texte ("Prenom Nom - Status").
            labels = {}
            label_count = {}
            doublons = []

            for field in ['salle16', 'salle17', 'salle18', 'salle19', 'salle20', 'salle21',
                          'salle22', 'salle23', 'salle24', 'reveil1', 'reveil2', 'perinduction']:
                label = emploi[field]
                if label:
                    labels[field] = label
                    if label in label_count:
                        label_count[label].append(field)
                    else:
                        label_count[label] = [field]

            # Identifier les salles avec le même libellé (doublons visuels)
            for _, salles in label_count.items():
                if len(salles) > 1:
                    doublons.extend(salles)

            emploi_dict['labels'] = labels
            emploi_dict['doublons'] = doublons
            result.append(emploi_dict)
        
        conn.close()
        
        return jsonify(result)
    except Exception as e:
        if 'conn' in locals() and conn:
            conn.close()
        return jsonify({'error': str(e)}), 500

# Route pour assigner un infirmier (par libellé) à une salle pour une date spécifique
@api_bp.route('/assign-infirmier', methods=['POST'])
def assign_infirmier():
    if not request.json:
        return jsonify({'error': 'Données JSON requises'}), 400
    
    # Récupérer les données de la requête
    data = request.json
    date = data.get('date')
    salle = data.get('salle')
    # Nouveau modèle: on reçoit un libellé de texte (label). Pour compat, on accepte encore *_id
    label = data.get('label')
    infirmier_id = data.get('infirmier_id') if 'infirmier_id' in data else data.get('infirmierId')
    
    print(f"DEBUG: Assignation - date: {date}, salle: {salle}, infirmier_id: {infirmier_id}")
    
    # Vérifier que toutes les données nécessaires sont présentes
    if not date or not salle:
        return jsonify({'error': 'Date et salle sont requis'}), 400
    
    try:
        conn = get_db_connection()
        
        # Vérifier si l'emploi du temps pour cette date existe
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
            emploi = conn.execute('SELECT * FROM emploisDuTemps WHERE date = ?', (date,)).fetchone()
        
        # Déterminer la valeur à écrire (label prioritaire). Si label vide/None => NULL
        cursor = conn.cursor()
        value = None
        if label is not None:
            value = label.strip() or None
        elif infirmier_id is not None:
            # Compat: si on reçoit encore un ID, on le transforme en libellé en recherchant dans listeInfirmier
            if str(infirmier_id) != '0':
                inf = conn.execute('SELECT nom, prenom, status FROM listeInfirmier WHERE id = ?', (infirmier_id,)).fetchone()
                if inf:
                    value = f"{inf['prenom']} {inf['nom']} - {inf['status']}"
                else:
                    value = None
            else:
                value = None
        # Statistiques selon les cas
        existing = emploi[salle] if emploi else None
        if value is None:
            # Cas: on veut effacer l'affectation via assign-infirmier
            if existing:
                old_id = get_infirmier_id_from_label(conn, existing)
                if old_id:
                    decrement_stat(conn, old_id, salle)
            cursor.execute(f"UPDATE emploisDuTemps SET {salle} = NULL WHERE date = ?", (date,))
        else:
            # Cas: on assigne un nouveau label
            # Si on remplace une valeur différente, décrémenter l'ancienne
            if existing and existing != value:
                old_id = get_infirmier_id_from_label(conn, existing)
                if old_id:
                    decrement_stat(conn, old_id, salle)
            # Mettre à jour la valeur
            cursor.execute(f"UPDATE emploisDuTemps SET {salle} = ? WHERE date = ?", (value, date))
            # Incrémenter la nouvelle statistique
            new_id = get_infirmier_id_from_label(conn, value)
            if new_id:
                increment_stat(conn, new_id, salle)

        conn.commit()

        conn.close()
        
        return jsonify({
            'success': True,
            'date': date,
            'salle': salle,
            'label': value
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
        
        # Récupérer l'affectation actuelle
        emploi = conn.execute('SELECT * FROM emploisDuTemps WHERE date = ?', (date,)).fetchone()

        if not emploi or not emploi[salle]:
            conn.close()
            return jsonify({'error': 'Aucune affectation trouvée'}), 404

        # Avant de réinitialiser, décrémenter la statistique associée à l'ancien label
        old_label = emploi[salle]
        old_id = get_infirmier_id_from_label(conn, old_label)
        if old_id:
            decrement_stat(conn, old_id, salle)

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
            # Si un label est présent, décrémenter les stats avant d'effacer
            emploi_before = conn.execute('SELECT * FROM emploisDuTemps WHERE date = ?', (date,)).fetchone()
            if emploi_before and emploi_before[salle]:
                old_label = emploi_before[salle]
                old_id = get_infirmier_id_from_label(conn, old_label)
                if old_id:
                    decrement_stat(conn, old_id, salle)
            cursor.execute(f"UPDATE emploisDuTemps SET {salle} = NULL WHERE date = ?", (date,))
        
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

# Route pour vérifier si un libellé est déjà assigné à une date spécifique
@api_bp.route('/check-nurse-availability', methods=['GET', 'POST'])
def check_nurse_availability():
    # Récupérer les données en fonction de la méthode HTTP
    if request.method == 'GET':
        label = request.args.get('label')
        date = request.args.get('date')
        current_room = request.args.get('current_room', None)
    else:  # POST
        if not request.json or ('label' not in request.json and 'infirmierId' not in request.json) or 'date' not in request.json:
            return jsonify({'error': 'Données incomplètes'}), 400
        label = request.json.get('label')
        if label is None and 'infirmierId' in request.json:
            # Compat: on peut convertir un ID en label si besoin
            with get_db_connection() as conn:
                inf = conn.execute('SELECT nom, prenom, status FROM listeInfirmier WHERE id = ?', (request.json['infirmierId'],)).fetchone()
                label = f"{inf['prenom']} {inf['nom']} - {inf['status']}" if inf else None
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
        
        # Vérifier dans quelle salle ce libellé est affecté ce jour-là
        assigned_room = None
        for field in SALLE_NAMES:
            if emploi[field] and label and str(emploi[field]) == str(label):
                assigned_room = field
                break
        
        # Vérifier les salles fermées ou non utilisées
        salles_non_disponibles = []
        for field in SALLE_NAMES:
            if emploi[f'{field}_state'] in ['close', 'unuse']:
                salles_non_disponibles.append(field)
        
        conn.close()
        
        # Si le libellé n'est affecté nulle part ou s'il est affecté dans la salle actuelle (déplacement)
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
