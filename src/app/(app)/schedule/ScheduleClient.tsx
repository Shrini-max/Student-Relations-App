"use client";

import { useState, useTransition, useRef } from "react";
import { createEvent, updateEvent, deleteEvent } from "@/actions/schedule";
import { Plus, Pencil, Trash2, Calendar, MapPin, Clock, Filter, Download } from "lucide-react";
import Papa from "papaparse";

interface FestEvent {
  id: string;
  title: string;
  description: string | null;
  day: number;
  startTime: string;
  endTime: string;
  venueId: string;
  venueName: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
}

interface Venue { id: string; name: string; capacity: number | null }
interface Category { id: string; name: string; color: string }
interface FestDay { day: number; label: string; date: string }

interface Props {
  events: FestEvent[];
  venues: Venue[];
  categories: Category[];
  festDays: FestDay[];
  canEdit: boolean;
  isAdmin: boolean;
}

const EMPTY_FORM = {
  id: "", title: "", description: "", day: "1",
  startTime: "09:00", endTime: "10:00", venueId: "", categoryId: "",
};

export function ScheduleClient({ events, venues, categories, festDays, canEdit, isAdmin }: Props) {
  const [activeDay, setActiveDay] = useState(1);
  const [filterVenue, setFilterVenue] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, day: String(activeDay), venueId: venues[0]?.id ?? "", categoryId: categories[0]?.id ?? "" });
    setError("");
    setShowModal(true);
  };

  const openEdit = (e: FestEvent) => {
    setForm({ id: e.id, title: e.title, description: e.description ?? "", day: String(e.day), startTime: e.startTime, endTime: e.endTime, venueId: e.venueId, categoryId: e.categoryId });
    setError("");
    setShowModal(true);
  };

  const handleSubmit = () => {
    setError("");
    const fd = new FormData(formRef.current!);
    if (form.id) fd.set("id", form.id);
    startTransition(async () => {
      const res = form.id ? await updateEvent(fd) : await createEvent(fd);
      if (res?.error) { setError(res.error); return; }
      setShowModal(false);
    });
  };

  const handleDelete = (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    const fd = new FormData();
    fd.set("id", id);
    startTransition(() => deleteEvent(fd));
  };

  const dayEvents = events
    .filter((e) => e.day === activeDay)
    .filter((e) => !filterVenue || e.venueId === filterVenue)
    .filter((e) => !filterCategory || e.categoryId === filterCategory);

  const exportCSV = () => {
    const rows = events.map((e) => ({
      Day: e.day,
      Title: e.title,
      Start: e.startTime,
      End: e.endTime,
      Venue: e.venueName,
      Category: e.categoryName,
      Description: e.description ?? "",
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "paradox-schedule.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Event Schedule</h1>
          <p className="muted">Paradox '26 · June 9–14</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="btn-secondary gap-1.5">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          {canEdit && (
            <button onClick={openCreate} className="btn-primary">
              <Plus className="w-4 h-4" /> Add Event
            </button>
          )}
        </div>
      </div>

      {/* Day tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {festDays.map((d) => {
          const count = events.filter((e) => e.day === d.day).length;
          return (
            <button
              key={d.day}
              onClick={() => setActiveDay(d.day)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeDay === d.day ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <span>{d.label}</span>
              <span className="ml-1.5 text-xs text-gray-400">{d.date}</span>
              {count > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="w-4 h-4 text-gray-400" />
        <select className="input !w-auto text-sm" value={filterVenue} onChange={(e) => setFilterVenue(e.target.value)}>
          <option value="">All Venues</option>
          {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <select className="input !w-auto text-sm" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {(filterVenue || filterCategory) && (
          <button className="text-xs text-gray-500 hover:text-gray-900 underline" onClick={() => { setFilterVenue(""); setFilterCategory(""); }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Event list */}
      {dayEvents.length === 0 ? (
        <div className="card p-12 text-center">
          <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="muted">No events {filterVenue || filterCategory ? "match the filters" : "scheduled for this day"}.</p>
          {canEdit && !filterVenue && !filterCategory && (
            <button onClick={openCreate} className="btn-primary mt-4 mx-auto">
              <Plus className="w-4 h-4" /> Add first event
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {dayEvents.map((e) => (
            <div key={e.id} className="card px-4 py-3 flex items-start gap-4">
              <div className="flex-shrink-0 text-center w-20">
                <div className="text-sm font-semibold text-gray-900">{e.startTime}</div>
                <div className="text-xs text-gray-400">to {e.endTime}</div>
              </div>
              <div
                className="w-1 self-stretch rounded-full flex-shrink-0"
                style={{ backgroundColor: e.categoryColor }}
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900">{e.title}</div>
                {e.description && <div className="text-sm text-gray-500 mt-0.5 truncate">{e.description}</div>}
                <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{e.venueName}</span>
                  <span
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-white text-[10px] font-medium"
                    style={{ backgroundColor: e.categoryColor }}
                  >
                    {e.categoryName}
                  </span>
                </div>
              </div>
              {canEdit && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(e)} className="btn-ghost !p-1.5" title="Edit">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(e.id, e.title)} className="btn-ghost !p-1.5 text-red-500 hover:bg-red-50" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Admin links */}
      {isAdmin && (
        <div className="flex gap-3 pt-2 text-sm">
          <a href="/schedule/venues" className="text-brand-600 hover:underline">Manage Venues</a>
          <a href="/schedule/categories" className="text-brand-600 hover:underline">Manage Categories</a>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">{form.id ? "Edit Event" : "New Event"}</h2>
            {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
            <form ref={formRef} className="space-y-3">
              <div>
                <label className="label">Title *</label>
                <input name="title" className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea name="description" className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Day *</label>
                  <select name="day" className="input" value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })}>
                    {festDays.map((d) => <option key={d.day} value={d.day}>{d.label} ({d.date})</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Start *</label>
                  <input name="startTime" type="time" className="input" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />
                </div>
                <div>
                  <label className="label">End *</label>
                  <input name="endTime" type="time" className="input" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="label">Venue *</label>
                <select name="venueId" className="input" value={form.venueId} onChange={(e) => setForm({ ...form, venueId: e.target.value })}>
                  <option value="">Select venue...</option>
                  {venues.map((v) => <option key={v.id} value={v.id}>{v.name}{v.capacity ? ` (cap. ${v.capacity})` : ""}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Category *</label>
                <select name="categoryId" className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                  <option value="">Select category...</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </form>
            <div className="flex justify-end gap-2 pt-1">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSubmit} disabled={isPending}>
                {isPending ? "Saving..." : form.id ? "Save Changes" : "Create Event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
