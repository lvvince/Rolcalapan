// frontend/src/pages/ministry/MinistryPages.jsx
import { useState } from "react";
import DataPage, { hm } from "../../components/DataPage";
import NotificationsView from "../../components/Notifications";
import { eventFields, eventColumns } from "../staff/StaffDashboard";
const mineLookup = { ministries: { resource: "ministries", params: { mine: 1 }, label: "name" } };

export function LeaderSchedule() {
  return (
    <>
      <h2>Ministry Schedule</h2>
      <DataPage
        title="Schedules"
        resource="ministry_schedules"
        addLabel="Schedule"
        lookups={{ ...mineLookup, members: { resource: "members", label: "full_name" } }}
        columns={[
          { key: "ministry_name", label: "Ministry" },
          { key: "title", label: "Title" },
          { key: "schedule_date", label: "Date" },
          { label: "Time", render: (r) => `${hm(r.start_time)}-${hm(r.end_time)}` },
          { key: "location", label: "Location" },
          { key: "volunteer_name", label: "Volunteer" },
        ]}
        fields={[
          { key: "ministry_id", label: "Ministry", type: "select", lookup: "ministries", required: true },
          { key: "title", label: "Title", required: true },
          { key: "schedule_date", label: "Date", type: "date", required: true },
          { key: "start_time", label: "Start time", type: "time", required: true },
          { key: "end_time", label: "End time", type: "time", required: true },
          { key: "location", label: "Location" },
          { key: "volunteer_member_id", label: "Assign volunteer (conflict is checked)", type: "select", lookup: "members" },
        ]}
      />
    </>
  );
}

const mmFields = [
  { key: "ministry_id", label: "Ministry", type: "select", lookup: "ministries", required: true },
  { key: "member_id", label: "Member", type: "select", lookup: "members", required: true },
  { key: "role", label: "Role", type: "select", required: true, options: [{ value: "member", label: "Member" }, { value: "volunteer", label: "Volunteer" }] },
];
const mmLookups = { ...mineLookup, members: { resource: "members", label: "full_name" } };

export function LeaderMembers() {
  return (
    <>
      <h2>Ministry Members</h2>
      <DataPage
        title="Members"
        resource="ministry_members"
        addLabel="Member"
        lookups={mmLookups}
        defaults={{ role: "member" }}
        columns={[
          { key: "ministry_name", label: "Ministry" },
          { key: "member_name", label: "Member" },
          { label: "Role", render: (r) => <span className={`badge ${r.role === "volunteer" ? "ok" : ""}`}>{r.role}</span> },
        ]}
        fields={mmFields}
      />
    </>
  );
}

export function LeaderVolunteers() {
  return (
    <>
      <h2>Volunteers</h2>
      <DataPage
        title="Volunteers"
        resource="ministry_members"
        addLabel="Volunteer"
        lookups={mmLookups}
        defaults={{ role: "volunteer" }}
        filter={(r) => r.role === "volunteer"}
        columns={[
          { key: "ministry_name", label: "Ministry" },
          { key: "member_name", label: "Volunteer" },
        ]}
        fields={mmFields}
      />
    </>
  );
}

export function LeaderActivities() {
  return (
    <>
      <h2>Ministry Activities</h2>
      <DataPage
        title="Activities"
        resource="activities"
        addLabel="Activity"
        lookups={mineLookup}
        defaults={{ status: "planned" }}
        columns={[
          { key: "ministry_name", label: "Ministry" },
          { key: "title", label: "Activity" },
          { key: "due_date", label: "Due" },
          {
            label: "Status",
            render: (r) => <span className={`badge ${r.status === "done" ? "ok" : r.status === "ongoing" ? "warn" : ""}`}>{r.status}</span>,
          },
        ]}
        fields={[
          { key: "ministry_id", label: "Ministry", type: "select", lookup: "ministries", required: true },
          { key: "title", label: "Activity", required: true },
          { key: "description", label: "Description", type: "textarea" },
          { key: "due_date", label: "Due date", type: "date" },
          { key: "status", label: "Status", type: "select", required: true, options: [{ value: "planned", label: "Planned" }, { value: "ongoing", label: "Ongoing" }, { value: "done", label: "Done" }] },
        ]}
      />
    </>
  );
}

export function LeaderEvents() {
  return (
    <>
      <h2>Ministry Events</h2>
      <DataPage
        title="Ministry Events"
        resource="events"
        addLabel="Event"
        lookups={mineLookup}
        filter={(r, l) => (l.ministries || []).some((m) => String(m.id) === String(r.ministry_id))}
        defaults={{ event_type: "internal", radius_m: 100 }}
        columns={eventColumns}
        fields={eventFields.map((f) => (f.key === "ministry_id" ? { ...f, label: "Ministry", required: true } : f))}
      />
    </>
  );
}

export function LeaderAttendance() {
  return (
    <>
      <h2>Ministry Attendance</h2>
      <DataPage
        title="Attendance"
        resource="attendance"
        canCreate={false}
        canEdit={false}
        canDelete={false}
        columns={[
          { key: "service_date", label: "Date" },
          { key: "member_name", label: "Member" },
          { label: "Event", render: (r) => r.event_title || "Sunday Service" },
          { label: "Method", render: (r) => <span className="badge">{r.method}</span> },
        ]}
        fields={[]}
      />
    </>
  );
}

export function LeaderNotifications() {
  const [k, setK] = useState(0);
  return (
    <>
      <h2>Notifications & Conflict Alerts</h2>
      <NotificationsView refreshKey={k} />
      <button className="btn secondary sm" onClick={() => setK(k + 1)}>Refresh</button>
    </>
  );
}