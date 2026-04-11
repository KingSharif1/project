# Quick Fix Guide - Current Issues

## Issue 1: Support Tickets 403 Error (FIXED)
**Problem**: Regular admin getting 403 Forbidden on `/api/support/tickets`

**Root Cause**: Admin user doesn't have `clinic_id` set in their user record

**Fix Applied**: Added check in `server/routes/support.js` to return helpful error message

**What You Need To Do**:
```sql
-- Check which admin user you're logged in as
SELECT id, email, role, clinic_id FROM users WHERE role = 'admin';

-- If clinic_id is NULL, update it:
UPDATE users 
SET clinic_id = 'd3432d12-c50b-407e-b1ce-3e4ac5d5ed68'  -- Use actual clinic ID
WHERE email = 'your-admin-email@example.com';
```

---

## Issue 2: CompanyManagement Shows 0 Companies
**Problem**: UI shows "0 Companies" but database has 2 clinics

**Root Cause**: Backend route works fine (returns data), but frontend might not be handling response correctly OR you're not logged in as superadmin

**Companies in Database**:
1. **FwNemt** (dd555676-5116-4f66-8775-045aca6e36ac) - Created Jan 28, 2026
2. **Main Clinic** (d3432d12-c50b-407e-b1ce-3e4ac5d5ed68) - Created Jan 13, 2026

**Check**:
1. Open browser DevTools → Network tab
2. Look for request to `/api/admin/companies`
3. Check if it returns data or error
4. Verify you're logged in as superadmin (not regular admin)

---

## Issue 3: UI Color Consistency
**Problem**: Colors don't match across different sections

**Fix Needed**: Standardize color scheme across all components

**Recommended Palette**:
- Blue gradient: `from-blue-50 to-blue-100` / `from-blue-600 to-indigo-600`
- Green: `from-green-50 to-green-100` / `text-green-600`
- Purple: `from-purple-50 to-purple-100` / `text-purple-600`
- Orange: `from-orange-50 to-orange-100` / `text-orange-600`
- Yellow: `from-yellow-50 to-yellow-100` / `text-yellow-600`

---

## Issue 4: Layout Improvements Needed
**Problem**: Stats/search sections in wrong places

**Suggestions**:
1. Move company stats to top of SuperAdminDashboard
2. Move search bar below stats
3. Keep consistent layout across all admin views

---

## Next Steps:
1. **Restart your server** to apply the support.js fix
2. **Update admin user's clinic_id** in database
3. **Check browser console** for CompanyManagement errors
4. **Verify you're logged in as superadmin** when viewing Company Management
