# Athletic Management System — External Coaching & Training Verification Module

**Document type:** Full feature requirements + Codex build prompts  
**Application stack:** Laravel + Inertia.js  
**Important architecture decision:** External coaches must have a separate login system using a separate guard/table so existing system admin/internal login is not affected.  
**Scope:** Full production-ready flow, not MVP.

---

## 1. Purpose

The Athletic Management System needs a complete feature for athletes/members who are permitted to train outside their official team setup under an external/private coach for a fixed period.

This feature is required because some players may falsely claim they are attending outside training. The system must make false reporting difficult by requiring the external coach to submit training attendance with photo proof, GPS location, time evidence, venue verification, and admin review.

This module must support:

- External/private coach registration and management by admin.
- Separate external coach login that does not affect system admin/internal users.
- Training venue/stadium management with coordinates and allowed radius.
- Member-to-external-coach assignment for a fixed permission period.
- Attendance submission by external coach for assigned members only.
- Required photo evidence and GPS coordinates.
- Automatic distance calculation from approved venue.
- Flagging if attendance is uploaded outside the approved radius.
- Admin review workflow for valid, suspicious, rejected, and corrected attendance.
- Performance tracking for members training externally.
- Member profile integration.
- Reports, filters, dashboards, audit history, and security restrictions.

---

## 2. Key Architecture Rules

### 2.1 Separate Login for External Coaches

External coaches must **not** use the main system admin/internal user login.

Use:

```txt
/admin/login
```

for existing system/admin/internal users.

Use:

```txt
/external-coach/login
```

for external coaches.

Recommended architecture:

```txt
System/Admin/Internal Users -> users table -> web guard
External Coaches            -> external_coaches table -> external_coach guard
```

This ensures:

- Existing admin login remains untouched.
- Internal users and permissions are not disturbed.
- External coaches cannot enter the admin panel.
- Coach-specific login restrictions do not affect admin users.
- Coach portal can be safely designed as a separate limited area.

### 2.2 Separate Guard and Provider

In `config/auth.php`, add a separate guard and provider:

```php
'guards' => [
    'web' => [
        'driver' => 'session',
        'provider' => 'users',
    ],

    'external_coach' => [
        'driver' => 'session',
        'provider' => 'external_coaches',
    ],
],

'providers' => [
    'users' => [
        'driver' => 'eloquent',
        'model' => App\Models\User::class,
    ],

    'external_coaches' => [
        'driver' => 'eloquent',
        'model' => App\Models\ExternalCoach::class,
    ],
],
```

The `ExternalCoach` model should implement `Authenticatable`.

### 2.3 Do Not Affect Existing Auth

Codex must not rewrite or break:

- Existing admin login.
- Existing user model behavior.
- Existing role/permission logic for internal users.
- Existing admin middleware.
- Existing member/team/coach official workflow.

External coach auth must be additive.

### 2.4 Use Existing Project Conventions

Before coding, Codex must inspect the existing codebase and follow existing patterns for:

- Routes
- Controllers
- Inertia pages
- Layouts
- Components
- Form requests
- Policies
- Services
- Actions
- Enums
- Models
- Migrations
- Media/file uploads
- Notifications
- Exports
- Audit/status history
- Member profile tabs
- Permissions

### 2.5 Language Field Rule

Do not create unnecessary English/Hindi duplicated fields unless the project already requires them for this exact module.

Use single fields like:

```txt
name
code
description
remarks
address
```

Do not create fields like:

```txt
name_en
name_hi
description_en
description_hi
```

unless the existing app architecture strictly requires it.

---

## 3. Actors

### 3.1 System Admin / Admin User

Internal authenticated user who manages the full system.

Can:

- Create external coaches.
- Activate/inactivate/suspend external coaches.
- Create training venues/stadiums.
- Assign members to external coaches.
- Approve/cancel/complete external coaching assignments.
- Review attendance.
- Accept/reject flagged attendance.
- View reports.
- Track performance.
- View audit history.

### 3.2 External Coach

Outside coach/private coach who gives training to assigned members.

Can:

- Login from separate external coach portal.
- See only assigned members.
- Mark training attendance for assigned members.
- Upload attendance photo proof.
- Submit GPS location.
- View own attendance logs.
- Add performance updates for assigned members.
- View assignment details for members assigned to them.

Cannot:

- Access admin panel.
- See all members.
- See other coaches.
- See internal team data.
- Modify reviewed attendance.
- Mark attendance for unassigned members.
- Login when inactive/suspended.

### 3.3 Member / Athlete

Athlete who is approved to train under an external coach.

System stores:

- External coach assignment.
- Training venue.
- Permission period.
- Attendance records.
- Location verification result.
- Performance updates.

### 3.4 Official Team Coach

Existing system coach/team incharge is separate from external coach.

This module must not confuse external coach attendance with official coach/team attendance.

---

## 4. Main Business Flow

1. Admin creates an external coach profile.
2. System stores coach login credentials in `external_coaches` table.
3. Admin creates or selects a training venue/stadium with GPS coordinates and allowed radius.
4. Admin creates external coaching assignment for a member.
5. Assignment links member, external coach, venue, sport/game, date range, and permission document.
6. External coach logs in through `/external-coach/login`.
7. Coach sees only currently assigned members.
8. Coach opens member and marks training attendance.
9. System requires photo proof and browser/device GPS location.
10. System stores submitted coordinates and attendance photo.
11. System calculates distance from approved venue coordinates.
12. If distance is within allowed radius, attendance is marked geo-valid.
13. If distance is outside radius or GPS is missing/poor, attendance is saved but flagged.
14. Admin reviews flagged records.
15. Admin accepts, rejects, or corrects attendance with remarks.
16. Coach can view attendance logs but cannot edit locked/reviewed records.
17. Coach can add performance updates for assigned members.
18. Member profile shows full external coaching history, attendance, flags, and performance.

---

## 5. Core Modules

## 5.1 External Coach Management

Admin must be able to manage external/private coaches.

### Required Fields

- Name
- Phone
- Email
- Password
- Photo
- Gender, optional
- Date of birth, optional
- Address
- District/city, optional
- Sports/games coached
- Event/discipline specialization, optional
- Experience years, optional
- Certification details, optional
- ID proof/document, optional
- Emergency contact, optional
- Bank/payment details, optional only if project needs it
- Status
- Remarks
- Last login date/time
- Created by
- Updated by
- Deleted by, if project pattern exists
- Timestamps
- Soft deletes

### Status Values

```txt
pending_invite
active
inactive
suspended
blacklisted
```

### Admin Actions

- Create coach.
- Edit coach.
- Upload/change photo.
- Attach sports/games.
- Activate coach.
- Inactivate coach.
- Suspend coach.
- Blacklist coach.
- Reset coach password.
- Send login credentials/invitation.
- View active assignments.
- View attendance logs.
- View flagged attendance.
- View performance updates.
- View status history.
- View audit log.

### Rules

- Coach email must be unique in `external_coaches`.
- Phone should be unique if business requires.
- Inactive/suspended/blacklisted coach cannot login.
- Coach with active assignment should not be hard deleted.
- Prefer soft delete.
- Status change must be stored in status history.
- Admin must provide reason when suspending/blacklisting.

---

## 5.2 Separate External Coach Auth

### Required Screens

- Login
- Logout
- Forgot password
- Reset password
- First-time password setup, optional
- Account inactive message

### Login URL

```txt
/external-coach/login
```

### Protected Coach Portal Prefix

```txt
/external-coach/dashboard
/external-coach/members
/external-coach/attendance
/external-coach/performance
```

### Middleware

Create middleware:

```txt
external.coach.auth
external.coach.active
```

or combine with Laravel guard:

```php
auth:external_coach
external.coach.active
```

### Middleware Must Check

- External coach is authenticated using `external_coach` guard.
- Coach status is active.
- Coach is not soft deleted.
- Coach is not suspended/blacklisted.
- Coach has not exceeded any security restrictions.

### Inactive Coach Handling

If inactive/suspended/blacklisted coach tries to login:

- Block login.
- Do not create session.
- Show clean message:

```txt
Your coach account is inactive. Please contact the administrator.
```

If coach becomes inactive while logged in:

- Logout automatically on next request.
- Redirect to coach login.
- Do not expose any member data.

---

## 5.3 Training Venue / Stadium Management

Training venue is the physical place where external training is approved.

### Required Fields

- Name
- Code, optional but recommended
- Address
- District ID, optional
- Unit ID, optional
- City, optional
- State, optional
- Latitude
- Longitude
- Allowed radius in meters
- Venue photo, optional
- Status
- Remarks
- Created by
- Updated by
- Timestamps
- Soft deletes

### Status Values

```txt
active
inactive
under_review
```

### Admin Actions

- Create venue.
- Edit venue.
- Set coordinates.
- Set allowed radius.
- Upload venue image.
- Activate/inactivate venue.
- View assigned coaches.
- View members training at venue.
- View attendance heatmap/list.

### Venue Rules

- Latitude and longitude are required for active venues.
- Allowed radius is required.
- Default radius can be 200 meters.
- Admin can increase radius for larger stadiums.
- Attendance should store venue coordinate snapshot so old attendance remains historically accurate even if venue coordinates change later.

---

## 5.4 External Coaching Assignment

Assignment is the permission record connecting a member to an external coach at a venue for a period.

### Required Fields

- Member ID
- External Coach ID
- Training Venue ID
- Sport/Game ID
- Event/Discipline ID, nullable
- Start date
- End date
- Training days, nullable JSON
- Training start time, nullable
- Training end time, nullable
- Attendance mode
- Permission reference number, nullable
- Permission document path, nullable
- Approved by
- Approved at
- Status
- Cancellation reason, nullable
- Completion remarks, nullable
- Remarks
- Created by
- Updated by
- Timestamps
- Soft deletes

### Assignment Status Values

```txt
draft
pending_approval
approved
active
paused
completed
cancelled
rejected
expired
```

### Attendance Mode Values

```txt
single_mark
check_in_check_out
```

For a complete system, support both modes if possible:

- `single_mark`: coach marks one attendance entry with photo and GPS.
- `check_in_check_out`: coach submits check-in and check-out with photo/GPS and duration.

If the project needs simpler flow first, keep DB flexible enough for check-in/check-out.

### Assignment Rules

- Member must exist and be active.
- External coach must be active.
- Venue must be active.
- Start date and end date are required.
- End date must be after or equal to start date.
- Sport/game is required.
- Prevent overlapping active assignments for the same member + same sport/game + same period.
- Admin may override overlap only if project has explicit permission.
- Attendance can only be submitted inside assignment date range.
- Assignment status should auto-expire after end date or via scheduled command.
- Cancelling assignment should stop future attendance submission but preserve old records.

---

## 5.5 External Training Attendance

Attendance belongs to the member’s external training, not to the coach.

### Required Core Fields

- Assignment ID
- Member ID
- External Coach ID
- Training Venue ID
- Attendance date
- Attendance status
- Coach remarks
- Review status
- Geo status
- Flag reason
- Created by guard/type if needed
- Timestamps
- Soft deletes

### Attendance Status Values

```txt
present
absent
late
excused
not_marked
```

### Review Status Values

```txt
pending
accepted
rejected
corrected
locked
```

### Geo Status Values

```txt
valid
outside_radius
location_missing
location_permission_denied
low_accuracy
outside_training_time
manual_review_required
```

### Single Mark Attendance Fields

- Submitted at
- Submitted latitude
- Submitted longitude
- Submitted GPS accuracy
- Submitted photo path
- Distance from venue meters

### Check-in / Check-out Fields

- Check-in at
- Check-in latitude
- Check-in longitude
- Check-in accuracy
- Check-in photo path
- Check-in distance from venue meters
- Check-in geo status
- Check-out at
- Check-out latitude
- Check-out longitude
- Check-out accuracy
- Check-out photo path
- Check-out distance from venue meters
- Check-out geo status
- Duration minutes

### Venue Snapshot Fields

Store these on every attendance record:

- Venue latitude snapshot
- Venue longitude snapshot
- Allowed radius snapshot
- Venue name snapshot, optional

### Device/Security Fields

- IP address
- User agent
- Device info, nullable
- Browser timezone, nullable
- Submitted source, e.g. web/mobile

### Attendance Rules

- Coach can only submit attendance for assigned active members.
- Coach cannot submit attendance for another coach’s member.
- Attendance date must be inside assignment period.
- Attendance cannot be submitted for inactive/cancelled/completed assignment.
- One attendance per assignment/member/date unless multiple sessions are explicitly enabled.
- Photo is required.
- GPS is required; if missing, save but flag.
- If outside radius, save but flag.
- If low accuracy, save but flag.
- If submitted outside training time window, save but flag.
- Reviewed/locked attendance cannot be edited by coach.
- Admin can correct/reject/accept with remarks.

---

## 5.6 Geo Location Verification

### Distance Calculation

Use Haversine formula or a dedicated service.

Create service:

```txt
GeoDistanceService
```

Responsibilities:

- Accept venue latitude/longitude and submitted latitude/longitude.
- Return distance in meters.
- Handle missing/invalid coordinates.
- Round distance consistently.

### Flagging Service

Create service:

```txt
ExternalTrainingAttendanceFlaggingService
```

Responsibilities:

- Check if GPS is missing.
- Check if GPS accuracy is too poor.
- Check if distance is outside radius.
- Check if attendance is outside training time window.
- Check duplicate attendance.
- Return geo status and flag reason.

### Suggested Accuracy Rules

- If GPS missing: `location_missing`
- If permission denied: `location_permission_denied`
- If accuracy is greater than configurable threshold, e.g. 100 meters: `low_accuracy`
- If distance > allowed radius: `outside_radius`
- If submitted outside allowed training time: `outside_training_time`
- Else: `valid`

### Important Rule

Do not block suspicious attendance at submit time.

Save the record and mark it flagged so admin can review.

---

## 5.7 Photo Evidence

### Rules

- Photo is required for attendance.
- Store image using existing project media/storage pattern.
- Validate file type.
- Validate file size.
- Compress image if project supports it.
- Show photo preview in admin review.
- Show photo in coach log.
- Do not rely only on EXIF location.
- Browser/device GPS should be the primary coordinate source.

### Optional Enhancements

- Watermark preview with member name, coach name, date/time, venue, and coordinates.
- Store image metadata if available.
- Add second image for check-out if check-in/check-out mode is enabled.

---

## 5.8 Admin Attendance Review

Admin must have a powerful attendance review screen.

### List Columns

- Date
- Member name
- Member code/PNO
- External coach
- Venue
- Sport/game
- Attendance status
- Geo status
- Review status
- Distance from venue
- Photo preview
- Flag reason
- Submitted time
- Reviewed by
- Action

### Filters

- Date range
- Member
- External coach
- Venue
- Sport/game
- Attendance status
- Geo status
- Review status
- Flagged only
- Outside radius only
- Missing location only
- Low accuracy only
- Assignment status

### Detail Page

Show:

- Member details
- Coach details
- Assignment details
- Venue details
- Attendance details
- Photo proof
- Submitted GPS coordinates
- Venue GPS coordinates
- Allowed radius
- Calculated distance
- Device/IP/user agent
- Coach remarks
- Admin review remarks
- Timeline/audit log

### Map View

If map support exists or can be added cleanly, show:

- Venue pin
- Attendance submitted location pin
- Radius circle
- Distance line

### Review Actions

- Accept attendance.
- Reject attendance.
- Correct attendance status.
- Mark as manual review required.
- Add admin remark.
- Lock attendance.

### Review Rules

- Admin must add remark when rejecting flagged attendance.
- Admin must add reason when accepting outside-radius attendance.
- Once locked, coach cannot edit.
- Every review action must be audited.

---

## 5.9 External Coach Portal

Coach portal must be simple, mobile-friendly, and restricted.

### Portal Layout

URL prefix:

```txt
/external-coach
```

Pages:

```txt
/external-coach/login
/external-coach/dashboard
/external-coach/members
/external-coach/members/{member}
/external-coach/attendance
/external-coach/attendance/create
/external-coach/attendance/{attendance}
/external-coach/performance
/external-coach/profile
```

### Dashboard Cards

- Active assigned members
- Today pending attendance
- Today submitted attendance
- This month present count
- Flagged attendance count
- Performance updates due

### Assigned Members Page

Show only assigned members.

Each card/row:

- Member photo
- Member name
- Member code/PNO
- Sport/game
- Venue
- Assignment period
- Today attendance status
- Mark attendance button
- View history button
- Add performance update button

### Mark Attendance Page

Fields:

- Member auto-selected from assignment
- Venue auto-selected
- Sport auto-selected
- Attendance status
- Photo upload/camera capture
- Capture GPS button
- GPS status indicator
- Coach remarks
- Submit button

Frontend behavior:

- Ask browser location permission.
- Show detected coordinates.
- Show accuracy if available.
- Warn if GPS not available.
- Still allow submission only if backend design allows missing GPS as flagged, but photo must be present.
- Make form mobile-friendly.

### Attendance Logs Page

Coach can see:

- Date
- Member
- Status
- Geo status
- Review status
- Distance
- Photo
- Remarks

Coach cannot see:

- Other coaches' data.
- Admin-only remarks if confidential.
- Internal member/team sensitive data.

---

## 5.10 Performance Tracking

External coach should be able to track member performance during training.

### Performance Update Fields

- Assignment ID
- Member ID
- External Coach ID
- Sport/Game ID
- Update date
- Performance score
- Fitness score
- Discipline score
- Skill improvement notes
- Weakness notes
- Coach recommendation
- Injury/fitness concern
- Next target
- Attachment/photo/video, optional
- Review status
- Reviewed by
- Reviewed at
- Review remarks
- Timestamps

### Score Range

Use a consistent range:

```txt
1 to 10
```

or project-standard scoring if already exists.

### Coach Actions

- Add performance update.
- View own submitted updates.
- Edit only if not reviewed, if allowed.

### Admin Actions

- View performance updates.
- Review performance update.
- Add remarks.
- Compare performance with attendance consistency.
- View trend on member profile.

### Member Profile Performance Summary

Show:

- Attendance percentage
- Valid attendance percentage
- Flagged attendance percentage
- Average performance score
- Fitness trend
- Discipline trend
- Latest coach recommendation
- Injury concerns
- Next target

---

## 5.11 Member Profile Integration

Add a new member profile tab:

```txt
External Coaching
```

The tab should show:

- Current active external coaching assignment.
- Previous assignments.
- Coach name and contact.
- Venue/stadium.
- Sport/game.
- Permission start and end date.
- Permission document.
- Attendance summary.
- Flagged attendance count.
- Performance updates.
- Admin review status.
- Assignment history.

### Summary Cards

- Total external training days
- Present days
- Absent days
- Flagged days
- Valid attendance percentage
- Last attendance date
- Last performance update

---

## 5.12 Reports and Exports

Admin reports required:

- External coach list report
- Active assignment report
- Expired assignment report
- Member-wise attendance report
- Coach-wise attendance report
- Venue-wise attendance report
- Flagged attendance report
- Outside-radius attendance report
- Missing-location attendance report
- Performance tracking report
- Suspicious members report
- No-attendance report

Export options:

- Excel
- PDF/print preview if existing project supports it

---

## 5.13 Notifications

Implement notifications if the existing project has a notification system.

### Notify Admin

- Attendance submitted outside radius.
- Attendance submitted without GPS.
- Coach submitted repeated flagged attendance.
- Assignment is expiring soon.
- No attendance submitted for active member.
- Coach account inactive login attempt.

### Notify Coach

- Account created.
- Password reset.
- Assignment created.
- Assignment cancelled.
- Attendance rejected.
- Admin requested correction.

---

## 6. Suggested Database Tables

Codex must inspect existing table/model naming conventions before finalizing. Use these as the target schema.

---

### 6.1 `external_coaches`

Purpose: separate authenticatable table for external coach login.

Fields:

```txt
id
name
email
phone
password
photo_path
address
gender
dob
experience_years
certification_notes
specialization_notes
id_proof_path
status
remarks
last_login_at
remember_token
created_by
updated_by
deleted_by
deleted_at
created_at
updated_at
```

Indexes:

```txt
unique email
index phone
index status
```

Model:

```txt
App\Models\ExternalCoach
```

Must implement Laravel authenticatable behavior.

---

### 6.2 `external_coach_sports`

Purpose: connect external coach to sports/games/events.

Fields:

```txt
id
external_coach_id
sport_id
event_id nullable
is_primary
remarks
created_at
updated_at
```

Indexes:

```txt
external_coach_id
sport_id
event_id
```

---

### 6.3 `training_venues`

Purpose: approved training locations/stadiums.

Fields:

```txt
id
name
code
address
district_id nullable
unit_id nullable
city nullable
state nullable
latitude
longitude
allowed_radius_meters
photo_path
status
remarks
created_by
updated_by
deleted_by
deleted_at
created_at
updated_at
```

Indexes:

```txt
code
status
district_id
unit_id
```

---

### 6.4 `external_coaching_assignments`

Purpose: permission record for member external coaching.

Fields:

```txt
id
member_id
external_coach_id
training_venue_id
sport_id
event_id nullable
start_date
end_date
training_days_json nullable
training_start_time nullable
training_end_time nullable
attendance_mode
permission_reference_no nullable
permission_document_path nullable
status
approved_by nullable
approved_at nullable
paused_by nullable
paused_at nullable
cancelled_by nullable
cancelled_at nullable
cancellation_reason nullable
completed_by nullable
completed_at nullable
completion_remarks nullable
remarks
created_by
updated_by
deleted_by
deleted_at
created_at
updated_at
```

Indexes:

```txt
member_id
external_coach_id
training_venue_id
sport_id
status
start_date
end_date
```

---

### 6.5 `external_training_attendances`

Purpose: attendance record for member external training.

Fields:

```txt
id
assignment_id
member_id
external_coach_id
training_venue_id
attendance_date
attendance_status
attendance_mode

submitted_at nullable
submitted_latitude nullable
submitted_longitude nullable
submitted_accuracy nullable
submitted_photo_path nullable
submitted_distance_from_venue_meters nullable

check_in_at nullable
check_in_latitude nullable
check_in_longitude nullable
check_in_accuracy nullable
check_in_photo_path nullable
check_in_distance_from_venue_meters nullable
check_in_geo_status nullable

check_out_at nullable
check_out_latitude nullable
check_out_longitude nullable
check_out_accuracy nullable
check_out_photo_path nullable
check_out_distance_from_venue_meters nullable
check_out_geo_status nullable

duration_minutes nullable

venue_name_snapshot nullable
venue_latitude_snapshot
venue_longitude_snapshot
allowed_radius_snapshot

geo_status
flag_reason nullable
review_status
reviewed_by nullable
reviewed_at nullable
review_remarks nullable
coach_remarks nullable

ip_address nullable
user_agent nullable
device_info nullable
browser_timezone nullable
submitted_source nullable

created_by nullable
updated_by nullable
deleted_by nullable
deleted_at
created_at
updated_at
```

Unique/index suggestion:

```txt
unique assignment_id + member_id + attendance_date if only one session per day
index member_id
index external_coach_id
index training_venue_id
index attendance_date
index geo_status
index review_status
```

If multiple sessions per day are needed, do not use unique daily constraint. Instead add `session_no` or `training_slot_id`.

---

### 6.6 `external_coach_performance_updates`

Purpose: coach performance tracking for assigned members.

Fields:

```txt
id
assignment_id
member_id
external_coach_id
sport_id
event_id nullable
update_date
performance_score nullable
fitness_score nullable
discipline_score nullable
skill_improvement_notes nullable
weakness_notes nullable
recommendation nullable
injury_notes nullable
next_target nullable
attachment_path nullable
review_status
reviewed_by nullable
reviewed_at nullable
review_remarks nullable
created_at
updated_at
```

Indexes:

```txt
assignment_id
member_id
external_coach_id
sport_id
update_date
review_status
```

---

### 6.7 `external_coach_status_histories`

Purpose: track status changes for external coaches.

Fields:

```txt
id
external_coach_id
old_status
new_status
effective_date
reason nullable
changed_by
created_at
updated_at
```

---

### 6.8 `external_coaching_assignment_histories`

Purpose: track assignment status/date/venue/coach changes.

Fields:

```txt
id
assignment_id
old_status nullable
new_status nullable
old_external_coach_id nullable
new_external_coach_id nullable
old_training_venue_id nullable
new_training_venue_id nullable
old_start_date nullable
old_end_date nullable
new_start_date nullable
new_end_date nullable
reason nullable
changed_by
created_at
updated_at
```

---

## 7. Services / Actions to Create

Codex should create service/action classes instead of putting all logic inside controllers.

Recommended classes:

```txt
ExternalCoachAuthService
ExternalCoachAccessService
ExternalCoachStatusService
TrainingVenueService
ExternalCoachingAssignmentService
ExternalTrainingAttendanceService
GeoDistanceService
ExternalTrainingAttendanceFlaggingService
ExternalTrainingAttendanceReviewService
ExternalCoachPerformanceService
ExternalCoachingReportService
```

### 7.1 `GeoDistanceService`

Methods:

```txt
calculateDistanceInMeters($lat1, $lng1, $lat2, $lng2): float
isWithinRadius($distance, $radius): bool
```

### 7.2 `ExternalTrainingAttendanceFlaggingService`

Methods:

```txt
evaluateAttendanceLocation(attendanceData, venue): GeoResult
buildFlagReason(geoStatus, distance, radius, accuracy): string
```

### 7.3 `ExternalCoachAccessService`

Methods:

```txt
canAccessMember(externalCoach, member): bool
canAccessAssignment(externalCoach, assignment): bool
canSubmitAttendance(externalCoach, assignment): bool
```

---

## 8. Policies and Security

Create policies for:

```txt
ExternalCoachPolicy
TrainingVenuePolicy
ExternalCoachingAssignmentPolicy
ExternalTrainingAttendancePolicy
ExternalCoachPerformanceUpdatePolicy
```

### Critical Security Rules

- External coach can only access assigned members.
- External coach cannot access admin routes.
- External coach cannot submit attendance for inactive assignment.
- External coach cannot submit attendance for another coach's assignment.
- External coach cannot edit reviewed/locked attendance.
- Admin actions require existing project permissions.
- Never trust frontend-submitted member ID alone.
- Always resolve member through active assignment.
- Store audit trail for review/status changes.

---

## 9. Admin UI Requirements

### 9.1 Sidebar/Menu

Add admin menu item:

```txt
External Coaching
```

Sub-menu:

```txt
Dashboard
External Coaches
Training Venues
Assignments
Attendance Review
Flagged Attendance
Performance Updates
Reports
```

### 9.2 External Coaching Dashboard

Cards:

- Active external coaches
- Active assignments
- Members under external coaching
- Today attendance submitted
- Today pending attendance
- Flagged attendance
- Outside-radius attendance
- Assignments expiring soon
- Inactive/suspended coaches

Charts/tables if existing UI supports:

- Attendance trend
- Flagged attendance by venue
- Coach-wise compliance
- Member-wise suspicious count

### 9.3 External Coach Detail Tabs

Tabs:

```txt
Overview
Assigned Members
Assignments
Attendance Logs
Flagged Attendance
Performance Updates
Documents
Status History
Audit Log
```

### 9.4 Training Venue Detail Tabs

Tabs:

```txt
Overview
Assigned Coaches
Assigned Members
Attendance Logs
Flagged Records
Map
Audit Log
```

### 9.5 Assignment Detail Tabs

Tabs:

```txt
Overview
Attendance
Performance
Documents
History
Audit Log
```

---

## 10. Coach Portal UI Requirements

Coach portal should use a separate layout from admin layout.

### Design Goals

- Very simple.
- Mobile-friendly.
- Large buttons.
- Minimal navigation.
- No admin complexity.
- Works well on phone at training ground.

### Pages

```txt
Login
Dashboard
Assigned Members
Member Detail
Mark Attendance
Attendance Logs
Performance Updates
Profile
```

### Coach Dashboard

Show:

- Welcome coach name
- Assigned members count
- Today pending attendance
- Today submitted attendance
- Flagged records
- Performance updates this month

### Mark Attendance UX

Steps:

1. Select/open assigned member.
2. Show assignment details.
3. Click Mark Attendance.
4. Upload/capture photo.
5. Capture GPS.
6. Add status/remarks.
7. Submit.
8. Show result:
   - Attendance submitted successfully.
   - Geo valid or flagged for admin review.

---

## 11. Validation Requirements

### Coach Validation

- Name required.
- Email required and unique.
- Password required on create.
- Phone required if business requires.
- Status valid.
- Photo optional but validate type/size.

### Venue Validation

- Name required.
- Latitude required for active venue.
- Longitude required for active venue.
- Radius required and numeric.
- Radius should be between configurable min/max.

### Assignment Validation

- Member required.
- Coach required and active.
- Venue required and active.
- Sport/game required.
- Start date required.
- End date required.
- End date must be >= start date.
- Prevent overlapping active assignments.
- Permission document optional but validate file type/size.

### Attendance Validation

- Assignment required and active.
- Member must belong to assignment.
- Coach must belong to assignment.
- Attendance date must be within assignment period.
- Photo required.
- Coordinates required if strict mode; otherwise allow but flag.
- Status required.
- Duplicate attendance should be prevented.
- Reviewed attendance cannot be modified by coach.

---

## 12. Commands / Scheduled Jobs

Create scheduled command if project uses scheduler:

```txt
external-coaching:expire-assignments
```

Purpose:

- Mark assignments as expired after end date.
- Notify admin of expired assignments.

Optional command:

```txt
external-coaching:missing-attendance-alerts
```

Purpose:

- Detect active assignments where attendance was not submitted.
- Notify admin/coach.

---

## 13. Testing Requirements

Create tests for:

### Auth Tests

- External coach can login from coach login page.
- External coach cannot login from admin login page.
- Admin login still works.
- Inactive coach cannot login.
- Suspended coach cannot login.
- Logged-in inactive coach is logged out on next request.

### Access Tests

- Coach can see assigned members only.
- Coach cannot see unassigned member.
- Coach cannot submit attendance for another coach’s assignment.
- Coach cannot access admin routes.

### Assignment Tests

- Admin can create assignment.
- Assignment requires active coach.
- Assignment requires active venue.
- Overlapping assignment is blocked.
- Cancelled assignment blocks future attendance.

### Attendance Tests

- Attendance can be submitted with photo/GPS.
- Distance is calculated correctly.
- Within-radius attendance becomes valid.
- Outside-radius attendance becomes flagged.
- Missing GPS becomes flagged.
- Duplicate attendance is blocked.
- Reviewed attendance cannot be edited by coach.

### Review Tests

- Admin can accept flagged attendance.
- Admin can reject flagged attendance.
- Review remark is stored.
- Reviewed by and reviewed at are stored.

### Performance Tests

- Coach can add performance update for assigned member.
- Coach cannot add update for unassigned member.
- Admin can review performance update.

---

## 14. Non-Negotiable Requirements

Codex must follow these strictly:

1. Do not modify/break existing admin login.
2. External coach login must be separate.
3. External coach must use separate guard and preferably separate table.
4. External coach cannot access admin panel.
5. External coach can only see assigned members.
6. Attendance is for member training, not coach attendance.
7. Photo proof is required.
8. GPS location must be captured or attendance must be flagged.
9. Outside-radius attendance must be saved and flagged, not silently rejected.
10. Admin must have review workflow.
11. Member profile must show external coaching tab.
12. Store venue coordinate snapshot on attendance.
13. Store full history for coach status and assignment changes.
14. Add tests.
15. Follow existing project patterns.
16. Do not add unnecessary language-specific duplicate fields.

---

# 15. Master Codex Prompt

Copy this prompt into Codex first.

```text
You are a senior Laravel + Inertia application architect working inside an existing Athletic Management System.

Build a full production-ready External Coaching & Athlete Training Verification module.

Important context:
- The app already has Laravel + Inertia, existing admin/internal login, member module, team module, official coach/team-related flow, permissions, and member profile tabs.
- Do not break or rewrite existing admin/internal login.
- External coaches must have a separate login system from system admin users.
- External coaches should authenticate through a separate URL `/external-coach/login` using a separate guard named `external_coach`.
- Prefer a separate `external_coaches` authenticatable table instead of storing these coaches in the main `users` table.
- Admin/internal users continue using the existing `users` table and `web` guard.
- External coaches must never access the admin panel.
- External coaches can only see members assigned to them for external training.
- Attendance belongs to the member's external training, not to the coach.

Business problem:
Some athletes/members are allowed to train outside their official team under an external/private coach for a fixed period at an approved stadium/training venue. Some players may falsely claim they are training, so the system must require the external coach to submit attendance with photo proof, GPS location, timestamp, and venue-radius verification. If the GPS location is outside the approved radius, missing, or suspicious, the attendance should still be saved but flagged for admin review.

Build the complete flow:
1. External coach management by admin.
2. Separate external coach authentication guard/login.
3. Training venue/stadium management with latitude, longitude, and allowed radius.
4. Member-to-external-coach assignment with sport/game, venue, permission period, document, and approval status.
5. Restricted external coach portal.
6. Attendance submission with photo and GPS.
7. Distance calculation from approved venue using Haversine formula.
8. Automatic geo-status and flag reason.
9. Admin attendance review workflow.
10. Member profile External Coaching tab.
11. Performance tracking by external coach.
12. Reports, filters, dashboards, status history, and tests.

Before coding:
- Inspect the existing repo structure.
- Find current patterns for routes, controllers, models, policies, permissions, Inertia pages, layouts, form requests, file uploads, status history, and member profile tabs.
- Propose the implementation plan based on existing conventions.
- Then implement in clean, reviewable commits/steps.

Do not create fields like name_en/name_hi unless this project strictly requires them. Use simple fields like name, code, description, remarks, address.

Critical security:
- Never trust frontend member_id alone.
- Always verify the assignment belongs to the authenticated external coach.
- Inactive/suspended/blacklisted external coach cannot login or access data.
- Reviewed/locked attendance cannot be edited by coach.
- Admin review actions must be audited.

Add tests for auth, access control, assignment validation, attendance geo calculation, flagging, review workflow, and performance updates.
```

---

# 16. Step-by-Step Codex Prompts

Use these prompts one by one if you want better control.

---

## Prompt 1 — Repo Discovery and Final Plan

```text
Inspect the existing Laravel + Inertia Athletic Management System codebase.

Find and summarize current patterns for:
- Auth/login routes and guards
- Admin routes and middleware
- Existing user model and role/permission system
- Member model and member profile tabs
- Team module
- Official coach-related module, if any
- Sports/games/events tables
- Media/file upload pattern
- Status history/audit pattern
- Inertia layouts and components
- Form requests and policies
- Exports/reports pattern

Then produce a final implementation plan for the External Coaching & Athlete Training Verification module.

Important requirements:
- External coach login must be separate from admin login.
- Use separate guard `external_coach`.
- Prefer separate authenticatable table `external_coaches`.
- Do not break existing admin login.
- External coach can only access assigned members.
- Attendance requires photo + GPS and geo-radius verification.
- Suspicious attendance must be saved and flagged for admin review.

Do not code yet. First provide the plan and exact files you intend to create/update.
```

---

## Prompt 2 — Database, Models, Enums, Relationships

```text
Implement the database foundation for the External Coaching & Athlete Training Verification module.

Create migrations, models, enums/constants, factories if the project uses them, and relationships for:

1. external_coaches
2. external_coach_sports
3. training_venues
4. external_coaching_assignments
5. external_training_attendances
6. external_coach_performance_updates
7. external_coach_status_histories
8. external_coaching_assignment_histories

Requirements:
- `external_coaches` must be authenticatable for a separate Laravel guard.
- Use soft deletes where appropriate.
- Add created_by/updated_by/deleted_by if existing project pattern supports it.
- Add indexes and foreign keys.
- Store venue coordinate snapshots on attendance records.
- Support single attendance and check-in/check-out mode if possible.
- Do not add unnecessary name_en/name_hi fields.
- Follow existing migration/model naming conventions.

After implementation, show all created/updated files and explain relationships.
```

---

## Prompt 3 — Separate External Coach Auth

```text
Build separate authentication for external coaches.

Requirements:
- Add `external_coach` guard in config/auth.php.
- Add `external_coaches` provider using App\Models\ExternalCoach.
- Add external coach login page at `/external-coach/login`.
- Add logout.
- Add forgot/reset password if cleanly supported.
- Do not alter or break existing admin/internal login.
- Admin/internal users continue using `web` guard and existing users table.
- External coaches use `external_coach` guard and external_coaches table.
- Create middleware to block inactive/suspended/blacklisted coaches.
- If inactive coach tries to login, show: “Your coach account is inactive. Please contact the administrator.”
- External coach must not access admin routes.

Add tests proving:
- Admin login still works.
- External coach login works separately.
- External coach cannot login from admin login.
- Inactive/suspended coach cannot login.
- External coach cannot access admin panel.
```

---

## Prompt 4 — Admin External Coach Management

```text
Build admin CRUD for external coaches.

Requirements:
- Admin can create external coach with name, email, phone, password, photo, address, sports/games, experience, certification notes, specialization notes, status, and remarks.
- Store coach in external_coaches table.
- Email must be unique.
- Photo/document uploads must follow existing project media pattern.
- Admin can activate, inactivate, suspend, blacklist coach.
- Store status change history in external_coach_status_histories.
- Admin can reset coach password or send invite if existing notification system supports it.
- Coach detail page should have tabs: Overview, Assigned Members, Assignments, Attendance Logs, Flagged Attendance, Performance Updates, Documents, Status History, Audit Log.
- Add filters by status, sport/game, venue, assigned member.
- Follow existing admin UI components and Inertia patterns.

Add policy/permission checks based on existing project pattern.
```

---

## Prompt 5 — Training Venue Management

```text
Build admin CRUD for training venues/stadiums.

Requirements:
- Fields: name, code, address, district/unit if available, latitude, longitude, allowed_radius_meters, photo, status, remarks.
- Latitude, longitude, and radius are required for active venues.
- Default radius may be 200 meters but admin can change it.
- Venue detail page should show assigned coaches, assigned members, attendance logs, flagged records, and map if supported.
- Attendance records must store venue coordinate snapshots later, so venue edits do not change old attendance evidence.
- Follow existing UI and validation patterns.
```

---

## Prompt 6 — Member External Coaching Assignment Flow

```text
Build the external coaching assignment flow.

Admin should be able to assign a member/athlete to an external coach at a training venue for a fixed period.

Fields:
- member_id
- external_coach_id
- training_venue_id
- sport_id
- event_id nullable
- start_date
- end_date
- training_days_json nullable
- training_start_time nullable
- training_end_time nullable
- attendance_mode
- permission_reference_no nullable
- permission_document_path nullable
- status
- remarks

Rules:
- Member must be active.
- External coach must be active.
- Venue must be active.
- Sport/game is required.
- End date must be after or equal to start date.
- Prevent overlapping active assignments for same member + same sport/game + overlapping period unless there is explicit admin override permission.
- Attendance can only be marked during active assignment period.
- Admin can approve, pause, cancel, complete, reject, or expire assignment.
- Store assignment history for status/date/coach/venue changes.

UI:
- Assignment list with filters.
- Assignment create/edit form.
- Assignment detail page with tabs: Overview, Attendance, Performance, Documents, History, Audit Log.
- Add External Coaching tab to member profile showing current and historical assignments.
```

---

## Prompt 7 — Restricted External Coach Portal

```text
Build the restricted external coach portal using Inertia.

Routes under `/external-coach` must use `auth:external_coach` and active coach middleware.

Pages:
- Dashboard
- Assigned Members
- Member Detail
- Mark Attendance
- Attendance Logs
- Performance Updates
- Profile

Rules:
- Coach sees only members assigned to them through active assignments.
- Coach cannot access any unassigned member.
- Coach cannot access admin pages.
- Coach cannot see other coaches or internal member database.
- Coach cannot submit attendance for inactive/cancelled/completed assignments.

Dashboard cards:
- Assigned members
- Today pending attendance
- Today submitted attendance
- This month attendance
- Flagged records
- Performance updates due

The UI should be mobile-friendly and simple because the coach may use it from the training ground.
```

---

## Prompt 8 — Attendance Submission with Photo, GPS, Distance, Flagging

```text
Build external training attendance submission.

Attendance is for the member's external training, not coach attendance.

Requirements:
- Coach selects assigned member/assignment.
- System auto-resolves member, external coach, venue, and sport from assignment.
- Coach submits attendance status, photo, GPS coordinates, accuracy, and remarks.
- Capture IP address and user agent.
- Store venue coordinate snapshot and allowed radius snapshot.
- Calculate distance from approved venue using Haversine formula.
- Save distance in meters.
- Determine geo_status and flag_reason.

Geo rules:
- Within radius -> geo_status valid.
- Outside radius -> outside_radius and flagged.
- GPS missing -> location_missing and flagged.
- GPS permission denied -> location_permission_denied and flagged.
- Poor GPS accuracy -> low_accuracy and flagged.
- Outside training time -> outside_training_time and flagged.

Important:
- Do not silently reject outside-radius attendance.
- Save suspicious attendance and mark it for admin review.
- Photo is required.
- Duplicate attendance for same assignment/member/date should be blocked unless multiple sessions are enabled.
- Coach cannot edit reviewed/locked attendance.

Create services:
- GeoDistanceService
- ExternalTrainingAttendanceFlaggingService
- ExternalTrainingAttendanceService

Add tests for distance calculation and flagging.
```

---

## Prompt 9 — Admin Attendance Review and Map View

```text
Build admin attendance review workflow.

Pages:
- All external training attendance
- Flagged attendance
- Attendance detail page

List columns:
- Date
- Member
- Member code/PNO
- External coach
- Venue
- Sport/game
- Attendance status
- Geo status
- Review status
- Distance from venue
- Photo preview
- Flag reason
- Submitted time
- Action

Filters:
- Date range
- Member
- Coach
- Venue
- Sport/game
- Attendance status
- Geo status
- Review status
- Flagged only
- Outside-radius only
- Missing-location only
- Low-accuracy only

Detail page:
- Member details
- Coach details
- Assignment details
- Venue details
- Photo proof
- Submitted coordinates
- Venue coordinates
- Allowed radius
- Distance
- Device/IP/user agent
- Coach remarks
- Admin review remarks
- Audit timeline

Actions:
- Accept attendance
- Reject attendance
- Correct attendance
- Lock attendance
- Add review remarks

Rules:
- Admin must add reason when rejecting.
- Admin must add reason when accepting outside-radius attendance.
- Store reviewed_by and reviewed_at.
- Audit every review action.
- Coach cannot edit reviewed/locked records.

If map support exists or can be added cleanly, show venue pin, submitted location pin, radius circle, and distance line.
```

---

## Prompt 10 — Performance Tracking

```text
Build external coach performance tracking for assigned members.

Coach can add performance updates only for assigned active members.

Fields:
- assignment_id
- member_id
- external_coach_id
- sport_id
- event_id nullable
- update_date
- performance_score
- fitness_score
- discipline_score
- skill_improvement_notes
- weakness_notes
- recommendation
- injury_notes
- next_target
- attachment_path nullable
- review_status

Rules:
- Coach can only add performance update for their own assigned members.
- Coach can edit only unreviewed updates if allowed.
- Admin can review updates and add remarks.
- Show performance history in member profile External Coaching tab.
- Combine attendance percentage, valid attendance percentage, flagged percentage, and performance trend.

Add tests for access control and review workflow.
```

---

## Prompt 11 — Reports, Dashboard, Notifications

```text
Build reports, dashboard widgets, and notifications for External Coaching.

Admin dashboard cards:
- Active external coaches
- Active assignments
- Members under external coaching
- Today submitted attendance
- Today pending attendance
- Flagged attendance
- Outside-radius records
- Assignments expiring soon

Reports:
- Coach-wise attendance report
- Member-wise attendance report
- Venue-wise attendance report
- Flagged attendance report
- Outside-radius report
- Missing-location report
- Performance report
- No-attendance report
- Active/expired assignment report

Exports:
- Excel if project supports it
- PDF/print preview if project supports it

Notifications:
- Admin notified for outside-radius attendance.
- Admin notified for missing GPS attendance.
- Admin notified for repeated flagged records.
- Coach notified when assignment is created/cancelled.
- Coach notified when attendance is rejected.

Follow existing notification/export/report patterns.
```

---

## Prompt 12 — Final QA, Tests, Security Review

```text
Perform final QA and security review for the External Coaching module.

Check:
- Existing admin login still works.
- Existing users table/auth behavior is not broken.
- External coach login works separately.
- External coach guard/session works correctly.
- Inactive/suspended/blacklisted coach cannot login/access data.
- Coach cannot access admin routes.
- Coach sees only assigned members.
- Coach cannot submit attendance for another coach's member.
- GPS distance calculation is correct.
- Outside-radius attendance is flagged.
- Missing GPS attendance is flagged.
- Admin review works.
- Reviewed attendance is locked from coach editing.
- Member profile External Coaching tab works.
- Reports and filters work.
- File uploads are validated.
- Policies and middleware are applied everywhere.
- Tests pass.

Fix any bugs found and provide a summary of all files changed.
```

---

## 17. Acceptance Criteria

The feature is complete only when all of the following are true:

- Admin login remains unaffected.
- External coach has a separate login page.
- External coach uses separate guard/table.
- Admin can create/manage external coaches.
- Admin can create/manage training venues with GPS and radius.
- Admin can assign members to external coaches for fixed periods.
- Coach can login and see only assigned members.
- Coach can submit attendance with photo and GPS.
- System calculates distance from approved venue.
- Outside-radius attendance is flagged.
- Missing/poor GPS attendance is flagged.
- Admin can review attendance.
- Member profile shows external coaching details.
- Coach can add performance updates.
- Admin can view reports.
- Status histories are stored.
- Tests are added and passing.
- Existing official team coach flow is not broken.

---

## 18. Suggested Implementation Order

1. Repo discovery and plan.
2. Database migrations/models/enums.
3. Auth guard and external coach login.
4. Admin external coach CRUD.
5. Training venue CRUD.
6. Assignment flow.
7. Coach portal.
8. Attendance photo/GPS submission.
9. Geo-distance and flagging service.
10. Admin review workflow.
11. Member profile integration.
12. Performance tracking.
13. Reports/exports/notifications.
14. Tests.
15. Final QA/security review.

---

## 19. Final Notes for Codex

This feature should be treated as a serious verification and compliance module, not just a basic attendance form.

The most important things are:

- Separate external coach login.
- Strong access control.
- Member assignment boundaries.
- Photo + GPS proof.
- Distance calculation.
- Flagged attendance review.
- Full history and auditability.
- Clean integration with existing member profile.

Build it in a way that future features like QR verification, device fingerprinting, check-in/check-out duration, AI fraud detection, or mobile app support can be added later without rewriting the core architecture.
