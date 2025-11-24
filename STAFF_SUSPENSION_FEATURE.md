# Staff Suspension Feature Implementation

## Overview
This document outlines the staff suspension feature that allows admins to suspend staff members and prevent them from being assigned to appointments or schedules.

## Features Implemented

### 1. Status Management UI
- **Location**: Staff Enrollment Dialog (`src/components/staff/StaffEnrollmentDialog.tsx`)
- **Status Options**:
  - Active (default)
  - Suspended
  - Inactive
  - On Leave
- **Visual Feedback**: Warning message displayed when status is set to "suspended"

### 2. Staff Card Status Display
- **Location**: Staff Card Component (`src/components/staff/StaffCard.tsx`)
- **Visual Indicators**:
  - Active: Green badge
  - Suspended: Red/destructive badge
  - Inactive: Gray/muted badge
  - On Leave: Yellow/warning badge

### 3. Assignment Prevention

#### Appointment Creation
- **Location**: Appointment Dialog (`src/components/appointments/AppointmentDialog.tsx`)
- **Behavior**: Suspended staff are filtered out from the staff selection dropdown when creating appointments
- **Implementation**: Query filters staff with `status !== 'suspended'`

#### Date-Specific Staff Assignment
- **Location**: Branch Staff Schedule Calendar (`src/components/branch/BranchStaffScheduleCalendar.tsx`)
- **Behavior**: Suspended staff cannot be selected when assigning staff to specific dates
- **Implementation**: Staff list filtered to exclude suspended status before rendering in DateStaffAssignmentForm

## Database Schema
The `staff` table already includes a `status` column with default value 'active':
- Column: `status` (text)
- Default: 'active'
- Nullable: No
- Allowed values: 'active', 'suspended', 'inactive', 'on_leave'

## Security Considerations
- RLS policies remain unchanged - suspended staff can still be viewed but not assigned
- No database-level constraints prevent suspended staff assignment (handled at application level)
- Admin authentication required for all status changes

## Testing Checklist

### 1. Status Update
- [ ] Open Staff Management page
- [ ] Edit an existing staff member
- [ ] Change status to "Suspended"
- [ ] Verify warning message appears
- [ ] Save changes
- [ ] Verify staff card shows red "Suspended" badge

### 2. Appointment Creation Prevention
- [ ] Suspend a staff member who has date assignments
- [ ] Go to Appointments page
- [ ] Try to create new appointment for a date when suspended staff is assigned
- [ ] Verify suspended staff does NOT appear in staff dropdown
- [ ] Only active staff should be selectable

### 3. Schedule Assignment Prevention
- [ ] Go to a Branch Detail page
- [ ] Open Branch Staff Schedule Calendar
- [ ] Select a date to assign staff
- [ ] Verify suspended staff does NOT appear in available staff list
- [ ] Only active staff should be selectable

### 4. Visual Indicators
- [ ] Verify all status badges display with correct colors:
  - Active: Green
  - Suspended: Red
  - Inactive: Gray
  - On Leave: Yellow

### 5. Re-activation
- [ ] Edit a suspended staff member
- [ ] Change status back to "Active"
- [ ] Verify staff now appears in assignment dropdowns
- [ ] Verify badge changes to green "Active"

## Future Enhancements (Not Implemented)
- Automatic suspension workflow (e.g., after X violations)
- Suspension history tracking
- Notification system for suspended staff
- Bulk suspension operations
- Suspension reason field and audit log
- Database-level constraint to prevent suspended staff assignment
- Auto-cancel future appointments when staff is suspended
