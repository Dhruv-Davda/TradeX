# SQL Database Scripts

This folder contains all SQL scripts for the Trade Manager database setup and maintenance.

## 📁 File Organization

### **Core Setup Scripts**
- `create_all_tables.sql` - Main script to create all database tables
- `setup_database.sql` - Complete database initialization
- `disable_rls.sql` - Disable Row Level Security (for development)

### **Table Creation Scripts**
- `create_merchants_table.sql` - Merchants table structure
- `create_income_expenses_tables.sql` - Income and expenses tables
- `create_stock_table.sql` - Stock/inventory table

### **Schema Updates & Migrations**
- `add_merchant_id_column.sql` - Add merchant_id to trades table
- `add_settlement_columns.sql` - Add settlement-related columns
- `add_settlement_type_column.sql` - Add settlement type column

### **Data Management**
- `clear_all_data.sql` - Clear all data from tables (use with caution!)
- `fix_existing_data.sql` - Fix data inconsistencies
- `simple_shared_data.sql` - Add shared/example data

### **Maintenance & Debugging**
- `emergency_fix.sql` - Emergency database fixes
- `simple_fix.sql` - Simple database fixes
- `check_status.sql` - Check database status and health
- `test_query.sql` - Test queries for debugging

## 🚀 Usage

### **Initial Setup**
```bash
# Run the main setup script
psql -d your_database -f sql/setup_database.sql
```

### **Create All Tables**
```bash
# Create all tables at once
psql -d your_database -f sql/create_all_tables.sql
```

### **Apply Migrations**
```bash
# Apply specific migrations in order
psql -d your_database -f sql/add_merchant_id_column.sql
psql -d your_database -f sql/add_settlement_columns.sql
```

## ⚠️ Important Notes

- **Backup First**: Always backup your database before running any scripts
- **Order Matters**: Some scripts depend on others, check dependencies
- **Development Only**: Some scripts (like `clear_all_data.sql`) are for development only
- **Test Environment**: Test all scripts in a development environment first

## 🔧 Supabase Integration

These scripts are designed to work with Supabase PostgreSQL. Make sure you have:
- Proper database permissions
- Supabase CLI installed (for local development)
- Environment variables configured
