import psycopg
import json

SOURCE_DB = "postgresql://landstack:landstack@localhost:5432/landstack"
DEST_DB = "postgresql://landstack_db_user:bj2GoYx6STczR81jAtsdZEszZak9yiD5@dpg-dasjk1ojo6nc73c33gi0-a.singapore-postgres.render.com/landstack_db"

try:
    print("Connecting to local database...")
    src = psycopg.connect(SOURCE_DB)
    print("✅ Connected to local DB")
    
    print("Connecting to Render database...")
    dst = psycopg.connect(DEST_DB)
    print("✅ Connected to Render DB")
    
    # Step 1: Copy table schemas
    print("\n📐 Creating table schemas...")
    with src.cursor() as cur:
        cur.execute("""
            SELECT sql FROM sqlite_master WHERE type='table'
        """)
    
    # Get CREATE TABLE statements
    with src.cursor() as cur:
        cur.execute("""
            SELECT tablename FROM pg_tables 
            WHERE schemaname='public'
            ORDER BY tablename
        """)
        tables = [row[0] for row in cur.fetchall()]
    
    for table in tables:
        with src.cursor() as cur:
            # Get CREATE TABLE statement
            cur.execute(f"""
                SELECT 
                    'CREATE TABLE ' || '{table}' || ' (' ||
                    string_agg(
                        column_name || ' ' || data_type || 
                        CASE WHEN is_nullable='NO' THEN ' NOT NULL' ELSE '' END,
                        ', '
                    ) || ')'
                FROM information_schema.columns
                WHERE table_name='{table}'
            """)
            create_stmt = cur.fetchone()[0]
        
        try:
            with dst.cursor() as cur:
                cur.execute(f"DROP TABLE IF EXISTS {table} CASCADE")
                cur.execute(create_stmt)
            dst.commit()
            print(f"  ✅ Created table: {table}")
        except Exception as e:
            print(f"  ⚠️  Table {table}: {e}")
            dst.rollback()
    
    # Step 2: Copy data with proper JSON handling
    print("\n📊 Copying data...")
    for table in tables:
        print(f"\n  📋 Table: {table}")
        
        # Get column info
        with src.cursor() as cur:
            cur.execute(f"""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name='{table}' 
                ORDER BY ordinal_position
            """)
            col_info = cur.fetchall()
            cols = [row[0] for row in col_info]
            col_types = {row[0]: row[1] for row in col_info}
        
        # Get data
        with src.cursor() as cur:
            cur.execute(f"SELECT * FROM {table}")
            rows = cur.fetchall()
        
        if not rows:
            print(f"    ⚪ No data")
            continue
        
        # Insert with proper type conversion
        col_str = ", ".join(cols)
        placeholders = ", ".join(["%s"] * len(cols))
        
        success_count = 0
        for i, row in enumerate(rows):
            try:
                # Convert JSON objects to strings if needed
                converted_row = []
                for j, val in enumerate(row):
                    col_name = cols[j]
                    if isinstance(val, dict):
                        # JSON column - convert to string
                        converted_row.append(json.dumps(val))
                    else:
                        converted_row.append(val)
                
                with dst.cursor() as cur:
                    cur.execute(
                        f"INSERT INTO {table} ({col_str}) VALUES ({placeholders})",
                        converted_row
                    )
                dst.commit()
                success_count += 1
            except Exception as e:
                print(f"    ❌ Row {i}: {str(e)[:80]}")
                dst.rollback()
        
        print(f"    ✅ Copied {success_count}/{len(rows)} rows")
    
    src.close()
    dst.close()
    print("\n✅ Migration complete!")

except Exception as e:
    print(f"\n❌ Fatal error: {e}")
    import traceback
    traceback.print_exc()