import sqlite3
import json

con = sqlite3.connect('sqms.db')
cur = con.cursor()

# Check user columns
cur.execute('PRAGMA table_info(users)')
cols = [r[1] for r in cur.fetchall()]

if 'city' not in cols:
    cur.execute("ALTER TABLE users ADD COLUMN city VARCHAR(100) DEFAULT 'Ahmedabad'")
    print('Added city column')
if 'area' not in cols:
    cur.execute("ALTER TABLE users ADD COLUMN area VARCHAR(100) DEFAULT 'Science City'")
    print('Added area column')
if 'latitude' not in cols:
    cur.execute("ALTER TABLE users ADD COLUMN latitude FLOAT DEFAULT 23.0784")
    print('Added latitude column')
if 'longitude' not in cols:
    cur.execute("ALTER TABLE users ADD COLUMN longitude FLOAT DEFAULT 72.5074")
    print('Added longitude column')

# Update yatrik user location to Science City
cur.execute("UPDATE users SET city='Ahmedabad', area='Science City', latitude=23.0784, longitude=72.5074 WHERE email='yatrikpatel1331@gmail.com'")

# Update existing centers
cur.execute("UPDATE service_centers SET city='Ahmedabad', area='SG Highway', latitude=23.0380, longitude=72.5120 WHERE id=1")
cur.execute("UPDATE service_centers SET city='Ahmedabad', area='Thaltej', latitude=23.0500, longitude=72.5167 WHERE id=2")
cur.execute("UPDATE service_centers SET name='yatrik Car Care - Science City Hub', city='Ahmedabad', area='Science City', address='Plot 42, Sola-Science City Road', latitude=23.0784, longitude=72.5074 WHERE id=3")

# Check if Nikol center exists
cur.execute("SELECT id FROM service_centers WHERE area='Nikol'")
if not cur.fetchone():
    cur.execute("""
        INSERT INTO service_centers (
            franchise_id, name, address, city, area, latitude, longitude, phone,
            capacity, total_bays, total_mechanics, current_workload, status,
            operating_hours_start, operating_hours_end, supported_services
        ) VALUES (
            1, 'Apex Auto Care - Nikol Hub', 'Shop 14, Raspan Arcade, Nikol Ring Road',
            'Ahmedabad', 'Nikol', 23.0520, 72.6710, '+91 98251 44556',
            48, 6, 6, 0.40, 'active', '08:00', '20:00',
            ?
        )
    """, (json.dumps(["General Service", "Oil Change", "Car Wash", "Brake Service", "AC Service"]),))
    nikol_id = cur.lastrowid
    print('Added Nikol center id:', nikol_id)
    for i in range(1, 7):
        cur.execute("INSERT INTO service_bays (service_center_id, bay_number, supported_service_type, status) VALUES (?, ?, ?, ?)",
                    (nikol_id, f'Bay-{i:02d}', 'General Service', 'Available'))
        cur.execute("INSERT INTO mechanics (service_center_id, name, specialization, availability, status) VALUES (?, ?, ?, ?, ?)",
                    (nikol_id, f'Technician {i} (Nikol)', 'General Service', 'Available', 'active'))

# Check if Maninagar center exists
cur.execute("SELECT id FROM service_centers WHERE area='Maninagar'")
if not cur.fetchone():
    cur.execute("""
        INSERT INTO service_centers (
            franchise_id, name, address, city, area, latitude, longitude, phone,
            capacity, total_bays, total_mechanics, current_workload, status,
            operating_hours_start, operating_hours_end, supported_services
        ) VALUES (
            1, 'Apex Precision Workshop - Maninagar', 'Near Kankaria Lake Gate 3, Maninagar',
            'Ahmedabad', 'Maninagar', 22.9970, 72.6030, '+91 98252 77889',
            48, 6, 6, 0.65, 'active', '08:00', '20:00',
            ?
        )
    """, (json.dumps(["General Service", "Oil Change", "Car Wash", "Battery Check", "Tyre Service"]),))
    mani_id = cur.lastrowid
    print('Added Maninagar center id:', mani_id)
    for i in range(1, 7):
        cur.execute("INSERT INTO service_bays (service_center_id, bay_number, supported_service_type, status) VALUES (?, ?, ?, ?)",
                    (mani_id, f'Bay-{i:02d}', 'General Service', 'Available'))
        cur.execute("INSERT INTO mechanics (service_center_id, name, specialization, availability, status) VALUES (?, ?, ?, ?, ?)",
                    (mani_id, f'Technician {i} (Maninagar)', 'General Service', 'Available', 'active'))

con.commit()
rows = cur.execute('SELECT id, name, area, latitude, longitude FROM service_centers').fetchall()
print('All Centers:')
for r in rows:
    print(r)
con.close()
