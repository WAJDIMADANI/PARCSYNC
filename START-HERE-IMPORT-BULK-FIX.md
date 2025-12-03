# 🚀 START HERE - Fix Import Bulk Permission

## ⚠️ Problem Identified

**Error**: `ERREUR : 42703 : la colonne u.role n'existe pas`

**Cause**: The table `app_utilisateur` does NOT have a `role` column.

**Solution**: Use the corrected script that works with permissions instead of roles.

---

## ✅ Quick Fix - 3 Steps

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase dashboard
2. Click on **SQL Editor**

### Step 2: Execute the Corrected Script

Copy and paste the content from:
```
add-import-bulk-permission-corrected.sql
```

Click **Run** or press `Ctrl+Enter`

### Step 3: Verify

After execution, you should see a table showing:
- Users with `admin/utilisateurs` permission
- Each now has `has_import_bulk = 1` ✅

---

## 🔄 After Running the Script

1. **Log out** of the application
2. **Log back in** to refresh permissions
3. Go to **Admin → Users**
4. The **"Import en Masse"** button should now be visible

---

## 📚 Documentation

For detailed information, see:
- **Detailed Guide**: `GUIDE-ACTIVATION-IMPORT-MASSE-CORRECTED.md`
- **Import Documentation**: `LIRE-MOI-IMPORT-MASSE.md`

---

## 🆘 Still Having Issues?

### Check Your Permissions

Run this query to see your current permissions:

```sql
SELECT
  au.email,
  ARRAY_AGG(up.section_id) as permissions
FROM app_utilisateur au
LEFT JOIN utilisateur_permissions up ON au.id = up.utilisateur_id
WHERE au.actif = true AND up.actif = true
GROUP BY au.email;
```

You should have: `{admin/utilisateurs, admin/import-bulk}`

---

## ✨ What Changed?

### ❌ Old Script (Broken)
```sql
-- Tried to use non-existent 'role' column
WHERE u.role = 'admin'
```

### ✅ New Script (Fixed)
```sql
-- Uses actual permissions table
WHERE up.section_id = 'admin/utilisateurs'
  AND up.actif = true
```

---

**That's it!** The import bulk functionality is now activated for all administrators.
