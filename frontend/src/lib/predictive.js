// Simple weighted-attendance prediction (walang ML library)
const day = (d) => String(d || "").slice(0, 10);

export function buildPrediction(attendance, members, window = 8) {
  const rows = attendance.some((a) => !a.event_id)
    ? attendance.filter((a) => !a.event_id) // Sunday Service lang
    : attendance;

  const dates = [...new Set(rows.map((a) => day(a.service_date)).filter(Boolean))]
    .sort()
    .slice(-window); // oldest -> newest

  const presentBy = {};
  rows.forEach((a) => {
    const d = day(a.service_date);
    if (!dates.includes(d)) return;
    (presentBy[a.member_id] ||= new Set()).add(d);
  });

  const trend = dates.map((d) => ({
    label: d,
    value: rows.filter((a) => day(a.service_date) === d).length,
  }));

  const active = members.filter((m) => m.status === "active");

  const list = active.map((m) => {
    const set = presentBy[m.id] || new Set();
    let num = 0;
    let den = 0;
    dates.forEach((d, i) => {
      const w = i + 1; // mas bago = mas mabigat
      den += w;
      if (set.has(d)) num += w;
    });
    const prob = den ? num / den : 0; // chance na dadalo
    let streak = 0;
    for (let i = dates.length - 1; i >= 0 && !set.has(dates[i]); i--) streak++;
    const attended = dates.filter((d) => set.has(d)).length;

    let risk = "low";
    if (dates.length >= 3 && (prob < 0.4 || streak >= 3)) risk = "high";
    else if (dates.length >= 3 && (prob < 0.7 || streak >= 2)) risk = "medium";

    return { ...m, prob, streak, attended, total: dates.length, risk };
  });

  const order = { high: 0, medium: 1, low: 2 };
  list.sort((a, b) => order[a.risk] - order[b.risk] || a.prob - b.prob);

  return {
    weeks: dates.length,
    trend,
    members: list,
    predicted: Math.round(list.reduce((s, m) => s + m.prob, 0)),
    counts: {
      high: list.filter((m) => m.risk === "high").length,
      medium: list.filter((m) => m.risk === "medium").length,
      low: list.filter((m) => m.risk === "low").length,
    },
  };
}