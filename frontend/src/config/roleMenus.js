// frontend/src/config/roleMenus.js
// Menu at feature list ng bawat role (galing sa functional requirements)

export const roleMenus = {
  staff: {
    title: "Church Staff / Secretary",
    base: "/staff",
    items: [
      { path: "members", label: "Members & Records", desc: "Add and update member records" },
      { path: "qr", label: "QR Codes", desc: "Generate QR codes for members" },
      { path: "attendance", label: "Attendance", desc: "Manage attendance records" },
      { path: "events", label: "Events & Announcements", desc: "Manage events and announcements" },
      { path: "geofence", label: "Geofence", desc: "Set location for off-site events" },
      { path: "schedules", label: "Ministry Schedules", desc: "Manage ministry schedules" },
      { path: "giving", label: "Giving", desc: "Record giving transactions" },
      { path: "reports", label: "Reports", desc: "Generate reports and predictive attendance" },
      { path: "sermons", label: "Sermon Archive", desc: "Upload audio for transcript and summary" },
      { path: "notifications", label: "Notifications", desc: "Send notifications" },
      { path: "profile", label: "My Profile", desc: "Update your profile and photo" },
    ],
  },
  ministry_leader: {
    title: "Ministry Leader",
    base: "/ministry",
    items: [
      { path: "schedule", label: "Ministry Schedule", desc: "View the ministry schedule" },
      { path: "members", label: "Ministry Members", desc: "Manage ministry members" },
      { path: "add-ministry", label: "Add Ministry", desc: "Add a ministry or small group" },
      { path: "volunteers", label: "Volunteers", desc: "Assign volunteers" },
      { path: "activities", label: "Activities", desc: "Manage and update activity status" },
      { path: "events", label: "Ministry Events", desc: "Manage ministry events" },
      { path: "attendance", label: "Attendance", desc: "View ministry attendance" },
      { path: "notifications", label: "Notifications", desc: "Notifications and schedule conflict alerts" },
      { path: "profile", label: "My Profile", desc: "Update your profile and photo" },
    ],
  },
  member: {
    title: "Member Portal",
    base: "/portal",
    items: [
      { path: "profile", label: "My Profile", desc: "Register and update your profile" },
      { path: "qr", label: "My QR Code", desc: "Show your QR code for check-in" },
      { path: "checkin", label: "GPS Check-in", desc: "Check in at off-site events" },
      { path: "prayers", label: "Prayer Requests", desc: "Submit a prayer request" },
      { path: "announcements", label: "Announcements & Sermons", desc: "View announcements, transcripts and summaries" },
      { path: "events", label: "Events & RSVP", desc: "RSVP to events" },
      { path: "ministries", label: "Ministries & Groups", desc: "Join ministries and small groups" },
      { path: "recommended", label: "Recommended", desc: "Recommended ministries and groups" },
      { path: "language", label: "Language", desc: "Choose preferred language" },
      { path: "notifications", label: "Notifications", desc: "View your notifications" },
    ],
  },
};