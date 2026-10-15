import DataPage from "../../components/DataPage";

export function AdminMinistries() {
  return (
    <>
      <h2>Ministries & Small Groups</h2>
      <DataPage
        title="Ministries & Groups"
        resource="ministries"
        addLabel="Ministry"
        lookups={{
          leaders: {
            resource: "users",
            label: (u) => u.full_name,
            filter: (u) => u.role === "ministry_leader",
          },
        }}
        columns={[
          { key: "name", label: "Name" },
          {
            label: "Type",
            render: (r) => (
              <span className="badge">{r.type === "small_group" ? "Small group" : "Ministry"}</span>
            ),
          },
          { key: "description", label: "Description" },
          { label: "Leader", render: (r) => r.leader_name || "—" },
        ]}
        fields={[
          { key: "name", label: "Name", required: true },
          {
            key: "type",
            label: "Type",
            type: "select",
            required: true,
            options: [
              { value: "ministry", label: "Ministry" },
              { value: "small_group", label: "Small group (cell group)" },
            ],
          },
          { key: "description", label: "Description", type: "textarea" },
          { key: "leader_user_id", label: "Leader (Ministry Leader account)", type: "select", lookup: "leaders" },
        ]}
        defaults={{ type: "ministry" }}
      />
    </>
  );
}

export function AdminPrayers() {
  return (
    <>
      <h2>Prayer Requests</h2>
      <DataPage
        title="Prayer Requests"
        resource="prayer_requests"
        canCreate={false}
        canDelete={false}
        columns={[
          { key: "created_at", label: "Date" },
          { key: "member_name", label: "Member" },
          { key: "request", label: "Request" },
          {
            label: "Priority",
            render: (r) => (
              <span className={`badge ${r.priority === "urgent" ? "bad" : ""}`}>{r.priority}</span>
            ),
          },
          {
            label: "Status",
            render: (r) => (
              <span className={`badge ${r.status === "prayed" ? "ok" : ""}`}>{r.status}</span>
            ),
          },
        ]}
        fields={[
          {
            key: "priority",
            label: "Priority",
            type: "select",
            options: [
              { value: "general", label: "General" },
              { value: "urgent", label: "Urgent" },
            ],
          },
          {
            key: "status",
            label: "Follow-up status",
            type: "select",
            options: [
              { value: "open", label: "Open" },
              { value: "prayed", label: "Prayed / followed up" },
            ],
          },
        ]}
      />
    </>
  );
}