import os

# Script de migration déprécié
# Désormais, le schéma complet est défini dans `database/db_schema.sql`.
# Ce script ne fait plus aucune modification et est conservé uniquement pour référence.

def main():
    here = os.path.dirname(os.path.abspath(__file__))
    print("[INFO] Migration désactivée. Utilisez le fichier unique de schéma:")
    print(f"       {os.path.join(here, 'db_schema.sql')}")
    print("[INFO] Pour repartir proprement en dev: supprimez schedule.db puis relancez l'application.")

if __name__ == "__main__":
    main()
