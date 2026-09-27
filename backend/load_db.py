import os
import psycopg

DATABASE_URL = os.environ.get("DATABASE_URL")

if DATABASE_URL:
    try:
        print("Loading database...")
        conn = psycopg.connect(DATABASE_URL)
        with conn.cursor() as cur:
            with open("db/init.sql", "r") as f:
                sql = f.read()
            cur.execute(sql)
        conn.commit()
        conn.close()
        print("✅ Database loaded!")
    except Exception as e:
        print(f"⚠️  Already loaded or error: {e}")