import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleLayout from "./components/RoleLayout";
import ChatWidget from "./components/ChatWidget";
import NotifToast from "./components/NotifToast";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import RoleDashboard from "./pages/RoleDashboard";
import { ComingSoon } from "./pages/Placeholder";

import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProfile from "./pages/admin/AdminProfile";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminMembers from "./pages/admin/AdminMembers";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";
import {
  AdminMinistries,
  AdminPrayers,
  AdminNotifications,
} from "./pages/admin/AdminPages";

import SecretaryHome from "./pages/secretary/SecretaryHome";
import StaffProfile from "./pages/secretary/StaffProfile";
import {
  StaffMembers,
  QrCodes,
  StaffAttendance,
  EventsAnnouncements,
  StaffAnnouncements,
  Geofence,
  StaffSchedules,
  Giving,
  Reports,
  Sermons,
  StaffNotifications,
} from "./pages/secretary/StaffDashboard";

import MinistryHome from "./pages/ministry/MinistryHome";
import AddMinistryPage from "./pages/ministry/AddMinistryPage";
import {
  LeaderSchedule,
  LeaderMembers,
  LeaderVolunteers,
  LeaderActivities,
  LeaderEvents,
  LeaderAttendance,
  LeaderNotifications,
  LeaderProfile,
} from "./pages/ministry/MinistryDashboard";

// Ang Recommended ay tab na sa Ministries (may redirect sa ibaba).
// Wala na ang Language sa sidebar (nasa topbar switcher na).
import {
  Profile,
  MyQr,
  GpsCheckin,
  Prayers,
  MemberAnnouncements,
  MemberSermons,
  EventsRsvp,
  Ministries,
  MemberNotifications,
} from "./pages/member/MemberDashboard";
import MemberHome from "./pages/member/MemberHome";

// path, role, child routes, optional custom home (index) page
const portal = (path, role, children, home) => (
  <Route
    path={path}
    element={
      <ProtectedRoute roles={[role]}>
        <RoleLayout role={role} />
      </ProtectedRoute>
    }
  >
    <Route index element={home || <RoleDashboard role={role} />} />
    {children}
    <Route path="*" element={<ComingSoon />} />
  </Route>
);

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* HOME PAGE */}
          <Route path="/" element={<Home />} />

          {/* AUTHENTICATION */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
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
            <Route path="profile" element={<AdminProfile />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="members" element={<AdminMembers />} />
            <Route path="ministries" element={<AdminMinistries />} />
            <Route path="events" element={<EventsAnnouncements canDelete />} />
            <Route path="announcements" element={<AdminAnnouncements />} />
            <Route path="giving" element={<Giving canDelete />} />
            <Route path="attendance" element={<StaffAttendance canDelete />} />
            <Route path="reports" element={<Reports />} />
            {/* lumang link, redirect sa Reports */}
            <Route
              path="attendance-insights"
              element={<Navigate to="/admin/reports" replace />}
            />
            <Route path="prayers" element={<AdminPrayers />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="*" element={<ComingSoon />} />
          </Route>

          {/* STAFF / SECRETARY */}
          {portal(
            "/staff",
            "staff",
            <>
              <Route path="members" element={<StaffMembers />} />
              <Route path="qr" element={<QrCodes />} />
              <Route path="attendance" element={<StaffAttendance />} />
              <Route path="events" element={<EventsAnnouncements />} />
              <Route path="announcements" element={<StaffAnnouncements />} />
              <Route path="geofence" element={<Geofence />} />
              <Route path="schedules" element={<StaffSchedules />} />
              <Route path="giving" element={<Giving />} />
              <Route path="reports" element={<Reports />} />
              <Route path="sermons" element={<Sermons />} />
              <Route path="notifications" element={<StaffNotifications />} />
              <Route path="profile" element={<StaffProfile />} />
            </>,
            <SecretaryHome />
          )}

          {/* MINISTRY LEADER */}
          {portal(
            "/ministry",
            "ministry_leader",
            <>
              <Route path="schedule" element={<LeaderSchedule />} />
              <Route path="members" element={<LeaderMembers />} />
              <Route path="add-ministry" element={<AddMinistryPage />} />
              <Route path="volunteers" element={<LeaderVolunteers />} />
              <Route path="activities" element={<LeaderActivities />} />
              <Route path="events" element={<LeaderEvents />} />
              <Route path="attendance" element={<LeaderAttendance />} />
              <Route path="notifications" element={<LeaderNotifications />} />
              <Route path="profile" element={<LeaderProfile />} />
            </>,
            <MinistryHome />
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
              <Route path="announcements" element={<MemberAnnouncements />} />
              <Route path="sermons" element={<MemberSermons />} />
              <Route path="events" element={<EventsRsvp />} />
              <Route path="ministries" element={<Ministries />} />
              {/* lumang links, redirect para hindi masira ang bookmarks */}
              <Route
                path="recommended"
                element={<Navigate to="/portal/ministries?tab=recommended" replace />}
              />
              <Route path="language" element={<Navigate to="/portal" replace />} />
              <Route path="notifications" element={<MemberNotifications />} />
            </>,
            <MemberHome />
          )}

          {/* DEFAULT ROUTE */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Floating chatbot */}
        <ChatWidget />

        {/* Pop-up para sa bagong notification (lahat ng role) */}
        <NotifToast />
      </BrowserRouter>
    </AuthProvider>
  );
}