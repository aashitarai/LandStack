with open('db/landstack_backup.sql', 'rb') as f:
    content = f.read()

# Remove invalid UTF-8 bytes
try:
    cleaned = content.decode('utf-8', errors='ignore').encode('utf-8')
except:
    cleaned = content.decode('latin-1', errors='ignore').encode('utf-8')

with open('db/landstack_backup_clean.sql', 'wb') as f:
    f.write(cleaned)

print("✅ Cleaned SQL file created!")