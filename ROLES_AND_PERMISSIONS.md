# 👥 User Roles & Permissions Guide

## 🎭 Role Overview

CarFlow Transit has **2 main roles**:
1. **Admin** - Full system access
2. **Dispatcher** - Limited to their assigned clinic/facility

---

## 🔐 Admin vs Dispatcher - Key Differences

### **Admin Role**
**Who:** System administrators, company owners, managers

**Access Level:** FULL ACCESS to everything

**What They Can See:**
- ✅ All trips across ALL clinics/facilities
- ✅ All drivers (entire fleet)
- ✅ All patients across all facilities
- ✅ All vehicles
- ✅ All facilities/clinics
- ✅ All billing records
- ✅ All user accounts
- ✅ Complete activity logs (all users)
- ✅ HIPAA compliance reports
- ✅ System-wide analytics

**What They Can Do:**
- ✅ Create/edit/delete trips for ANY clinic
- ✅ Assign ANY driver to ANY trip
- ✅ Manage all drivers (add, edit, deactivate)
- ✅ Manage all facilities/clinics
- ✅ Create/edit/delete user accounts
- ✅ View and export all billing data
- ✅ Access HIPAA audit logs
- ✅ Generate reports for any facility
- ✅ Configure system settings
- ✅ Auto-assign drivers across all clinics

**Special Features:**
- 🔹 **Clinic Filter** - Can filter trips by specific clinic or view all
- 🔹 **Driver Filter** - Can filter by specific driver or view all
- 🔹 **Facility Management** - Can add/edit/delete facilities
- 🔹 **User Management** - Can create admin and dispatcher accounts
- 🔹 **Advanced Analytics** - See performance across all facilities

---

### **Dispatcher Role**
**Who:** Facility staff, clinic coordinators, schedulers

**Access Level:** LIMITED to their assigned clinic/facility

**What They Can See:**
- ✅ Trips for THEIR clinic only
- ✅ Drivers assigned to their facility
- ✅ Patients from their facility
- ✅ Vehicles assigned to their facility
- ✅ Their own facility information
- ✅ Billing for their facility only
- ✅ Their own activity log
- ❌ Cannot see other facilities' data

**What They Can Do:**
- ✅ Create/edit trips for THEIR clinic only
- ✅ Assign drivers to trips (from their facility's driver pool)
- ✅ View driver information
- ✅ Manage patients from their facility
- ✅ View billing for their facility
- ✅ Generate reports for their facility
- ❌ Cannot create/edit drivers
- ❌ Cannot manage other facilities
- ❌ Cannot create user accounts
- ❌ Cannot access HIPAA compliance section
- ❌ Cannot see system-wide analytics

**Restrictions:**
- 🔸 **No Clinic Filter** - Automatically filtered to their clinic
- 🔸 **No Driver Management** - Can only view and assign existing drivers
- 🔸 **No User Management** - Cannot create accounts
- 🔸 **Limited Reports** - Only their facility's data
- 🔸 **No System Settings** - Cannot change configurations

---

## 📄 Page-by-Page Access Control

### **1. Dashboard**
**Admin:**
- See stats for ALL facilities
- View all active trips
- Auto-assign feature available
- Driver leaderboard (all drivers)
- Real-time metrics (system-wide)

**Dispatcher:**
- See stats for THEIR facility only
- View active trips for their facility
- No auto-assign feature
- Driver leaderboard (their facility's drivers)
- Real-time metrics (their facility)

---

### **2. Trip Management**
**Admin:**
- View ALL trips from ALL facilities
- Filter by:
  - Date
  - Status
  - Trip type
  - Driver (all drivers)
  - Clinic (all clinics)
- Create trips for ANY clinic
- Assign ANY driver
- Edit/delete ANY trip
- Import trips for any facility
- Export all trip data

**Dispatcher:**
- View trips for THEIR clinic only
- Filter by:
  - Date
  - Status
  - Trip type
  - Driver (their facility's drivers)
  - ❌ No clinic filter (auto-filtered)
- Create trips for THEIR clinic only
- Assign drivers from their pool
- Edit/delete trips for their clinic
- Import trips for their facility
- Export their facility's trip data

**UI Differences:**
- Admin sees "Clinic" column in trip table
- Dispatcher does NOT see clinic column (all trips are theirs)
- Admin has clinic dropdown in filters
- Dispatcher has NO clinic dropdown

---

### **3. Driver Management**
**Admin:**
- View ALL drivers
- Add new drivers
- Edit driver information
- Deactivate/activate drivers
- Assign drivers to facilities
- View driver performance metrics
- Manage driver payouts
- Export driver data

**Dispatcher:**
- View drivers assigned to their facility
- ❌ Cannot add new drivers
- ❌ Cannot edit driver information
- ❌ Cannot deactivate drivers
- View driver availability
- See driver performance (limited)
- ❌ Cannot manage payouts

---

### **4. Facilities/Clinics**
**Admin:**
- View ALL facilities
- Add new facilities
- Edit facility information
- Configure facility settings
- Assign dispatchers to facilities
- View facility performance

**Dispatcher:**
- View THEIR facility only
- ❌ Cannot add facilities
- ❌ Cannot edit facility info
- View their facility details
- ❌ Cannot assign users

---

### **5. Billing**
**Admin:**
- View billing for ALL facilities
- Filter by facility
- See total revenue (all facilities)
- Export billing reports (all data)
- Manage driver payouts (all drivers)
- View clinic invoices (all clinics)

**Dispatcher:**
- View billing for THEIR facility only
- See revenue for their facility
- Export their facility's billing
- View driver payouts (their drivers)
- View their clinic's invoices

---

### **6. Reports**
**Admin:**
- Generate reports for ANY facility or ALL facilities
- Custom report builder with all data
- Advanced analytics
- Cross-facility comparisons
- Export comprehensive reports

**Dispatcher:**
- Generate reports for THEIR facility only
- Basic report builder (their data)
- Standard analytics
- ❌ No cross-facility data
- Export their facility's reports

---

### **7. Activity Log**
**Admin:**
- View ALL system activities
- Filter by:
  - User
  - Action type
  - Date range
  - Entity type
- See all user actions
- Export complete audit trail
- HIPAA compliance view

**Dispatcher:**
- View THEIR OWN activities only
- Filter by:
  - Action type
  - Date range
- ❌ Cannot see other users' actions
- Export their own activity log
- ❌ No HIPAA compliance access

---

### **8. HIPAA Compliance**
**Admin:**
- ✅ Full access
- View all PHI access logs
- Generate compliance reports
- Export audit trails
- Monitor security events

**Dispatcher:**
- ❌ NO ACCESS
- Redirected with "Admin access required" message

---

### **9. User Management**
**Admin:**
- ✅ Full access
- Create admin accounts
- Create dispatcher accounts
- Assign dispatchers to facilities
- Edit user information
- Deactivate/activate users

**Dispatcher:**
- ❌ NO ACCESS
- Cannot manage users

---

## 🎯 Quick Comparison Table

| Feature | Admin | Dispatcher |
|---------|-------|------------|
| View all facilities | ✅ | ❌ |
| Create trips for any clinic | ✅ | ❌ (own only) |
| Manage drivers | ✅ | ❌ (view only) |
| Manage facilities | ✅ | ❌ |
| Create user accounts | ✅ | ❌ |
| HIPAA compliance access | ✅ | ❌ |
| View all billing | ✅ | ❌ (own only) |
| System-wide reports | ✅ | ❌ |
| Auto-assign drivers | ✅ | ❌ |
| Export all data | ✅ | ❌ (own only) |
| Clinic filter dropdown | ✅ | ❌ |
| View all activity logs | ✅ | ❌ (own only) |

---

## 🔄 How Role Filtering Works

### **In Code (AuthContext.tsx)**
```typescript
const { user, isAdmin } = useAuth();

// isAdmin is true if user.role === 'admin'
// isAdmin is false if user.role === 'dispatcher'
```

### **Trip Filtering Example**
```typescript
// Admin sees all trips
const visibleTrips = isAdmin 
  ? trips  // All trips
  : trips.filter(trip => trip.clinicId === user.clinicId);  // Only their clinic
```

### **UI Conditional Rendering**
```typescript
{isAdmin && (
  <div>
    {/* This only shows for admins */}
    <select name="clinic">
      <option>All Clinics</option>
      {clinics.map(clinic => <option>{clinic.name}</option>)}
    </select>
  </div>
)}
```

---

## 📊 Data Visibility Summary

### **Admin Can See:**
```
ALL DATA
├── All Clinics
│   ├── Clinic A
│   │   ├── Trips
│   │   ├── Drivers
│   │   ├── Patients
│   │   └── Billing
│   ├── Clinic B
│   │   ├── Trips
│   │   ├── Drivers
│   │   ├── Patients
│   │   └── Billing
│   └── Clinic C
│       ├── Trips
│       ├── Drivers
│       ├── Patients
│       └── Billing
└── System Settings
    ├── Users
    ├── HIPAA Logs
    └── Analytics
```

### **Dispatcher Can See:**
```
THEIR CLINIC ONLY
└── Clinic A (their assigned clinic)
    ├── Trips (Clinic A only)
    ├── Drivers (Clinic A only)
    ├── Patients (Clinic A only)
    └── Billing (Clinic A only)
```

---

## 🎯 Why Two Roles?

**Admin:**
- For company owners/managers who need to oversee EVERYTHING
- Can manage multiple facilities from one dashboard
- Full control over system configuration
- HIPAA compliance oversight

**Dispatcher:**
- For facility staff who only need to manage THEIR facility
- Prevents accidental changes to other facilities' data
- Simplified interface (no unnecessary options)
- Data privacy (can't see other facilities' patients)

---

## 🔐 Security Benefits

**Role-Based Access Control (RBAC):**
1. **Data Isolation** - Dispatchers can't access other facilities
2. **Audit Trail** - All actions logged by role
3. **Least Privilege** - Users only get access they need
4. **HIPAA Compliance** - PHI access restricted by role
5. **Accountability** - Clear separation of responsibilities

---

## 📝 Example Scenarios

### **Scenario 1: Multi-Facility Company**
**Setup:**
- 1 Admin (company owner)
- 3 Dispatchers (one per facility)

**Result:**
- Admin sees all 3 facilities, can manage everything
- Dispatcher A only sees Facility A
- Dispatcher B only sees Facility B
- Dispatcher C only sees Facility C
- Each dispatcher can't interfere with others

### **Scenario 2: Single Facility**
**Setup:**
- 1 Admin (facility manager)
- 2 Dispatchers (day shift, night shift)

**Result:**
- Admin manages the facility and user accounts
- Both dispatchers see same facility data
- Admin can oversee all dispatcher actions
- Dispatchers can't create new accounts

---

## 🎨 UI Differences at a Glance

**Admin Dashboard:**
- Clinic filter dropdown
- "All Facilities" option
- Auto-assign button
- User management link
- HIPAA compliance link
- System settings

**Dispatcher Dashboard:**
- No clinic filter (auto-filtered)
- No "All Facilities" option
- No auto-assign button
- No user management link
- No HIPAA compliance link
- No system settings

---

**Summary: Admin = Full Control | Dispatcher = Facility-Specific Access**
