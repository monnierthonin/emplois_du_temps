from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import os
import sys

# Ajouter le dossier parent au chemin pour pouvoir importer les modèles
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models.infirmier import Infirmier
from models.statistique import Statistique
from models.emplois_du_temps import EmploisDuTemps

app = Flask(__name__)
CORS(app)  # Activer CORS pour toutes les routes

# Chemin de la base de données
DATABASE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 
                             'database', 'schedule.db')

# Fonction pour obtenir une connexion à la base de données
def get_db_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# Vérifier si la base de données existe, sinon la créer
def init_db():
    if not os.path.exists(DATABASE_PATH):
        os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
        conn = get_db_connection()
        
        # Lire le fichier de schéma SQL
        schema_path = os.path.join(os.path.dirname(DATABASE_PATH), 'db_schema.sql')
        with open(schema_path, 'r') as f:
            schema = f.read()
        
        # Exécuter le script SQL pour créer les tables
        conn.executescript(schema)
        conn.commit()
        conn.close()
        print("Base de données initialisée.")

# Routes API

@app.route('/')
def index():
    return jsonify({
        'message': 'API d\'emploi du temps pour infirmiers',
        'status': 'running'
    })

# Routes pour les infirmiers
@app.route('/api/infirmiers', methods=['GET'])
def get_infirmiers():
    conn = get_db_connection()
    infirmiers = conn.execute('SELECT * FROM listeInfirmier').fetchall()
    conn.close()
    
    return jsonify([dict(infirmier) for infirmier in infirmiers])

@app.route('/api/infirmiers/<int:id>', methods=['GET'])
def get_infirmier(id):
    conn = get_db_connection()
    infirmier = conn.execute('SELECT * FROM listeInfirmier WHERE id = ?', (id,)).fetchone()
    conn.close()
    
    if infirmier is None:
        return jsonify({'error': 'Infirmier non trouvé'}), 404
    
    return jsonify(dict(infirmier))

@app.route('/api/infirmiers', methods=['POST'])
def add_infirmier():
    if not request.json or 'nom' not in request.json or 'prenom' not in request.json:
        return jsonify({'error': 'Le nom et prénom sont obligatoires'}), 400
    
    nom = request.json['nom']
    prenom = request.json['prenom']
    status = request.json.get('status', 'J')  # Statut par défaut
    present = request.json.get('present', True)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO listeInfirmier (nom, prenom, status, present) VALUES (?, ?, ?, ?)',
        (nom, prenom, status, 1 if present else 0)
    )
    conn.commit()
    infirmier_id = cursor.lastrowid
    
    # Créer une entrée dans la table statistique pour ce nouvel infirmier
    cursor.execute(
        'INSERT INTO statistique (infirmierID) VALUES (?)',
        (infirmier_id,)
    )
    conn.commit()
    conn.close()
    
    return jsonify({
        'id': infirmier_id,
        'nom': nom,
        'prenom': prenom,
        'status': status,
        'present': present
    }), 201

@app.route('/api/infirmiers/<int:id>', methods=['PUT'])
def update_infirmier(id):
    conn = get_db_connection()
    infirmier = conn.execute('SELECT * FROM listeInfirmier WHERE id = ?', (id,)).fetchone()
    
    if infirmier is None:
        conn.close()
        return jsonify({'error': 'Infirmier non trouvé'}), 404
    
    data = request.json
    nom = data.get('nom', infirmier['nom'])
    prenom = data.get('prenom', infirmier['prenom'])
    status = data.get('status', infirmier['status'])
    present = data.get('present', bool(infirmier['present']))
    
    cursor = conn.cursor()
    cursor.execute(
        'UPDATE listeInfirmier SET nom = ?, prenom = ?, status = ?, present = ? WHERE id = ?',
        (nom, prenom, status, 1 if present else 0, id)
    )
    conn.commit()
    conn.close()
    
    return jsonify({
        'id': id,
        'nom': nom,
        'prenom': prenom,
        'status': status,
        'present': present
    })

# Routes pour les statistiques
@app.route('/api/statistiques', methods=['GET'])
def get_statistiques():
    conn = get_db_connection()
    statistiques = conn.execute(
        '''
        SELECT s.*, i.nom, i.prenom 
        FROM statistique s
        JOIN listeInfirmier i ON s.infirmierID = i.id
        '''
    ).fetchall()
    conn.close()
    
    return jsonify([dict(stat) for stat in statistiques])

@app.route('/api/statistiques/<int:infirmier_id>', methods=['GET'])
def get_statistique_by_infirmier(infirmier_id):
    conn = get_db_connection()
    statistique = conn.execute(
        '''
        SELECT s.*, i.nom, i.prenom 
        FROM statistique s
        JOIN listeInfirmier i ON s.infirmierID = i.id
        WHERE s.infirmierID = ?
        ''', 
        (infirmier_id,)
    ).fetchone()
    conn.close()
    
    if statistique is None:
        return jsonify({'error': 'Statistique non trouvée pour cet infirmier'}), 404
    
    return jsonify(dict(statistique))

@app.route('/api/statistiques/<int:infirmier_id>', methods=['PUT'])
def update_statistique(infirmier_id):
    conn = get_db_connection()
    statistique = conn.execute('SELECT * FROM statistique WHERE infirmierID = ?', (infirmier_id,)).fetchone()
    
    if statistique is None:
        conn.close()
        return jsonify({'error': 'Statistique non trouvée pour cet infirmier'}), 404
    
    # Récupérer tous les champs de la table
    data = request.json
    fields = ['salle16', 'salle17', 'salle18', 'salle19', 'salle20', 'salle21', 
              'salle22', 'salle23', 'salle24', 'reveil1', 'reveil2', 'perinduction']
    
    # Construire la requête de mise à jour dynamiquement
    updates = []
    values = []
    for field in fields:
        updates.append(f"{field} = ?")
        values.append(data.get(field, statistique[field]))
    
    # Ajouter l'ID à la fin des valeurs
    values.append(infirmier_id)
    
    cursor = conn.cursor()
    cursor.execute(
        f"UPDATE statistique SET {', '.join(updates)} WHERE infirmierID = ?",
        tuple(values)
    )
    conn.commit()
    conn.close()
    
    # Récupérer les données mises à jour
    conn = get_db_connection()
    updated_stat = conn.execute('SELECT * FROM statistique WHERE infirmierID = ?', (infirmier_id,)).fetchone()
    conn.close()
    
    return jsonify(dict(updated_stat))

# Routes pour les emplois du temps
@app.route('/api/emploisdutemps', methods=['GET'])
def get_emploisdutemps():
    date = request.args.get('date')
    
    conn = get_db_connection()
    if date:
        emplois = conn.execute('SELECT * FROM emploisDuTemps WHERE date = ?', (date,)).fetchall()
    else:
        emplois = conn.execute('SELECT * FROM emploisDuTemps ORDER BY date').fetchall()
    conn.close()
    
    return jsonify([dict(emploi) for emploi in emplois])

@app.route('/api/emploisdutemps/<date>', methods=['GET'])
def get_emploisdutemps_by_date(date):
    conn = get_db_connection()
    emploi = conn.execute('SELECT * FROM emploisDuTemps WHERE date = ?', (date,)).fetchone()
    conn.close()
    
    if emploi is None:
        return jsonify({'error': 'Emploi du temps non trouvé pour cette date'}), 404
    
    # Récupérer les informations des infirmiers assignés
    infirmiers_info = {}
    conn = get_db_connection()
    for field in ['salle16', 'salle17', 'salle18', 'salle19', 'salle20', 'salle21', 
                 'salle22', 'salle23', 'salle24', 'reveil1', 'reveil2', 'perinduction']:
        if emploi[field]:
            infirmier = conn.execute(
                'SELECT id, nom, prenom FROM listeInfirmier WHERE id = ?', 
                (emploi[field],)
            ).fetchone()
            if infirmier:
                infirmiers_info[field] = dict(infirmier)
    conn.close()
    
    result = dict(emploi)
    result['infirmiers_info'] = infirmiers_info
    
    return jsonify(result)

@app.route('/api/emploisdutemps', methods=['POST'])
def add_emploisdutemps():
    if not request.json or 'date' not in request.json:
        return jsonify({'error': 'La date est obligatoire'}), 400
    
    date = request.json['date']
    
    # Vérifier si un emploi du temps existe déjà pour cette date
    conn = get_db_connection()
    existing = conn.execute('SELECT id FROM emploisDuTemps WHERE date = ?', (date,)).fetchone()
    
    if existing:
        conn.close()
        return jsonify({'error': 'Un emploi du temps existe déjà pour cette date'}), 400
    
    # Préparer les affectations
    fields = ['date', 'salle16', 'salle17', 'salle18', 'salle19', 'salle20', 'salle21', 
              'salle22', 'salle23', 'salle24', 'reveil1', 'reveil2', 'perinduction']
    values = [date]
    
    for field in fields[1:]:  # Saute la date qui est déjà ajoutée
        values.append(request.json.get(field))
    
    # Insérer le nouvel emploi du temps
    placeholders = ', '.join(['?' for _ in range(len(fields))])
    cursor = conn.cursor()
    cursor.execute(
        f"INSERT INTO emploisDuTemps ({', '.join(fields)}) VALUES ({placeholders})",
        tuple(values)
    )
    conn.commit()
    id = cursor.lastrowid
    conn.close()
    
    # Mettre à jour les statistiques pour chaque infirmier assigné
    update_statistiques_from_assignment(request.json)
    
    return jsonify({'id': id, 'date': date, **{f: request.json.get(f) for f in fields[1:]}}), 201

@app.route('/api/emploisdutemps/<date>', methods=['PUT'])
def update_emploisdutemps(date):
    conn = get_db_connection()
    emploi = conn.execute('SELECT * FROM emploisDuTemps WHERE date = ?', (date,)).fetchone()
    
    if emploi is None:
        conn.close()
        return jsonify({'error': 'Emploi du temps non trouvé pour cette date'}), 404
    
    # Préparer les affectations
    fields = ['salle16', 'salle17', 'salle18', 'salle19', 'salle20', 'salle21', 
              'salle22', 'salle23', 'salle24', 'reveil1', 'reveil2', 'perinduction']
    
    # Construire la requête de mise à jour dynamiquement
    updates = []
    values = []
    for field in fields:
        updates.append(f"{field} = ?")
        values.append(request.json.get(field, emploi[field]))
    
    # Ajouter la date à la fin des valeurs
    values.append(date)
    
    cursor = conn.cursor()
    cursor.execute(
        f"UPDATE emploisDuTemps SET {', '.join(updates)} WHERE date = ?",
        tuple(values)
    )
    conn.commit()
    conn.close()
    
    # Mettre à jour les statistiques pour les nouvelles affectations
    update_statistiques_from_assignment(request.json, date)
    
    # Récupérer les données mises à jour
    conn = get_db_connection()
    updated_emploi = conn.execute('SELECT * FROM emploisDuTemps WHERE date = ?', (date,)).fetchone()
    conn.close()
    
    return jsonify(dict(updated_emploi))

# Fonction utilitaire pour mettre à jour les statistiques après affectation
def update_statistiques_from_assignment(assignment_data, existing_date=None):
    fields = ['salle16', 'salle17', 'salle18', 'salle19', 'salle20', 'salle21', 
              'salle22', 'salle23', 'salle24', 'reveil1', 'reveil2', 'perinduction']
    
    # Si on met à jour un emploi du temps existant, récupérer les anciennes affectations
    old_assignments = {}
    if existing_date:
        conn = get_db_connection()
        old_emploi = conn.execute('SELECT * FROM emploisDuTemps WHERE date = ?', (existing_date,)).fetchone()
        conn.close()
        if old_emploi:
            for field in fields:
                old_assignments[field] = old_emploi[field]
    
    # Mettre à jour les statistiques pour chaque affectation
    for field in fields:
        if field in assignment_data and assignment_data[field]:
            infirmier_id = assignment_data[field]
            
            # Décrémenter l'ancienne affectation si elle existe et est différente
            if existing_date and field in old_assignments and old_assignments[field] and old_assignments[field] != infirmier_id:
                conn = get_db_connection()
                conn.execute(
                    f"UPDATE statistique SET {field} = {field} - 1 WHERE infirmierID = ? AND {field} > 0",
                    (old_assignments[field],)
                )
                conn.commit()
                conn.close()
            
            # Incrémenter la nouvelle affectation si nouvelle ou différente de l'ancienne
            if not existing_date or not field in old_assignments or old_assignments[field] != infirmier_id:
                conn = get_db_connection()
                conn.execute(
                    f"UPDATE statistique SET {field} = {field} + 1 WHERE infirmierID = ?",
                    (infirmier_id,)
                )
                conn.commit()
                conn.close()

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)
