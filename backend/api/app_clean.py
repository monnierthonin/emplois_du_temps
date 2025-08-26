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

# Importer le blueprint des routes
from routes import api_bp

app = Flask(__name__)
CORS(app)  # Activer CORS pour toutes les routes

# Enregistrer le blueprint des routes d'API
app.register_blueprint(api_bp, url_prefix='/api')

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

# Note: Les routes principales (/infirmiers, /emplois-du-temps/semaine, etc.)
# ont été déplacées vers le blueprint api_bp dans routes.py

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
