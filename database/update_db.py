import sqlite3
import os

# Chemin de la base de données
DATABASE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'schedule.db')

def update_database_schema():
    """Mise à jour du schéma pour ajouter les états des salles"""
    try:
        # Connexion à la base de données
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        # Liste des salles
        salles = ['salle16', 'salle17', 'salle18', 'salle19', 'salle20', 'salle21', 
                  'salle22', 'salle23', 'salle24', 'reveil1', 'reveil2', 'perinduction']
        
        # Ajout des colonnes d'état pour chaque salle
        for salle in salles:
            try:
                cursor.execute(f"ALTER TABLE emploisDuTemps ADD COLUMN {salle}_state TEXT CHECK({salle}_state IN ('close', 'unuse', NULL)) DEFAULT NULL")
                print(f"Colonne {salle}_state ajoutée avec succès")
            except sqlite3.OperationalError as e:
                # Si la colonne existe déjà, on continue
                if "duplicate column name" in str(e):
                    print(f"La colonne {salle}_state existe déjà")
                else:
                    print(f"Erreur lors de l'ajout de {salle}_state: {e}")
        
        # Valider les modifications
        conn.commit()
        print("Mise à jour du schéma terminée avec succès")
        
    except Exception as e:
        print(f"Erreur lors de la mise à jour du schéma: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    update_database_schema()
