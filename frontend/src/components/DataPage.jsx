// frontend/src/components/DataPage.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import api from "../api";
import { useLang } from "../i18n/LanguageContext";
import "./portal.css";

const err = (e) => e.response?.data?.error || "Something went wrong";

/* "13:05:00" -> "13:05" (ginagamit ng ibang pages: import { hm }) */
export const hm = (v) => (v ? String(v).slice(0, 5) : "");

/* Gawing { value, label } ang options kahit string[] o object[] ang ibinigay */
const normOptions = (opts = []) =>
  opts.map((o) =>
    typeof o === "object" && o !== null
      ? { value: o.value, label: o.label ?? String(o.value) }
      : { value: o, label: String(o) }
  );

/* ---------------------------------------------------------------- Modal */
function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <div className="modal" style={{ zIndex: 1000 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-label={title}>
        <h3 style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span>{title}</span>
          <button type="button" className="btn sm secondary" onClick={onClose} aria-label="Close" style={{ padding: "4px 8px" }}>
            <X size={16} aria-hidden="true" />
          </button>
        </h3>
        {children}
      </div>
    </div>,
    document.body
  );
}

/* ---------------------------------------------------------------- Field */
function FieldInput({ f, value, onChange, t, options }) {
  const common = {
    id: `f-${f.key}`,
    required: f.required,
    disabled: f.disabled,
    placeholder: f.placeholder ? t(f.placeholder) : undefined,
  };

  switch (f.type) {
    case "textarea":
      return <textarea {...common} rows={f.rows || 4} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;

    case "select": {
      const opts = normOptions(options);
      return (
        <select {...common} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
          {!f.required && !opts.some((o) => o.value === "") && <option value="">{t("-- Select --")}</option>}
          {opts.map((o) => (
            <option key={String(o.value)} value={o.value}>
              {t(o.label)}
            </option>
          ))}
        </select>
      );
    }

    case "checkbox":
      return (
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 500 }}>
          <input
            id={common.id}
            type="checkbox"
            style={{ width: "auto" }}
            checked={Boolean(Number(value)) || value === true}
            onChange={(e) => onChange(e.target.checked ? 1 : 0)}
          />
          {t(f.checkboxLabel || f.label)}
        </label>
      );

    case "number":
      return <input {...common} type="number" step={f.step} min={f.min} max={f.max} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;

    case "date":
    case "time":
    case "email":
    case "tel":
    case "password":
      return <input {...common} type={f.type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;

    default:
      return <input {...common} type="text" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
  }
}

/* ------------------------------------------------------------- DataPage */
/**
 * Props
 *  title, resource, columns, fields, editFields, addLabel
 *  canAdd | canCreate   (default true)
 *  canEdit, canDelete   (default true)
 *  filter(row)          opsyonal
 *  sort(a,b) | sortRows(a,b)   opsyonal
 *  rowActions(row, helpers)    helpers = { reload, patch(changes) }
 *                              (puwede ring tawagin ang helpers bilang function = reload,
 *                               kaya gumagana pa rin ang lumang rowActions(row, reload))
 *  lookups   { name: { resource, label(row), filter?(row), value?(row) } }
 *            gamitin sa field: { type: "select", lookup: "name" }
 *  defaults  { key: defaultValue } para sa Add modal
 *  reloadKey | refreshKey   palitan para mag-refetch
 *  emptyText, onLoaded, hideTitle, searchable, rowClassName, className
 */
export default function DataPage({
  title,
  resource,
  columns = [],
  fields = [],
  editFields,
  addLabel,
  canAdd = true,
  canCreate,
  canEdit = true,
  canDelete = true,
  filter,
  sort,
  sortRows,
  rowActions,
  emptyText,
  reloadKey,
  refreshKey,
  onLoaded,
  lookups,
  defaults,
  hideTitle = false,
  searchable = false,
  rowClassName,
  className = "",
}) {
  const { t } = useLang();
  const [rows, setRows] = useState(null); // null = naglo-load
  const [loadErr, setLoadErr] = useState("");
  const [msg, setMsg] = useState(null);
  const [modal, setModal] = useState(null); // { mode: "add" | "edit", row? }
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [q, setQ] = useState("");
  const [lookupOpts, setLookupOpts] = useState({}); // { name: [{value,label}] }
  const [lookupRaw, setLookupRaw] = useState({}); // { name: rows[] } (para sa filter(row, lookups))

  const allowAdd = canCreate !== undefined ? canCreate : canAdd;
  const sorter = sort || sortRows;

  // Ref para hindi mag-refetch kapag nagbago ang identity ng onLoaded
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/resource", { params: { name: resource } });
      const list = Array.isArray(data) ? data : [];
      setRows(list);
      setLoadErr("");
      onLoadedRef.current?.(list);
    } catch (e) {
      setLoadErr(err(e));
      setRows((r) => r ?? []);
    }
  }, [resource]);

  useEffect(() => {
    load();
  }, [load, reloadKey, refreshKey]);

  /* ---- Lookups (hal. leaders, users) ---- */
  const lookupsRef = useRef(lookups);
  lookupsRef.current = lookups;
  const lookupSig = lookups
    ? Object.entries(lookups)
        .map(([k, c]) => `${k}:${c.resource}`)
        .join("|")
    : "";

  useEffect(() => {
    const cfgs = lookupsRef.current;
    if (!cfgs) return;
    let cancelled = false;

    Object.entries(cfgs).forEach(async ([name, cfg]) => {
      try {
        const { data } = await api.get("/resource", {
          params: { name: cfg.resource, ...(cfg.params || {}) },
        });
        let list = Array.isArray(data) ? data : [];
        if (cfg.filter) list = list.filter(cfg.filter);
        const labelOf = (r) =>
          typeof cfg.label === "function"
            ? cfg.label(r)
            : String(r[cfg.label || "name"] ?? r.full_name ?? r.name ?? r.id);
        const valueOf = (r) => (typeof cfg.value === "function" ? cfg.value(r) : r[cfg.value || "id"]);
        const opts = list.map((r) => ({ value: valueOf(r), label: labelOf(r) }));
        if (!cancelled) {
          setLookupOpts((s) => ({ ...s, [name]: opts }));
          setLookupRaw((s) => ({ ...s, [name]: list }));
        }
      } catch (e) {
        console.error(`LOOKUP ${name} failed:`, e.response?.status, e.response?.data || e.message);
        if (!cancelled) {
          setLookupOpts((s) => ({ ...s, [name]: [] }));
          setLookupRaw((s) => ({ ...s, [name]: [] }));
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [lookupSig]);

  // auto-hide ng success message
  useEffect(() => {
    if (!msg?.ok) return;
    const id = setTimeout(() => setMsg(null), 3000);
    return () => clearTimeout(id);
  }, [msg]);

  const visible = useMemo(() => {
    let list = rows || [];
    if (filter) list = list.filter((r) => filter(r, lookupRaw));
    const s = q.trim().toLowerCase();
    if (s) list = list.filter((r) => Object.values(r).some((v) => v != null && String(v).toLowerCase().includes(s)));
    if (sorter) list = [...list].sort(sorter);
    return list;
  }, [rows, filter, sorter, q, lookupRaw]);

  const activeFields = modal?.mode === "edit" && editFields ? editFields : fields;
  const optionsFor = (f) => (f.lookup ? lookupOpts[f.lookup] || [] : f.options);

  const openAdd = () => {
    setValues(Object.fromEntries(fields.map((f) => [f.key, f.default ?? defaults?.[f.key] ?? ""])));
    setModal({ mode: "add" });
  };

  const openEdit = (row) => {
    const list = editFields || fields;
    setValues(Object.fromEntries(list.map((f) => [f.key, row[f.key] ?? f.default ?? ""])));
    setModal({ mode: "edit", row });
  };

  const close = useCallback(() => {
    if (!saving) setModal(null);
  }, [saving]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { name: resource, ...values };
      if (modal.mode === "edit") payload.id = modal.row.id;
      await api.post("/resource/save", payload);
      setModal(null);
      setMsg({ ok: true, text: "Saved." });
      await load();
    } catch (x) {
      setMsg({ ok: false, text: err(x) });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(t("Delete this record?"))) return;
    setDeletingId(row.id);
    try {
      await api.post("/resource/delete", { name: resource, id: row.id });
      setMsg({ ok: true, text: "Deleted." });
      await load();
    } catch (x) {
      setMsg({ ok: false, text: err(x) });
    } finally {
      setDeletingId(null);
    }
  };

  // Para sa rowActions: i-update ang ilang fields lang ng isang row (hal. { status: "archived" })
  const makeHelpers = (row) => {
    const patch = async (changes) => {
      try {
        await api.post("/resource/save", { name: resource, id: row.id, ...changes });
        setMsg({ ok: true, text: "Saved." });
        await load();
      } catch (x) {
        setMsg({ ok: false, text: err(x) });
      }
    };
    // function mismo = reload (compatible sa lumang rowActions(row, reload))
    const helpers = () => load();
    helpers.reload = load;
    helpers.patch = patch;
    return helpers;
  };

  const cell = (col, row) => (col.render ? col.render(row) : row[col.key] ?? "");
  const hasActions = canEdit || canDelete || rowActions;

  return (
    <div className={className}>
      <div className="toolbar" style={hideTitle ? { marginTop: 12, justifyContent: "flex-end" } : undefined}>
        {!hideTitle && <h3>{title}</h3>}
        {searchable && (
          <input
            className="pr-search"
            type="search"
            placeholder={t("Search...")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={hideTitle ? { marginRight: "auto" } : undefined}
          />
        )}
        {allowAdd && (
          <button type="button" className="btn" onClick={openAdd}>
            <Plus size={16} aria-hidden="true" /> {addLabel ? `${t("Add")} ${addLabel}` : t("Add")}
          </button>
        )}
      </div>

      {msg && <div className={`msg ${msg.ok ? "ok" : "err"}`}>{t(msg.text)}</div>}
      {loadErr && <div className="msg err">{t(loadErr)}</div>}

      {rows === null ? (
        <p>{t("Loading...")}</p>
      ) : visible.length === 0 ? (
        <div className="empty">{emptyText ? t(emptyText) : t("No records yet.")}</div>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                {columns.map((c, i) => (
                  <th key={c.key || i}>{c.label}</th>
                ))}
                {hasActions && <th aria-label={t("Actions")} />}
              </tr>
            </thead>
            <tbody>
              {visible.map((row, ri) => (
                <tr key={row.id ?? ri} className={rowClassName ? rowClassName(row) : undefined}>
                  {columns.map((c, i) => (
                    <td key={c.key || i}>{cell(c, row)}</td>
                  ))}
                  {hasActions && (
                    <td className="actions">
                      <div className="row-actions" style={{ marginTop: 0 }}>
                        {rowActions?.(row, makeHelpers(row))}
                        {canEdit && (
                          <button type="button" className="btn sm secondary" onClick={() => openEdit(row)}>
                            <Pencil size={14} aria-hidden="true" /> {t("Edit")}
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            className="btn sm danger"
                            disabled={deletingId === row.id}
                            onClick={() => remove(row)}
                          >
                            <Trash2 size={14} aria-hidden="true" /> {deletingId === row.id ? t("Please wait...") : t("Delete")}
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal
          title={modal.mode === "edit" ? t("Edit") : addLabel ? `${t("Add")} ${addLabel}` : t("Add")}
          onClose={close}
        >
          <form onSubmit={submit}>
            {activeFields.map((f) => (
              <div className="field" key={f.key}>
                {f.type !== "checkbox" && (
                  <label htmlFor={`f-${f.key}`}>
                    {f.label}
                    {f.required ? " *" : ""}
                  </label>
                )}
                <FieldInput
                  f={f}
                  t={t}
                  options={optionsFor(f)}
                  value={values[f.key]}
                  onChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))}
                />
              </div>
            ))}

            <div className="modal-actions">
              <button type="button" className="btn secondary" onClick={close} disabled={saving}>
                {t("Cancel")}
              </button>
              <button type="submit" className="btn" disabled={saving}>
                {saving ? t("Saving...") : t("Save")}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}