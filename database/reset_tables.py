import os
import sqlite3

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'schedule.db')

TABLES_TO_CLEAR = ['emploisDuTemps', 'statistique']

def main():
    if not os.path.exists(DB_PATH):
        print(f"[INFO] Database file not found, nothing to reset: {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    try:
        cur = conn.cursor()
        # Use foreign_keys off for batch clears
        cur.execute('PRAGMA foreign_keys = OFF;')

        # Clear emploisDuTemps and statistique
        for table in TABLES_TO_CLEAR:
            try:
                cur.execute(f'DELETE FROM {table};')
                print(f"[OK] Cleared table {table}")
            except sqlite3.Error as e:
                print(f"[WARN] Could not clear table {table}: {e}")

        # Recreate statistique rows for existing nurses with zero counters
        # (so stats stays in sync and ready for future increments)
        try:
            nurse_ids = [row[0] for row in cur.execute('SELECT id FROM listeInfirmier;').fetchall()]
            for nid in nurse_ids:
                cur.execute('INSERT INTO statistique (infirmierID) VALUES (?);', (nid,))
            print(f"[OK] Recreated {len(nurse_ids)} statistique rows for existing nurses")
        except sqlite3.Error as e:
            print(f"[WARN] Could not recreate statistique rows: {e}")

        conn.commit()
        # Optional: reclaim space
        try:
            cur.execute('VACUUM;')
        except sqlite3.Error:
            pass
        print('[DONE] Reset completed successfully.')
    finally:
        conn.close()

if __name__ == '__main__':
    main()
