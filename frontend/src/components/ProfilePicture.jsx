import { useRef, useState } from "react";
import api from "../api";

const resize = (file, size = 256) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(img.width, img.height);
      const sx = (img.width - s) / 2;
      const sy = (img.height - s) / 2;
      const c = document.createElement("canvas");
      c.width = size;
      c.height = size;
      c.getContext("2d").drawImage(img, sx, sy, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("Invalid image file"));
    img.src = url;
  });

const initialsOf = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

// Optional new prop: `name` (shows initials when there is no photo)
export default function ProfilePicture({ currentPic, onUploaded, name = "" }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const src = preview || currentPic || null;
  const initials = initialsOf(name);

  const handleChange = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("JPG, PNG, o WEBP lang.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Max 5MB lang.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const dataUrl = await resize(file);
      setPreview(dataUrl);
      const { data } = await api.post("/portal/me/picture", { picture: dataUrl });
      onUploaded?.(data.profile_pic || dataUrl);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Upload failed");
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const pick = () => !loading && inputRef.current?.click();

  return (
    <div className="pfp">
      <button type="button" className="pfp-ring" onClick={pick} aria-label="Change profile photo" disabled={loading}>
        <span className="pfp-avatar">
          {src ? (
            <img src={src} alt="Profile" />
          ) : (
            <span className="pfp-placeholder">{initials || "👤"}</span>
          )}
          <span className={`pfp-overlay ${loading ? "show" : ""}`}>
            {loading ? <span className="pfp-spinner" /> : <>📷<small>Change</small></>}
          </span>
        </span>
        <span className="pfp-badge" aria-hidden="true">📷</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleChange}
        hidden
      />

      <button type="button" className="btn sm secondary" onClick={pick} disabled={loading}>
        {loading ? "Uploading..." : src ? "Change Photo" : "Upload Photo"}
      </button>
      <span className="pfp-hint">JPG, PNG o WEBP · max 5MB</span>

      {error && <span className="pfp-error" role="alert">{error}</span>}
    </div>
  );
}