import sqlite3
import os

# ── DB path dhundo ─────────────────────────────────────────────────────────
possible_paths = [
    "inventory.db",
    "backend/inventory.db",
    "app/inventory.db",
    "../inventory.db",
]

db_path = None
for path in possible_paths:
    if os.path.exists(path):
        db_path = path
        break

if not db_path:
    db_path = input("inventory.db ka full path do: ").strip()

print(f"\n Using: {db_path}\n")

conn   = sqlite3.connect(db_path)
cursor = conn.cursor()

# ── Helper — column already exist kare to skip karo, crash mat karo ────────
def add_column(table, column, col_type):
    try:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
        print(f"  + {table}.{column}")
    except sqlite3.OperationalError:
        print(f"  ~ {table}.{column} (already exists, skipped)")

# ── Users ──────────────────────────────────────────────────────────────────
print("users:")
add_column("users", "is_active",  "INTEGER DEFAULT 1")
add_column("users", "last_login", "DATETIME")

# ── Products ───────────────────────────────────────────────────────────────
print("\nproducts:")
add_column("products", "description",   "TEXT")
add_column("products", "cost_price",    "REAL")
add_column("products", "reorder_point", "INTEGER DEFAULT 10")
add_column("products", "reorder_qty",   "INTEGER DEFAULT 50")
add_column("products", "supplier_id",   "INTEGER")
add_column("products", "is_active",     "INTEGER DEFAULT 1")
add_column("products", "updated_at",    "DATETIME")

# ── Orders ─────────────────────────────────────────────────────────────────
print("\norders:")
add_column("orders", "unit_price",  "REAL")
add_column("orders", "total_price", "REAL")
add_column("orders", "status",      "TEXT DEFAULT 'pending'")
add_column("orders", "note",        "TEXT")
add_column("orders", "updated_at",  "DATETIME")

# ── Suppliers ──────────────────────────────────────────────────────────────
print("\nsuppliers:")
add_column("suppliers", "lead_time_days", "INTEGER DEFAULT 7")
add_column("suppliers", "is_active",      "INTEGER DEFAULT 1")
add_column("suppliers", "created_at",     "DATETIME")

# ── Stock History ──────────────────────────────────────────────────────────
print("\nstock_history:")
add_column("stock_history", "stock_before", "INTEGER")
add_column("stock_history", "stock_after",  "INTEGER")
add_column("stock_history", "note",         "TEXT")

conn.commit()
conn.close()

print("\n Migration complete! Ab backend restart karo.")
print("  uvicorn app.main:app --reload --port 8001")