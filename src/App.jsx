import { useState, useEffect, useRef } from "react";

const FB_BASE = "https://push-up-record-default-rtdb.asia-southeast1.firebasedatabase.app/cooking-diary";

async function loadTitle() {
  try {
    const res = await fetch(`${FB_BASE}/title.json`);
    const data = await res.json();
    return data ? data : "🍽 わたしの料理帳";
  } catch {
    return "🍽 わたしの料理帳";
  }
}
async function saveTitle(title) {
  try {
    await fetch(`${FB_BASE}/title.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(title)
    });
  } catch {}
}

async function loadRecords() {
  try {
    const res = await fetch(`${FB_BASE}/records.json`);
    const data = await res.json();
    return data ? data : [];
  } catch {
    return [];
  }
}
async function saveRecords(records) {
  try {
    await fetch(`${FB_BASE}/records.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(records)
    });
  } catch {}
}

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const r = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${r}`;
}
function getWeekDays(ref) {
  const d = new Date(ref + "T00:00:00");
  const dow = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(mon);
    x.setDate(mon.getDate() + i);
    return toDateStr(x);
  });
}
function fmtDate(s) {
  if (!s) return "";
  const d = new Date(s + "T00:00:00");
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
}
const WLABELS = ["月","火","水","木","金","土","日"];
const C = {
  bg: "#F5F0E8",
  card: "#FDFAF5",
  accent: "#A07850",
  accentDeep: "#7A5C38",
  accentLight: "#EDE4D4",
  text: "#3A2E22",
  muted: "#8C7A62",
  border: "#DDD0BC",
  tabBg: "#EDE4D4",
  star: "#C8903A",
  starOff: "#D9CCBA",
  green: "#6B8C5A",
};

function StarRow({ value, onChange, size = 28 }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          onClick={() => onChange && onChange(n)}
          style={{
            fontSize: size, cursor: onChange ? "pointer" : "default",
            color: n <= value ? C.star : C.starOff,
            transition: "transform 0.1s",
            display: "inline-block",
            transform: onChange && n <= value ? "scale(1.15)" : "scale(1)",
          }}
        >★</span>
      ))}
    </div>
  );
}

function PhotoBox({ src, onClick, label }) {
  return (
    <div
      onClick={onClick}
      style={{
        width: "100%", height: 190, borderRadius: 18,
        background: src ? "transparent" : C.accentLight,
        border: `2px dashed ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", overflow: "hidden",
        position: "relative",
      }}
    >
      {src ? (
        <img src={src} alt="料理" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <div style={{ color: C.muted, textAlign: "center" }}>
          <div style={{ fontSize: 40 }}>📷</div>
          <div style={{ fontSize: 13, marginTop: 8 }}>{label || "タップして写真を追加"}</div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("calendar");
  const [records, setRecords] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [title, setTitle] = useState("🍽 わたしの料理帳");
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const [weekRef, setWeekRef] = useState(toDateStr(new Date()));
  const [search, setSearch] = useState("");
  const [detailId, setDetailId] = useState(null);
  const [toast, setToast] = useState("");

  const [isEditingDetail, setIsEditingDetail] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const editFileRef = useRef();

  const emptyForm = { date: toDateStr(new Date()), photo: null, name: "", rating: 3, comment: "" };
  const [form, setForm] = useState(emptyForm);
  const fileRef = useRef();

  useEffect(() => {
    Promise.all([loadRecords(), loadTitle()]).then(([r, t]) => {
      setRecords(r);
      setTitle(t);
      setLoaded(true);
    });
  }, []);

  const persist = async (next) => { setRecords(next); await saveRecords(next); };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  const handleTitleSubmit = async () => {
    setIsEditingTitle(false);
    await saveTitle(title);
    showToast("表題を保存しました ✨");
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    const entry = { id: Date.now().toString(), ...form };
    await persist([...records, entry]);
    setForm(emptyForm);
    showToast("記録しました 🌸");
    setTab("zukan");
    setDetailId(entry.id);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setForm(f => ({ ...f, photo: ev.target.result }));
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleEditPhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setEditForm(f => ({ ...f, photo: ev.target.result }));
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleEditSubmit = async () => {
    if (!editForm.name.trim()) return;
    const updated = records.map(r => r.id === editForm.id ? editForm : r);
    await persist(updated);
    setIsEditingDetail(false);
    showToast("修正しました ✏️");
  };

  const handleMadeThis = (dish) => {
    setForm({ date: toDateStr(new Date()), photo: dish.photo, name: dish.name, rating: dish.rating, comment: "" });
    setDetailId(null);
    setTab("record");
  };

  const handleRemoveRecord = async (id) => {
    if (!window.confirm("この料理記録を削除しますか？")) return;
    const next = records.filter(r => r.id !== id);
    await persist(next);
    showToast("削除しました 🗑");
  };

  const weekDays = getWeekDays(weekRef);
  const today = toDateStr(new Date());

  const filtered = records
    .slice()
    .reverse()
    .filter(r =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.comment || "").toLowerCase().includes(search.toLowerCase())
    );

  const detail = records.find(r => r.id === detailId);

  const inputStyle = {
    width: "100%", padding: "11px 14px", borderRadius: 14,
    border: `1.5px solid ${C.border}`, fontSize: 15, color: C.text,
    boxSizing: "border-box", background: C.bg, outline: "none",
    fontFamily: "inherit",
  };

  const labelStyle = { display: "block", fontSize: 12, color: C.muted, marginBottom: 5, fontWeight: 500, letterSpacing: "0.04em" };

  if (!loaded) return (
    <div style={{ fontFamily: "'Zen Maru Gothic',sans-serif", textAlign: "center", padding: 60, color: C.muted }}>
      読み込み中…
    </div>
  );

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@400;500;700&display=swap" rel="stylesheet" />
      <div style={{ fontFamily: "'Zen Maru Gothic',sans-serif", background: C.bg, minHeight: "100dvh", maxWidth: 460, margin: "0 auto", paddingBottom: 24 }}>

        {/* Toast */}
        {toast && (
          <div style={{
            position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
            background: "#FFF", border: `1.5px solid ${C.accent}`, borderRadius: 24,
            padding: "10px 24px", fontSize: 14, color: C.text, zIndex: 100,
            boxShadow: "0 2px 12px rgba(160,120,80,0.18)",
          }}>{toast}</div>
        )}

        {/* Header */}
        <div style={{
          background: C.card, padding: "18px 20px 10px",
          borderBottom: `1.5px solid ${C.border}`,
          position: "sticky", top: 0, zIndex: 10,
        }}>
          {isEditingTitle ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => e.key === "Enter" && handleTitleSubmit()}
              style={{
                width: "100%", margin: 0, fontSize: 20, color: C.text, textAlign: "center", fontWeight: 700, letterSpacing: "0.06em",
                border: `1.5px solid ${C.accent}`, borderRadius: 8, padding: "2px 8px", background: "#fff", outline: "none", boxSizing: "border-box", fontFamily: "inherit"
              }}
              autoFocus
            />
          ) : (
            <h1 
              onClick={() => setIsEditingTitle(true)}
              title="タップして表題を編集"
              style={{ margin: 0, fontSize: 20, color: C.text, textAlign: "center", fontWeight: 700, letterSpacing: "0.06em", cursor: "pointer" }}
            >
              {title}
            </h1>
          )}
          <div style={{ display: "flex", background: C.tabBg, borderRadius: 28, padding: 4, marginTop: 12, gap: 3 }}>
            {[
              { id: "calendar", icon: "📅", label: "カレンダー" },
              { id: "zukan",    icon: "📖", label: "図鑑" },
              { id: "record",   icon: "✏️", label: "記録" },
            ].map(t => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => { setTab(t.id); if (t.id !== "zukan") { setDetailId(null); setIsEditingDetail(false); } }}
                  style={{
                    flex: 1, padding: "9px 0", border: "none", borderRadius: 24,
                    background: active ? C.accent : "transparent",
                    color: active ? "#fff" : C.muted,
                    fontWeight: active ? 700 : 500,
                    fontSize: 13, cursor: "pointer", transition: "all 0.2s",
                    fontFamily: "inherit",
                  }}
                >
                  {t.icon} {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ padding: "16px 16px 0" }}>

          {/* =================== CALENDAR =================== */}
          {tab === "calendar" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <button
                  onClick={() => { const d = new Date(weekRef + "T00:00:00"); d.setDate(d.getDate() - 7); setWeekRef(toDateStr(d)); }}
                  style={{ background: C.accentLight, border: "none", borderRadius: 20, padding: "7px 14px", cursor: "pointer", color: C.accentDeep, fontSize: 14, fontFamily: "inherit" }}
                >‹ 前</button>
                <span style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>
                  {new Date(weekDays[0] + "T00:00:00").toLocaleDateString("ja-JP", { month: "long", day: "numeric" })}
                  {" 〜 "}
                  {new Date(weekDays[6] + "T00:00:00").toLocaleDateString("ja-JP", { month: "long", day: "numeric" })}
                </span>
                <button
                  onClick={() => { const d = new Date(weekRef + "T00:00:00"); d.setDate(d.getDate() + 7); setWeekRef(toDateStr(d)); }}
                  style={{ background: C.accentLight, border: "none", borderRadius: 20, padding: "7px 14px", cursor: "pointer", color: C.accentDeep, fontSize: 14, fontFamily: "inherit" }}
                >次 ›</button>
              </div>

              {weekDays.map((date, i) => {
                const dayRecs = records.filter(r => r.date === date);
                const isToday = date === today;
                return (
                  <div key={date} style={{ marginBottom: 14, display: "flex", gap: 10 }}>
                    {/* Day circle */}
                    <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 2 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: "50%",
                        background: isToday ? C.accent : C.tabBg,
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      }}>
                        <span style={{ fontSize: 9, color: isToday ? "#fff" : C.muted, lineHeight: 1 }}>{WLABELS[i]}</span>
                        <span style={{ fontSize: 15, fontWeight: 700, color: isToday ? "#fff" : C.text, lineHeight: 1.3 }}>
                          {new Date(date + "T00:00:00").getDate()}
                        </span>
                      </div>
                      {i < 6 && <div style={{ width: 1.5, flex: 1, background: C.border, marginTop: 4 }} />}
                    </div>

                    {/* Records or empty */}
                    <div style={{ flex: 1, minWidth: 0, paddingBottom: 4 }}>
                      {dayRecs.length === 0 ? (
                        <div style={{ height: 40, display: "flex", alignItems: "center" }}>
                          <span style={{ fontSize: 13, color: C.border }}>記録なし</span>
                        </div>
                      ) : (
                        dayRecs.map(r => (
                          <div
                            key={r.id}
                            onClick={() => { setDetailId(r.id); setTab("zukan"); }}
                            style={{
                              background: C.card, borderRadius: 16,
                              border: `1.5px solid ${C.border}`,
                              padding: 10, display: "flex", alignItems: "center", gap: 10,
                              cursor: "pointer", marginBottom: 8,
                            }}
                          >
                            {r.photo ? (
                              <img src={r.photo} alt={r.name} style={{ width: 50, height: 50, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: 50, height: 50, borderRadius: 12, background: C.accentLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🍽</div>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 15, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                              <div style={{ display: "flex", gap: 1, marginTop: 3 }}>
                                {[1,2,3,4,5].map(n => (
                                  <span key={n} style={{ fontSize: 13, color: n <= r.rating ? C.star : C.starOff }}>★</span>
                                ))}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveRecord(r.id);
                              }}
                              style={{
                                background: "none", border: "none", color: C.muted,
                                fontSize: 16, cursor: "pointer", padding: "6px 8px",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                transition: "color 0.2s",
                              }}
                              title="記録を削除"
                            >
                              🗑
                            </button>
                            <span style={{ fontSize: 18, color: C.border, marginLeft: 2 }}>›</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* =================== ZUKAN =================== */}
          {tab === "zukan" && (
            <div>
              {detail ? (
                isEditingDetail ? (
                  /* Edit Form */
                  <div>
                    <button
                      onClick={() => setIsEditingDetail(false)}
                      style={{ background: "none", border: "none", color: C.accentDeep, fontSize: 15, cursor: "pointer", padding: "0 0 14px", fontFamily: "inherit" }}
                    >‹ キャンセル</button>
                    <div style={{ background: C.card, borderRadius: 22, border: `1.5px solid ${C.border}`, padding: 20 }}>
                      <h2 style={{ margin: "0 0 18px", fontSize: 17, color: C.text, textAlign: "center", fontWeight: 700 }}>✏️ 記録を修正する</h2>

                      {/* Photo */}
                      <div style={{ marginBottom: 18 }}>
                        <PhotoBox src={editForm.photo} onClick={() => editFileRef.current.click()} />
                        <input ref={editFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleEditPhotoUpload} />
                        {editForm.photo && (
                          <div style={{ textAlign: "center", marginTop: 6 }}>
                            <button onClick={() => setEditForm(f => ({ ...f, photo: null }))} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
                              写真を削除
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Name */}
                      <div style={{ marginBottom: 16 }}>
                        <label style={labelStyle}>料理名 *</label>
                        <input
                          type="text" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                          placeholder="例：鶏のから揚げ"
                          style={inputStyle}
                        />
                      </div>

                      {/* Date */}
                      <div style={{ marginBottom: 16 }}>
                        <label style={labelStyle}>日付</label>
                        <input
                          type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
                          style={inputStyle}
                        />
                      </div>

                      {/* Rating */}
                      <div style={{ marginBottom: 18 }}>
                        <label style={labelStyle}>評価</label>
                        <StarRow value={editForm.rating} onChange={n => setEditForm(f => ({ ...f, rating: n }))} size={32} />
                      </div>

                      {/* Comment */}
                      <div style={{ marginBottom: 22 }}>
                        <label style={labelStyle}>コメント</label>
                        <textarea
                          value={editForm.comment || ""}
                          onChange={e => setEditForm(f => ({ ...f, comment: e.target.value }))}
                          placeholder="味の感想や次回へのメモなど…"
                          rows={3}
                          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7 }}
                        />
                      </div>

                      <div style={{ display: "flex", gap: 10 }}>
                        <button
                          onClick={() => setIsEditingDetail(false)}
                          style={{
                            flex: 1, padding: "14px", borderRadius: 22,
                            background: C.bg, border: `1.5px solid ${C.border}`, color: C.text,
                            fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit"
                          }}
                        >
                          キャンセル
                        </button>
                        <button
                          onClick={handleEditSubmit}
                          disabled={!editForm.name.trim()}
                          style={{
                            flex: 2, padding: "14px", borderRadius: 22, border: "none",
                            background: editForm.name.trim() ? C.accent : C.border,
                            color: editForm.name.trim() ? "#fff" : C.muted,
                            fontSize: 15, fontWeight: 700,
                            cursor: editForm.name.trim() ? "pointer" : "default",
                            fontFamily: "inherit", letterSpacing: "0.04em",
                            transition: "background 0.2s",
                          }}
                        >
                          保存する
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Detail */
                  <div>
                    <button
                      onClick={() => { setDetailId(null); setIsEditingDetail(false); }}
                      style={{ background: "none", border: "none", color: C.accentDeep, fontSize: 15, cursor: "pointer", padding: "0 0 14px", fontFamily: "inherit" }}
                    >‹ 図鑑に戻る</button>
                    <div style={{ background: C.card, borderRadius: 22, border: `1.5px solid ${C.border}`, overflow: "hidden" }}>
                      <div style={{ padding: "18px 18px 0" }}>
                        <h2 style={{ margin: "0 0 10px", fontSize: 22, color: C.text, fontWeight: 700 }}>{detail.name}</h2>
                        <StarRow value={detail.rating} size={26} />
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 8, marginBottom: 14 }}>{fmtDate(detail.date)}</div>
                      </div>
                      {detail.photo ? (
                        <img src={detail.photo} alt={detail.name} style={{ width: "100%", height: 230, objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: 160, background: C.accentLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52 }}>🍽</div>
                      )}
                      <div style={{ padding: 18 }}>
                        {detail.comment ? (
                          <p style={{ fontSize: 15, color: C.text, lineHeight: 1.75, margin: "0 0 20px" }}>{detail.comment}</p>
                        ) : (
                          <p style={{ fontSize: 14, color: C.muted, margin: "0 0 20px" }}>コメントなし</p>
                        )}
                        <button
                          onClick={() => handleMadeThis(detail)}
                          style={{
                            width: "100%", padding: "15px", borderRadius: 22,
                            background: C.accent, border: "none", color: "#fff",
                            fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                            letterSpacing: "0.04em", marginBottom: 10
                          }}
                        >🍳 これを作った！</button>
                        <button
                          onClick={() => { setEditForm({ ...detail }); setIsEditingDetail(true); }}
                          style={{
                            width: "100%", padding: "12px", borderRadius: 22,
                            background: "none", border: `1.5px solid ${C.accent}`, color: C.accentDeep,
                            fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                            letterSpacing: "0.04em",
                          }}
                        >✏️ 記録を修正する</button>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                /* List */
                <div>
                  <div style={{ position: "relative", marginBottom: 14 }}>
                    <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>🔍</span>
                    <input
                      type="search"
                      placeholder="料理を検索…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      style={{ ...inputStyle, paddingLeft: 40, borderRadius: 22 }}
                    />
                  </div>

                  {filtered.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "48px 20px", color: C.muted }}>
                      {records.length === 0
                        ? <><div style={{ fontSize: 48, marginBottom: 12 }}>🌱</div><div style={{ fontSize: 14, lineHeight: 1.8 }}>まだ記録がありません。<br />「記録」タブから追加しましょう！</div></>
                        : <><div style={{ fontSize: 40 }}>🔍</div><div style={{ fontSize: 14, marginTop: 8 }}>見つかりませんでした</div></>
                      }
                    </div>
                  ) : (
                    filtered.map(r => (
                      <div
                        key={r.id}
                        onClick={() => { setDetailId(r.id); setIsEditingDetail(false); }}
                        style={{
                          background: C.card, borderRadius: 18,
                          border: `1.5px solid ${C.border}`, marginBottom: 12,
                          cursor: "pointer", overflow: "hidden",
                          display: "flex", alignItems: "center", gap: 12, padding: 12,
                        }}
                      >
                        {r.photo ? (
                          <img src={r.photo} alt={r.name} style={{ width: 68, height: 68, borderRadius: 14, objectFit: "cover", flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 68, height: 68, borderRadius: 14, background: C.accentLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>🍽</div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                          <div style={{ display: "flex", gap: 1, margin: "4px 0" }}>
                            {[1,2,3,4,5].map(n => <span key={n} style={{ fontSize: 15, color: n <= r.rating ? C.star : C.starOff }}>★</span>)}
                          </div>
                          {r.comment && (
                            <div style={{ fontSize: 12, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.comment}</div>
                          )}
                        </div>
                        <span style={{ fontSize: 18, color: C.border, flexShrink: 0 }}>›</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* =================== RECORD =================== */}
          {tab === "record" && (
            <div>
              <div style={{ background: C.card, borderRadius: 22, border: `1.5px solid ${C.border}`, padding: 20 }}>
                <h2 style={{ margin: "0 0 18px", fontSize: 17, color: C.text, textAlign: "center", fontWeight: 700 }}>🌸 料理を記録する</h2>

                {/* Photo */}
                <div style={{ marginBottom: 18 }}>
                  <PhotoBox src={form.photo} onClick={() => fileRef.current.click()} />
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoUpload} />
                  {form.photo && (
                    <div style={{ textAlign: "center", marginTop: 6 }}>
                      <button onClick={() => setForm(f => ({ ...f, photo: null }))} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
                        写真を削除
                      </button>
                    </div>
                  )}
                </div>

                {/* Name */}
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>料理名 *</label>
                  <input
                    type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="例：鶏のから揚げ"
                    style={inputStyle}
                  />
                </div>

                {/* Date */}
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>日付</label>
                  <input
                    type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    style={inputStyle}
                  />
                </div>

                {/* Rating */}
                <div style={{ marginBottom: 18 }}>
                  <label style={labelStyle}>評価</label>
                  <StarRow value={form.rating} onChange={n => setForm(f => ({ ...f, rating: n }))} size={32} />
                </div>

                {/* Comment */}
                <div style={{ marginBottom: 22 }}>
                  <label style={labelStyle}>コメント</label>
                  <textarea
                    value={form.comment}
                    onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
                    placeholder="味の感想や次回へのメモなど…"
                    rows={3}
                    style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7 }}
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!form.name.trim()}
                  style={{
                    width: "100%", padding: "15px", borderRadius: 22, border: "none",
                    background: form.name.trim() ? C.accent : C.border,
                    color: form.name.trim() ? "#fff" : C.muted,
                    fontSize: 16, fontWeight: 700,
                    cursor: form.name.trim() ? "pointer" : "default",
                    fontFamily: "inherit", letterSpacing: "0.04em",
                    transition: "background 0.2s",
                  }}
                >
                  🌸 記録する
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
