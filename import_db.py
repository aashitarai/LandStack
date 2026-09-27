import psycopg
import os

db_url = os.environ.get("DATABASE_URL")
if not db_url:
    print("ERROR: DATABASE_URL not set")
    exit(1)

print(f"Connecting to database...")
try:
    with psycopg.connect(db_url) as conn:
        print("Connected! Reading SQL file...")
        with open("db/landstack_backup.sql", "r") as f:
            sql = f.read()
        
        print("Executing SQL file...")
        with conn.cursor() as cur:
            cur.execute(sql)
        
        conn.commit()
        print("✅ Import complete!")
except Exception as e:
    print(f"❌ Error: {e}")
    exit(1)