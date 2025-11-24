# Staff Personal Calendar/Timetable Feature

## Overview
This feature provides each staff member with their own personal calendar view showing their schedule assignments, appointments, and leave requests across all branches.

## Implementation

### 1. New Page: Staff Calendar Page
**Location**: `src/pages/StaffCalendarPage.tsx`
**Route**: `/staff/:staffId/calendar`

#### Features:
- **Staff Profile Header**: Displays staff member's avatar, name, status badge, and contact information
- **Schedule Calendar**: Interactive monthly calendar with visual indicators:
  - 🟢 Green dates: Staff is assigned/working
  - 🔴 Red dates: Staff is on approved leave
- **Day Details Panel**: Shows detailed information for selected date:
  - Branch assignments with working hours
  - Time slots for each assignment
  - Assignment reasons (if any)
- **Appointments List**: Displays all appointments for the selected date:
  - Customer name
  - Service details
  - Time slot
  - Branch location
  - Status badge
- **Leave Requests Section**: Shows all pending and approved leave requests with:
  - Leave type (vacation, sick, personal, other)
  - Date range
  - Status badge
  - Reason (if provided)

### 2. Navigation Updates

#### Staff Card Component (`src/components/staff/StaffCard.tsx`)
- Added "Calendar" button to quickly access individual staff calendar
- Button navigates to `/staff/:staffId/calendar`
- Positioned alongside "Edit" button

#### Staff Management Page (`src/pages/StaffManagement.tsx`)
- Added "View Calendar" button for each staff member card
- Full-width button positioned above Edit/Assign buttons
- Provides easy access to personal timetables from main staff list

### 3. Routing Configuration (`src/App.tsx`)
- Added new protected route: `/staff/:staffId/calendar`
- Route wrapped in `ProtectedRoute` and `AppLayout` components
- Positioned between `/staff` and `/calendar` routes for logical organization

## Data Fetching

### Real-time Data Sources
The page fetches data from multiple Supabase tables:

1. **Staff Information**
   - Table: `staff`
   - Fields: Personal details, status, profile image

2. **Date Assignments**
   - Table: `staff_date_assignments`
   - Includes: Related branch information
   - Shows: All dates where staff is assigned across all branches

3. **Appointments**
   - Table: `appointments`
   - Filtered by: Staff ID and selected date
   - Includes: Service, branch, and customer details
   - Ordered by: Start time

4. **Leave Requests**
   - Table: `staff_leave_requests`
   - Filtered by: Staff ID, status (pending/approved)
   - Shows: Future and active leave periods

### Security
- All queries respect existing RLS (Row Level Security) policies
- Staff data only accessible to authorized admins
- No additional RLS policies required - leverages existing security

## User Experience

### Navigation Flow
1. Admin goes to Staff Management page (`/staff`)
2. Clicks "View Calendar" button on any staff card
3. Views comprehensive personal timetable for that staff member
4. Can click on any date to see detailed schedule and appointments
5. Can navigate back to staff list using back button

### Visual Indicators
- **Color-coded calendar dates** make it easy to see working days vs leave days at a glance
- **Status badges** throughout (for staff status, appointment status, leave status)
- **Responsive layout** adapts to mobile, tablet, and desktop screens
- **Scroll areas** for long lists of appointments or assignments

## Benefits

### For Administrators
- Quick access to individual staff schedules
- See staff availability across all branches in one view
- Identify conflicts or gaps in scheduling
- View appointment load per staff member
- Track leave requests and availability

### For Staff Members (Future Enhancement)
- Could be extended to allow staff to view their own schedule
- Could enable self-service leave request submission
- Could allow staff to see their upcoming appointments

## Technical Details

### Component Structure
```
StaffCalendarPage
├── Staff Profile Header (avatar, name, status, contact)
├── Grid Layout (3 columns on large screens)
│   ├── Schedule Calendar (2 columns)
│   │   ├── Calendar component with modifiers
│   │   └── Legend (assigned/leave indicators)
│   └── Sidebar (1 column)
│       ├── Day Details Card
│       │   ├── Date assignments with branches
│       │   └── Time slots
│       └── Appointments Card
│           └── Appointment list for selected date
└── Leave Requests Section (full width)
    └── Grid of leave request cards
```

### State Management
- `useState` for local component state
- `useEffect` for data fetching on mount and date change
- Automatic refetching when date selection changes

### Future Enhancements (Not Implemented)
- Week/Day view toggle
- Print/export schedule functionality
- Staff self-service portal (staff can view their own calendar)
- Appointment details modal on click
- Conflict highlighting on calendar
- Schedule comparison between multiple staff members
- SMS/email notifications for schedule changes
- Bulk operations (e.g., assign to multiple dates at once)
- Integration with external calendar apps (iCal, Google Calendar)

## Testing Checklist

### Basic Navigation
- [ ] Navigate from Staff Management to individual staff calendar
- [ ] Verify back button returns to Staff Management
- [ ] Verify calendar button appears on Staff Card component

### Calendar Display
- [ ] Calendar shows current month by default
- [ ] Assigned dates appear in green
- [ ] Leave dates appear in red
- [ ] Can navigate between months
- [ ] Can select different dates

### Day Details
- [ ] Selecting a date shows assignments for that date
- [ ] Branch names display correctly
- [ ] Time slots format correctly (HH:MM - HH:MM)
- [ ] Multiple assignments for same date display properly
- [ ] "No assignments" message shows when appropriate

### Appointments
- [ ] Appointments load for selected date
- [ ] Customer names display
- [ ] Service information shown
- [ ] Time ranges formatted correctly
- [ ] Status badges display with correct colors
- [ ] "No appointments" message shows when appropriate

### Leave Requests
- [ ] All leave requests display
- [ ] Status badges show correct state (pending/approved)
- [ ] Date ranges format correctly
- [ ] Leave type displays
- [ ] Reason shows when provided

### Responsive Design
- [ ] Test on mobile (< 768px)
- [ ] Test on tablet (768-1024px)
- [ ] Test on desktop (> 1024px)
- [ ] Verify all elements are accessible and functional
- [ ] Check scroll behavior on long lists

### Edge Cases
- [ ] Staff with no assignments
- [ ] Staff with no appointments
- [ ] Staff with no leave requests
- [ ] Staff on leave for selected date
- [ ] Staff with assignments at multiple branches on same date
