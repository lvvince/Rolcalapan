// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleLayout from "./components/RoleLayout";
import ChatWidget from "./components/ChatWidget";

import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import RoleDashboard from "./pages/RoleDashboard";
import { ComingSoon } from "./pages/Placeholder";

import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import KnowledgeBasePage from "./pages/admin/KnowledgeBasePage";
import AdminUsers from "./pages/admin/AdminUsers";
import {
  AdminMinistries,
  AdminPrayers,
} from "./pages/admin/AdminPages";

import {
  StaffMembers,
  QrCodes,
  StaffAttendance,
  EventsAnnouncements,
  Geofence,
  StaffSchedules,
  Giving,
  Reports,
  Sermons,
  StaffNotifications,
} from "./pages/staff/StaffDashboard";

import {
  LeaderSchedule,
  LeaderMembers,
  LeaderVolunteers,
  LeaderActivities,
  LeaderEvents,
  LeaderAttendance,
  LeaderNotifications,
} from "./pages/ministry/MinistryDashboard";

import {
  Profile,
  MyQr,
  GpsCheckin,
  Prayers,
  AnnouncementsSermons,
  EventsRsvp,
  Ministries,
  Recommended,
  Language,
  MemberNotifications,
} from "./pages/member/MemberDashboard";

const portal = (path, role, children) => (
  <Route
    path={path}
    element={
      <ProtectedRoute roles={[role]}>
        <RoleLayout role={role} />
      </ProtectedRoute>
    }
  >
    <Route index element={<RoleDashboard role={role} />} />
    {children}
    <Route path="*" element={<ComingSoon />} />
  </Route>
);

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Email Verification */}
          <Route path="/verify-email" element={<VerifyEmail />} />

          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* ADMIN */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="members" element={<StaffMembers />} />
            <Route path="ministries" element={<AdminMinistries />} />
            <Route path="events" element={<EventsAnnouncements />} />
            <Route path="giving" element={<Giving />} />
            <Route path="attendance" element={<StaffAttendance />} />
            <Route path="prayers" element={<AdminPrayers />} />
            <Route path="chatbot" element={<KnowledgeBasePage />} />
            <Route path="*" element={<ComingSoon />} />
          </Route>

          {/* STAFF */}
          {portal(
            "/staff",
            "staff",
            <>
              <Route path="members" element={<StaffMembers />} />
              <Route path="qr" element={<QrCodes />} />
              <Route path="attendance" element={<StaffAttendance />} />
              <Route path="events" element={<EventsAnnouncements />} />
              <Route path="geofence" element={<Geofence />} />
              <Route path="schedules" element={<StaffSchedules />} />
              <Route path="giving" element={<Giving />} />
              <Route path="reports" element={<Reports />} />
              <Route path="sermons" element={<Sermons />} />
              <Route
                path="notifications"
                element={<StaffNotifications />}
              />
            </>
          )}

          {/* MINISTRY LEADER */}
          {portal(
            "/ministry",
            "ministry_leader",
            <>
              <Route path="schedule" element={<LeaderSchedule />} />
              <Route path="members" element={<LeaderMembers />} />
              <Route path="volunteers" element={<LeaderVolunteers />} />
              <Route path="activities" element={<LeaderActivities />} />
              <Route path="events" element={<LeaderEvents />} />
              <Route path="attendance" element={<LeaderAttendance />} />
              <Route
                path="notifications"
                element={<LeaderNotifications />}
              />
            </>
          )}

          {/* MEMBER PORTAL */}
          {portal(
            "/portal",
            "member",
            <>
              <Route path="profile" element={<Profile />} />
              <Route path="qr" element={<MyQr />} />
              <Route path="checkin" element={<GpsCheckin />} />
              <Route path="prayers" element={<Prayers />} />
              <Route
                path="announcements"
                element={<AnnouncementsSermons />}
              />
              <Route path="events" element={<EventsRsvp />} />
              <Route path="ministries" element={<Ministries />} />
              <Route path="recommended" element={<Recommended />} />
              <Route path="language" element={<Language />} />
              <Route
                path="notifications"
                element={<MemberNotifications />}
              />
            </>
          )}

          {/* DEFAULT ROUTE */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>

        {/* Floating chatbot, lalabas sa lahat ng page */}
        <ChatWidget />
      </BrowserRouter>
    </AuthProvider>
  );
}