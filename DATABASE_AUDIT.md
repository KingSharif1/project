# Database Schema Audit - Identifying Redundant/Unnecessary Tables

**Date**: April 9, 2026  
**Purpose**: Clean up database before adding subscription system

---

## 📊 CORE TABLES (Essential - Keep)

### **1. users** ✅ KEEP
- **Purpose**: User accounts and authentication
- **Status**: Core table, well-designed
- **Used by**: Everything

### **2. drivers** ✅ KEEP
- **Purpose**: Driver profiles and details
- **Status**: Core table, recently cleaned up
- **Used by**: Trips, vehicles, mobile app

### **3. patients** ✅ KEEP
- **Purpose**: Patient/rider information
- **Status**: Core table, recently cleaned up (dropped 12 unused columns)
- **Used by**: Trips, consent tracking

### **4. trips** ✅ KEEP
- **Purpose**: Trip records and management
- **Status**: Core table, central to entire system
- **Used by**: Everything

### **5. vehicles** ✅ KEEP
- **Purpose**: Vehicle fleet management
- **Status**: Core table, well-designed
- **Used by**: Trips, drivers, document management

### **6. clinics** ✅ KEEP
- **Purpose**: Multi-tenant company/clinic management
- **Status**: Core table, essential for multi-tenancy
- **Used by**: Users, trips, contractors, subscriptions

### **7. contractors** ✅ KEEP
- **Purpose**: Facilities/hospitals that request trips
- **Status**: Core table, billing integration
- **Used by**: Trips, rate management

---

## 📋 SUPPORTING TABLES (Important - Keep)

### **8. activity_log** ✅ KEEP
- **Purpose**: Audit trail for all actions
- **Status**: Security/compliance requirement
- **Used by**: All CRUD operations

### **9. document_submissions** ✅ KEEP
- **Purpose**: Driver/vehicle document tracking
- **Status**: Compliance requirement, recently enhanced
- **Used by**: Driver management, vehicle management

### **10. notifications** ✅ KEEP
- **Purpose**: In-app notification system
- **Status**: Active feature, real-time updates
- **Used by**: Web app notification center

### **11. notification_preferences** ✅ KEEP
- **Purpose**: User notification settings
- **Status**: Paired with notifications table
- **Used by**: Notification system

---

## 🔴 DUPLICATE/REDUNDANT TABLES (Need Review)

### **12. driver_locations** vs **driver_location_history** ⚠️ POTENTIAL DUPLICATE
**Analysis**:
- `driver_locations` (from migration `20240115000000_create_realtime_driver_locations.sql`)
  - Stores **current** driver location
  - Updated in real-time
  - Used for live tracking map
  - Columns: driver_id, latitude, longitude, heading, speed, accuracy, is_online, updated_at

- `driver_location_history` (from migration `20251025200000_create_driver_location_history.sql`)
  - Stores **historical** GPS breadcrumbs
  - Used for trip history/replay
  - Columns: driver_id, trip_id, latitude, longitude, heading, speed, accuracy, recorded_at

**Verdict**: ✅ **KEEP BOTH** - Different purposes (current vs history)

---

### **13. automated_notification_log** vs **notifications** ⚠️ POTENTIAL DUPLICATE
**Analysis**:
- `notifications` - In-app notifications (user clicks bell icon)
- `automated_notification_log` - SMS/Email notification tracking

**Verdict**: ✅ **KEEP BOTH** - Different channels (in-app vs SMS/email)

---

### **14. sms_notifications** vs **automated_notification_log** 🔴 DUPLICATE
**Analysis**:
- Both track SMS messages sent
- `sms_notifications` has more detail (Twilio SID, status, etc.)
- `automated_notification_log` is more generic

**Verdict**: 🔴 **CONSOLIDATE** - Keep `sms_notifications`, drop `automated_notification_log` or merge functionality

---

### **15. email_notifications** vs **automated_notification_log** 🔴 DUPLICATE
**Analysis**:
- Both track email messages
- Similar to SMS situation above

**Verdict**: 🔴 **CONSOLIDATE** - Keep `email_notifications`, drop `automated_notification_log` or merge

---

## 🗑️ UNUSED/DEAD TABLES (Consider Dropping)

### **16. trip_reminders** ⚠️ UNUSED?
**From**: `20251028192956_create_trip_reminders_table.sql`
**Purpose**: Automated trip reminder scheduling
**Status**: Feature may not be implemented in backend
**Check**: Search backend for usage

**Verdict**: ⚠️ **VERIFY USAGE** - If unused, drop it

---

### **17. sms_confirmations** ⚠️ UNUSED?
**From**: `20251116000000_add_sms_confirmation_system.sql`
**Purpose**: Track SMS confirmation replies
**Status**: Feature may not be fully implemented

**Verdict**: ⚠️ **VERIFY USAGE** - If unused, drop it

---

### **18. code_backups** 🗑️ DROP
**From**: `20251113171040_create_code_backup_system.sql`
**Purpose**: Store code backups in database (???)
**Status**: This is a terrible idea - use Git instead!

**Verdict**: 🗑️ **DROP IMMEDIATELY** - Code should never be in the database

---

### **19. resend_api_keys** 🗑️ DROP
**From**: `20251126150135_add_resend_api_key_storage.sql`
**Purpose**: Store Resend API keys in database
**Status**: API keys should be in environment variables, not database!

**Verdict**: 🗑️ **DROP IMMEDIATELY** - Security risk, use .env instead

---

### **20. sms_unsubscribed** ✅ KEEP
**From**: `20251207231115_add_sms_unsubscribed_tracking.sql`
**Purpose**: Track users who opted out of SMS
**Status**: Compliance requirement (TCPA, CAN-SPAM)

**Verdict**: ✅ **KEEP** - Legal requirement

---

## 📊 LOOKUP/REFERENCE TABLES

### **21. trip_sources** ✅ KEEP
**Purpose**: Track where trips come from (phone, web, API, etc.)
**Status**: Useful for analytics

### **22. rate_adjustments** ⚠️ VERIFY
**Purpose**: Track rate changes over time
**Status**: May be unused if rates are in JSONB columns

---

## 🆕 SUBSCRIPTION TABLES (Needed)

### **23. subscriptions** ✅ KEEP
**From**: `20260403000000_add_subscriptions_and_branding.sql`
**Purpose**: Subscription management (tiers, billing)
**Status**: Backend implemented, frontend UI needed

### **24. payment_history** ✅ KEEP
**Purpose**: Track payment transactions
**Status**: Paired with subscriptions

### **25. feature_flags** ✅ KEEP
**Purpose**: Enable/disable features per clinic
**Status**: Subscription tier enforcement

### **26. clinic_branding** ✅ KEEP
**Purpose**: Custom branding per clinic
**Status**: White-label feature

---

## 🆕 NEW TABLES (Just Created)

### **27. pending_signups** ✅ KEEP
**Purpose**: Track company signups before payment
**Status**: Part of new subscription workflow

### **28. support_tickets** ✅ KEEP
**Purpose**: Admin → Superadmin communication
**Status**: Part of new subscription workflow

### **29. ticket_responses** ✅ KEEP
**Purpose**: Ticket conversation thread
**Status**: Paired with support_tickets

---

## 🎯 RECOMMENDED ACTIONS

### **Immediate (Before Adding More Tables)**:

1. 🗑️ **DROP `code_backups` table**
   - Code belongs in Git, not database
   - Creates security/maintenance issues

2. 🗑️ **DROP `resend_api_keys` table**
   - API keys belong in .env, not database
   - Security vulnerability

3. 🔄 **CONSOLIDATE notification tables**
   - Merge `automated_notification_log` into `sms_notifications` and `email_notifications`
   - Or drop `automated_notification_log` if redundant

4. ⚠️ **VERIFY usage of**:
   - `trip_reminders` - Check if backend uses it
   - `sms_confirmations` - Check if backend uses it
   - `rate_adjustments` - Check if backend uses it

### **After Cleanup**:
5. ✅ **Proceed with subscription system**
   - Tables are already created (pending_signups, support_tickets)
   - Just need backend routes + frontend UI

---

## 📈 SUMMARY

**Total Tables**: ~35-40 tables
**Core Essential**: 7 tables (users, drivers, patients, trips, vehicles, clinics, contractors)
**Supporting**: 15-20 tables (documents, notifications, locations, etc.)
**Redundant/Unused**: 4-6 tables (code_backups, resend_api_keys, possibly others)

**Recommendation**: Drop 2-4 tables immediately, verify 3-4 more, then proceed with subscription system.

---

## 🚀 NEXT STEPS

1. **You decide**: Which tables to drop?
2. **I'll create migration** to drop them
3. **Then proceed** with subscription system implementation

**Want me to create a cleanup migration to drop the obvious bad tables (code_backups, resend_api_keys)?**
