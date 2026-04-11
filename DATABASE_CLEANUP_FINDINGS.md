# Database Cleanup - Usage Analysis Results

**Date**: April 9, 2026

---

## ✅ TABLES THAT ARE ACTIVELY USED (KEEP)

### 1. **`trip_reminders`** ✅ KEEP
**Backend Usage**:
- `server/routes/sms.js` - 4 locations (insert, select, update)
- `server/routes/notifications.js` - 6 locations (CRUD operations)

**Frontend Usage**:
- `web/src/components/UpcomingReminders.tsx` - UI component exists

**Features**:
- POST /api/notifications/trip-reminders - Create reminder
- GET /api/notifications/trip-reminders/:tripId - Get reminders for trip
- PUT /api/notifications/trip-reminders/:id - Update reminder
- DELETE /api/notifications/trip-reminders/:tripId - Cancel reminders
- GET /api/notifications/trip-reminders/pending - Get pending reminders
- GET /api/notifications/trip-reminders/stats - Reminder statistics

**Verdict**: ✅ **KEEP** - Fully implemented feature with UI

---

### 2. **`automated_notification_log`** ✅ KEEP (For Now)
**Backend Usage**:
- `server/routes/notifications.js` - 3 locations (insert, select)

**Features**:
- POST /api/notifications/log - Log notification
- GET /api/notifications/pending-emails - Get pending emails
- GET /api/notifications/pending - Get all pending notifications

**Verdict**: ✅ **KEEP** - Actively used, but could potentially be consolidated later

---

### 3. **`sms_notifications`** ✅ KEEP
**Backend Usage**:
- `server/routes/notifications.js` - 3 locations
- `server/routes/trips.js` - 1 location

**Verdict**: ✅ **KEEP** - Active SMS tracking

---

### 4. **`email_notifications`** ✅ KEEP
**Backend Usage**:
- `web/src/lib/database.types.ts` - Type definitions exist

**Verdict**: ✅ **KEEP** - Part of notification system

---

## 🗑️ TABLES WITH NO USAGE (DROP)

### 5. **`sms_confirmations`** 🗑️ DROP
**Backend Usage**: ❌ NONE
**Frontend Usage**: ❌ NONE
**Migration**: `20251116000000_add_sms_confirmation_system.sql`

**Verdict**: 🗑️ **DROP** - Table exists but feature never implemented

---

### 6. **`code_backups`** 🗑️ DROP
**Backend Usage**: ❌ NONE
**Frontend Usage**: ❌ NONE
**Migration**: `20251113171040_create_code_backup_system.sql`

**Verdict**: 🗑️ **DROP** - Bad practice, code belongs in Git

---

### 7. **`resend_api_keys`** 🗑️ DROP
**Backend Usage**: ❌ NONE
**Frontend Usage**: ❌ NONE
**Migration**: `20251126150135_add_resend_api_key_storage.sql`

**Verdict**: 🗑️ **DROP** - Security risk, API keys belong in .env

---

### 8. **`rate_adjustments`** 🗑️ DROP
**Backend Usage**: ❌ NONE
**Frontend Usage**: ❌ NONE
**Migration**: `20251030020010_create_lookup_and_adjustment_tables.sql`

**Verdict**: 🗑️ **DROP** - Rates are stored in JSONB columns instead

---

## 📊 SUMMARY

**Keep**: 4 tables (trip_reminders, automated_notification_log, sms_notifications, email_notifications)
**Drop**: 4 tables (sms_confirmations, code_backups, resend_api_keys, rate_adjustments)

---

## 🚀 NEXT STEP

Create cleanup migration to drop the 4 unused tables.
