"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";

type Attachment = { id: string; filename: string; contentType: string; size: number; url: string };
type Mailbox = { id: string; label: string; email: string; unread: number };
type MessageRow = {
  id: string;
  uid: number;
  mailboxId: string;
  mailboxLabel?: string;
  fromAddress: string;
  fromName: string | null;
  toAddress: string | null;
  subject: string;
  date: string;
  seen: boolean;
  flagged: boolean;
  snippet: string;
  threadKey: string;
  hasAttachments: boolean;
};
type MessageDetail = {
  id: string;
  mailboxId: string;
  mailboxLabel?: string;
  folder: string;
  fromAddress: string;
  fromName: string | null;
  toAddress: string | null;
  subject: string;
  textPlain: string | null;
  textHtml: string | null;
  date: string;
  flagged: boolean;
  messageId: string | null;
  attachments: Attachment[];
};

const STARRED = "__starred__";

const FOLDERS: { key: string; label: string; icon: string }[] = [
  { key: "INBOX", label: "Inbox", icon: "◰" },
  { key: STARRED, label: "Starred", icon: "★" },
  { key: "Sent", label: "Sent", icon: "➤" },
  { key: "Drafts", label: "Drafts", icon: "✎" },
  { key: "Archive", label: "Archive", icon: "□" },
  { key: "Spam", label: "Spam", icon: "⚠" },
  { key: "Trash", label: "Trash", icon: "✕" },
];

const AVATAR_COLORS = ["bg-emerald-500", "bg-sky-500", "bg-violet-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500"];

function colorFor(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initialsFor(name: string | null, email: string) {
  return (name || email || "?").trim().slice(0, 1).toUpperCase();
}

function formatRelative(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMin = Math.round((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24 && d.toDateString() === now.toDateString()) return `${diffHr}h`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  if (diffHr < 24 * 7) return d.toLocaleDateString(undefined, { weekday: "short" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatFull(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ALL = "all";
const RAIL_KEY = "mail-rail-collapsed";

export default function MailClient() {
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [mailboxId, setMailboxId] = useState<string>(ALL);
  const [folder, setFolder] = useState<string>("INBOX");
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thread, setThread] = useState<MessageDetail[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);

  const [railCollapsed, setRailCollapsed] = useState(false);
  const [railHydrated, setRailHydrated] = useState(false);

  // Mobile only: which single pane is on screen. Desktop (md+) ignores this and shows all panes.
  const [mobileView, setMobileView] = useState<"rail" | "list" | "detail">("list");

  const [composeOpen, setComposeOpen] = useState(false);
  const [composeFromMailboxId, setComposeFromMailboxId] = useState<string>("");
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeText, setComposeText] = useState("");
  const [composeInReplyTo, setComposeInReplyTo] = useState<string | null>(null);
  const [composeAttachments, setComposeAttachments] = useState<{ filename: string; url: string }[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    setRailCollapsed(localStorage.getItem(RAIL_KEY) === "true");
    setRailHydrated(true);
  }, []);

  function toggleRailCollapsed() {
    setRailCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(RAIL_KEY, String(next));
      return next;
    });
  }

  const refreshMailboxes = useCallback(() => {
    fetch("/api/mail/mailboxes")
      .then((r) => r.json())
      .then((d) => setMailboxes(d.mailboxes ?? []));
  }, []);

  useEffect(() => {
    refreshMailboxes();
  }, [refreshMailboxes]);

  const loadMessages = useCallback(() => {
    setLoadingList(true);
    setSelectedIds(new Set());
    const params = new URLSearchParams({ mailboxId });
    if (folder === STARRED) params.set("starred", "true");
    else params.set("folder", folder);
    fetch(`/api/mail/messages?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setMessages(d.messages ?? []);
        setHasMore(!!d.hasMore);
        setNextCursor(d.nextCursor ?? null);
      })
      .finally(() => setLoadingList(false));
  }, [mailboxId, folder]);

  useEffect(() => {
    setSelectedId(null);
    setThread([]);
    loadMessages();
  }, [loadMessages]);

  function loadMore() {
    if (!hasMore || loadingMore || !nextCursor) return;
    setLoadingMore(true);
    const params = new URLSearchParams({ mailboxId, cursor: nextCursor });
    if (folder === STARRED) params.set("starred", "true");
    else params.set("folder", folder);
    fetch(`/api/mail/messages?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setMessages((prev) => [...prev, ...(d.messages ?? [])]);
        setHasMore(!!d.hasMore);
        setNextCursor(d.nextCursor ?? null);
      })
      .finally(() => setLoadingMore(false));
  }

  function onListScroll() {
    const el = listRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 150) loadMore();
  }

  function openMessage(id: string) {
    const row = messages.find((m) => m.id === id);
    const wasUnread = !!row && !row.seen && folder !== STARRED && folder === "INBOX";
    setSelectedId(id);
    setMobileView("detail");
    setLoadingThread(true);
    fetch(`/api/mail/messages/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setThread(d.thread ?? []);
        setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, seen: true } : m)));
        if (wasUnread && row) {
          setMailboxes((prev) => prev.map((m) => (m.id === row.mailboxId ? { ...m, unread: Math.max(0, m.unread - 1) } : m)));
        }
      })
      .finally(() => setLoadingThread(false));
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function patchMessage(id: string, body: { seen?: boolean; flagged?: boolean }) {
    await fetch(`/api/mail/messages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function moveMessageTo(id: string, to: string) {
    await fetch(`/api/mail/messages/${id}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to }),
    });
  }

  async function deleteMessage(id: string) {
    await fetch(`/api/mail/messages/${id}`, { method: "DELETE" });
  }

  function removeFromList(ids: string[]) {
    setMessages((prev) => prev.filter((m) => !ids.includes(m.id)));
    if (ids.includes(selectedId ?? "")) {
      setSelectedId(null);
      setThread([]);
      if (window.innerWidth < 768) setMobileView("list");
    }
  }

  async function toggleStar(id: string, flagged: boolean) {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, flagged } : m)));
    await patchMessage(id, { flagged });
  }

  async function archiveOne(id: string) {
    removeFromList([id]);
    await moveMessageTo(id, "Archive");
  }

  async function deleteOne(id: string) {
    removeFromList([id]);
    await deleteMessage(id);
  }

  async function markReadOne(id: string, seen: boolean) {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, seen } : m)));
    await patchMessage(id, { seen });
    refreshMailboxes();
  }

  async function bulkArchive() {
    const ids = Array.from(selectedIds);
    removeFromList(ids);
    await Promise.all(ids.map((id) => moveMessageTo(id, "Archive")));
  }

  async function bulkDelete() {
    const ids = Array.from(selectedIds);
    removeFromList(ids);
    await Promise.all(ids.map((id) => deleteMessage(id)));
  }

  async function bulkMarkRead(seen: boolean) {
    const ids = Array.from(selectedIds);
    setMessages((prev) => prev.map((m) => (ids.includes(m.id) ? { ...m, seen } : m)));
    await Promise.all(ids.map((id) => patchMessage(id, { seen })));
    refreshMailboxes();
  }

  async function bulkStar(flagged: boolean) {
    const ids = Array.from(selectedIds);
    setMessages((prev) => prev.map((m) => (ids.includes(m.id) ? { ...m, flagged } : m)));
    await Promise.all(ids.map((id) => patchMessage(id, { flagged })));
  }

  function startReply(msg: MessageDetail) {
    const ownMailbox = mailboxes.find((m) => m.id === msg.mailboxId);
    const replyTo = msg.fromAddress === ownMailbox?.email ? msg.toAddress ?? "" : msg.fromAddress;
    setComposeFromMailboxId(msg.mailboxId);
    setComposeTo(replyTo ?? "");
    setComposeSubject(/^re:/i.test(msg.subject) ? msg.subject : `Re: ${msg.subject}`);
    setComposeText("");
    setComposeInReplyTo(msg.messageId ?? null);
    setComposeAttachments([]);
    setComposeOpen(true);
    setSendError(null);
  }

  function startForward(msg: MessageDetail) {
    setComposeFromMailboxId(msg.mailboxId);
    setComposeTo("");
    setComposeSubject(/^fwd:/i.test(msg.subject) ? msg.subject : `Fwd: ${msg.subject}`);
    setComposeText(
      `\n\n---------- Forwarded message ----------\nFrom: ${msg.fromName || msg.fromAddress} <${msg.fromAddress}>\nDate: ${formatFull(
        msg.date
      )}\nSubject: ${msg.subject}\n\n${msg.textPlain ?? ""}`
    );
    setComposeInReplyTo(null);
    setComposeAttachments(msg.attachments.map((a) => ({ filename: a.filename, url: a.url })));
    setComposeOpen(true);
    setSendError(null);
  }

  function startCompose() {
    setComposeFromMailboxId(mailboxId !== ALL ? mailboxId : mailboxes[0]?.id ?? "");
    setComposeTo("");
    setComposeSubject("");
    setComposeText("");
    setComposeInReplyTo(null);
    setComposeAttachments([]);
    setComposeOpen(true);
    setSendError(null);
  }

  async function sendCompose() {
    if (!composeFromMailboxId || !composeTo || !composeText) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch("/api/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mailboxId: composeFromMailboxId,
          to: composeTo,
          subject: composeSubject,
          text: composeText,
          inReplyTo: composeInReplyTo,
          attachments: composeAttachments.length ? composeAttachments : undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Send failed");
      setComposeOpen(false);
      setFolder("Sent");
      setTimeout(loadMessages, 1500); // give the append+resync a moment to land
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  const totalUnread = useMemo(() => mailboxes.reduce((sum, m) => sum + m.unread, 0), [mailboxes]);
  const currentMailbox = mailboxes.find((m) => m.id === mailboxId);
  const composeFromMailbox = mailboxes.find((m) => m.id === composeFromMailboxId);
  const currentFolderMeta = FOLDERS.find((f) => f.key === folder);

  const filteredMessages = useMemo(() => {
    if (!search.trim()) return messages;
    const q = search.trim().toLowerCase();
    return messages.filter(
      (m) =>
        m.subject.toLowerCase().includes(q) ||
        m.fromAddress.toLowerCase().includes(q) ||
        (m.fromName ?? "").toLowerCase().includes(q) ||
        m.snippet.toLowerCase().includes(q)
    );
  }, [messages, search]);

  function selectMailbox(id: string) {
    setMailboxId(id);
    setMobileView("list");
  }

  function selectFolder(key: string) {
    setFolder(key);
    setMobileView("list");
  }

  const railWidthClass = railCollapsed ? "md:w-16" : "md:w-60";

  return (
    <div className="flex h-full flex-col bg-paper">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b border-mist/20 px-4 py-3">
        <button
          onClick={() => setMobileView("rail")}
          className="rounded-md border border-mist/30 px-2 py-1.5 text-sm text-ink md:hidden"
          aria-label="Mailboxes"
        >
          {"☰"}
        </button>
        <h1 className="font-display text-lg font-semibold text-ink">Mail</h1>
        <div className="relative ml-2 flex-1 max-w-sm">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search this folder…"
            className="w-full rounded-full border border-mist/30 bg-transparent px-4 py-1.5 text-sm text-ink placeholder:text-slate focus:border-green focus:outline-none"
          />
        </div>
        <button
          onClick={startCompose}
          disabled={mailboxes.length === 0}
          className="ml-auto rounded-full bg-green px-4 py-1.5 text-sm font-semibold text-paper shadow-sm transition hover:brightness-95 disabled:opacity-50"
        >
          + Compose
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Mailbox + folder rail */}
        <div
          className={`${
            mobileView === "rail" ? "flex" : "hidden"
          } relative w-full shrink-0 flex-col overflow-y-auto border-r border-mist/20 p-3 md:flex ${railWidthClass} ${
            railHydrated ? "transition-[width] duration-150" : ""
          }`}
        >
          <button
            onClick={toggleRailCollapsed}
            aria-label={railCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={railCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="absolute -right-3 top-3 hidden h-6 w-6 items-center justify-center rounded-full border border-mist/30 bg-paper text-xs text-slate transition hover:text-ink md:flex"
          >
            {railCollapsed ? "›" : "‹"}
          </button>

          {!railCollapsed && <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate">Mailboxes</p>}

          <button
            onClick={() => selectMailbox(ALL)}
            title="All Mailboxes"
            className={`mb-1 flex items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition ${
              railCollapsed ? "justify-center" : ""
            } ${mailboxId === ALL ? "bg-green/15 text-green font-semibold" : "text-ink hover:bg-mist/10"}`}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mist/30 text-xs font-semibold text-ink">
              {"⌗"}
            </span>
            {!railCollapsed && <span className="flex-1 truncate">All Mailboxes</span>}
            {totalUnread > 0 && (
              <span className="rounded-full bg-green px-1.5 py-0.5 text-[10px] font-semibold text-paper">{totalUnread}</span>
            )}
          </button>

          <div className="mb-4 flex flex-col gap-0.5">
            {mailboxes.map((m) => (
              <button
                key={m.id}
                onClick={() => selectMailbox(m.id)}
                title={m.label || m.email}
                className={`flex items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition ${
                  railCollapsed ? "justify-center" : ""
                } ${mailboxId === m.id ? "bg-green/15 text-green font-semibold" : "text-ink hover:bg-mist/10"}`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${colorFor(m.id)}`}
                >
                  {initialsFor(m.label, m.email)}
                </span>
                {!railCollapsed && <span className="flex-1 truncate">{m.label || m.email}</span>}
                {m.unread > 0 && (
                  <span className="rounded-full bg-green px-1.5 py-0.5 text-[10px] font-semibold text-paper">{m.unread}</span>
                )}
              </button>
            ))}
          </div>

          {!railCollapsed && <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate">Folders</p>}
          <div className="flex flex-col gap-0.5">
            {FOLDERS.map((f) => (
              <button
                key={f.key}
                onClick={() => selectFolder(f.key)}
                title={f.label}
                className={`flex items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition ${
                  railCollapsed ? "justify-center" : ""
                } ${folder === f.key ? "bg-green/15 text-green font-semibold" : "text-ink hover:bg-mist/10"}`}
              >
                <span className="w-4 text-center">{f.icon}</span>
                {!railCollapsed && f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message list */}
        <div
          className={`${
            mobileView === "list" ? "flex" : "hidden"
          } w-full shrink-0 flex-col overflow-hidden border-r border-mist/20 md:flex md:w-96`}
        >
          {selectedIds.size > 0 ? (
            <div className="flex items-center gap-2 border-b border-mist/10 bg-mist/10 px-3 py-2">
              <span className="text-xs font-semibold text-ink">{selectedIds.size} selected</span>
              <button onClick={() => bulkMarkRead(true)} className="rounded-md px-2 py-1 text-xs text-ink hover:bg-mist/20">
                Mark read
              </button>
              <button onClick={() => bulkMarkRead(false)} className="rounded-md px-2 py-1 text-xs text-ink hover:bg-mist/20">
                Mark unread
              </button>
              <button onClick={() => bulkStar(true)} className="rounded-md px-2 py-1 text-xs text-ink hover:bg-mist/20">
                Star
              </button>
              {folder !== "Archive" && (
                <button onClick={bulkArchive} className="rounded-md px-2 py-1 text-xs text-ink hover:bg-mist/20">
                  Archive
                </button>
              )}
              <button onClick={bulkDelete} className="rounded-md px-2 py-1 text-xs text-red-500 hover:bg-mist/20">
                Delete
              </button>
              <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-slate hover:text-ink">
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between border-b border-mist/10 px-4 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate">
                {mailboxId === ALL ? "All Mailboxes" : currentMailbox?.label || currentMailbox?.email} · {currentFolderMeta?.label}
              </p>
              <span className="text-xs text-slate">{filteredMessages.length}</span>
            </div>
          )}

          <div ref={listRef} onScroll={onListScroll} className="flex-1 overflow-y-auto">
            {loadingList && <p className="p-4 text-sm text-slate">Loading…</p>}
            {!loadingList && filteredMessages.length === 0 && <p className="p-4 text-sm text-slate">No messages here.</p>}
            {filteredMessages.map((m) => (
              <div
                key={m.id}
                className={`group flex w-full gap-2 border-b border-mist/10 px-3 py-3 text-left transition ${
                  selectedId === m.id ? "bg-mist/15" : "hover:bg-mist/5"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(m.id)}
                  onChange={() => toggleSelect(m.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1.5 shrink-0"
                />
                <button onClick={() => openMessage(m.id)} className="flex min-w-0 flex-1 gap-2 text-left">
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${colorFor(
                      m.mailboxId
                    )}`}
                  >
                    {initialsFor(m.fromName, m.fromAddress)}
                  </span>
                  <span className="min-w-0 flex-1 overflow-hidden">
                    <span className="flex items-center justify-between gap-2">
                      <span className={`truncate text-sm ${m.seen ? "text-slate" : "font-semibold text-ink"}`}>
                        {m.fromName || m.fromAddress}
                      </span>
                      <span className="shrink-0 text-xs text-slate">{formatRelative(m.date)}</span>
                    </span>
                    <span className={`block truncate text-sm ${m.seen ? "text-slate" : "font-medium text-ink"}`}>
                      {m.subject || "(no subject)"}
                      {m.hasAttachments && <span className="ml-1 text-slate">{"📎"}</span>}
                    </span>
                    <span className="flex items-center gap-1.5">
                      {mailboxId === ALL && (
                        <span className="shrink-0 rounded-full bg-mist/20 px-1.5 py-0.5 text-[10px] font-medium text-slate">
                          {m.mailboxLabel}
                        </span>
                      )}
                      <span className="truncate text-xs text-slate">{m.snippet}</span>
                    </span>
                  </span>
                </button>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {!m.seen && <span className="h-2 w-2 rounded-full bg-green" />}
                  <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      onClick={() => toggleStar(m.id, !m.flagged)}
                      title={m.flagged ? "Unstar" : "Star"}
                      className={`text-sm ${m.flagged ? "text-amber-500" : "text-slate hover:text-ink"}`}
                    >
                      {m.flagged ? "★" : "☆"}
                    </button>
                    <button
                      onClick={() => markReadOne(m.id, !m.seen)}
                      title={m.seen ? "Mark unread" : "Mark read"}
                      className="text-xs text-slate hover:text-ink"
                    >
                      {"◉"}
                    </button>
                    {folder !== "Archive" && folder !== "Trash" && (
                      <button onClick={() => archiveOne(m.id)} title="Archive" className="text-xs text-slate hover:text-ink">
                        {"⇥"}
                      </button>
                    )}
                    <button onClick={() => deleteOne(m.id)} title="Delete" className="text-xs text-slate hover:text-red-500">
                      {"🗑"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {loadingMore && <p className="p-3 text-center text-xs text-slate">Loading more…</p>}
          </div>
        </div>

        {/* Detail pane */}
        <div className={`${mobileView === "detail" ? "flex" : "hidden"} flex-1 flex-col overflow-y-auto md:flex`}>
          <button
            onClick={() => setMobileView("list")}
            className="flex items-center gap-1 border-b border-mist/10 px-4 py-2 text-sm text-slate md:hidden"
          >
            ← Back to messages
          </button>
          <div className="flex-1 overflow-y-auto p-6">
            {!selectedId && <p className="text-sm text-slate">Select a message to read it.</p>}
            {selectedId && loadingThread && <p className="text-sm text-slate">Loading…</p>}
            {selectedId &&
              !loadingThread &&
              thread.map((msg) => (
                <div key={msg.id} className="mb-4 rounded-xl border border-mist/20 bg-paper p-5 shadow-sm">
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${colorFor(
                          msg.mailboxId
                        )}`}
                      >
                        {initialsFor(msg.fromName, msg.fromAddress)}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-ink">{msg.fromName || msg.fromAddress}</p>
                        <p className="text-xs text-slate">
                          to {msg.toAddress} · via {msg.mailboxLabel} · {msg.folder}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xs text-slate">{formatFull(msg.date)}</span>
                      <button
                        onClick={() => toggleStar(msg.id, !msg.flagged)}
                        title={msg.flagged ? "Unstar" : "Star"}
                        className={`text-sm ${msg.flagged ? "text-amber-500" : "text-slate hover:text-ink"}`}
                      >
                        {msg.flagged ? "★" : "☆"}
                      </button>
                    </div>
                  </div>
                  <p className="mb-3 text-base font-semibold text-ink">{msg.subject || "(no subject)"}</p>
                  {msg.textHtml ? (
                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: msg.textHtml }} />
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm text-ink">{msg.textPlain}</pre>
                  )}

                  {msg.attachments.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {msg.attachments.map((a) => (
                        <a
                          key={a.id}
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          download={a.filename}
                          className="flex items-center gap-1.5 rounded-md border border-mist/30 px-2.5 py-1.5 text-xs text-ink transition hover:bg-mist/10"
                        >
                          {"📎"} {a.filename}
                          <span className="text-slate">({formatSize(a.size)})</span>
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => startReply(msg)}
                      className="rounded-full border border-mist/30 px-4 py-1.5 text-xs font-semibold text-ink transition hover:bg-mist/10"
                    >
                      ↩ Reply
                    </button>
                    <button
                      onClick={() => startForward(msg)}
                      className="rounded-full border border-mist/30 px-4 py-1.5 text-xs font-semibold text-ink transition hover:bg-mist/10"
                    >
                      ➦ Forward
                    </button>
                    {msg.folder !== "Archive" && msg.folder !== "Trash" && (
                      <button
                        onClick={() => archiveOne(msg.id)}
                        className="rounded-full border border-mist/30 px-4 py-1.5 text-xs font-semibold text-ink transition hover:bg-mist/10"
                      >
                        {"⇥"} Archive
                      </button>
                    )}
                    <button
                      onClick={() => markReadOne(msg.id, false)}
                      className="rounded-full border border-mist/30 px-4 py-1.5 text-xs font-semibold text-ink transition hover:bg-mist/10"
                    >
                      Mark unread
                    </button>
                    <button
                      onClick={() => deleteOne(msg.id)}
                      className="rounded-full border border-mist/30 px-4 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-50"
                    >
                      {"🗑"} Delete
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {composeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-paper p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-ink">
                {composeInReplyTo ? "Reply" : composeAttachments.length ? "Forward" : "New message"}
              </h2>
              <button onClick={() => setComposeOpen(false)} className="text-slate hover:text-ink">
                ✕
              </button>
            </div>

            <label className="mb-2 flex items-center gap-2 text-xs text-slate">
              From
              {composeInReplyTo ? (
                <span className="font-medium text-ink">{composeFromMailbox?.email}</span>
              ) : (
                <select
                  value={composeFromMailboxId}
                  onChange={(e) => setComposeFromMailboxId(e.target.value)}
                  className="flex-1 rounded-md border border-mist/30 bg-transparent px-2 py-1 text-sm text-ink"
                >
                  {mailboxes.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label || m.email}
                    </option>
                  ))}
                </select>
              )}
            </label>

            <input
              value={composeTo}
              onChange={(e) => setComposeTo(e.target.value)}
              placeholder="To"
              className="mb-2 w-full rounded-md border border-mist/30 bg-transparent px-2 py-1.5 text-sm text-ink"
            />
            <input
              value={composeSubject}
              onChange={(e) => setComposeSubject(e.target.value)}
              placeholder="Subject"
              className="mb-2 w-full rounded-md border border-mist/30 bg-transparent px-2 py-1.5 text-sm text-ink"
            />
            <textarea
              value={composeText}
              onChange={(e) => setComposeText(e.target.value)}
              placeholder="Write your message…"
              rows={8}
              className="mb-2 w-full rounded-md border border-mist/30 bg-transparent px-2 py-1.5 text-sm text-ink"
            />
            {composeAttachments.length > 0 && (
              <p className="mb-2 text-xs text-slate">
                Forwarding {composeAttachments.length} attachment{composeAttachments.length > 1 ? "s" : ""}: {composeAttachments.map((a) => a.filename).join(", ")}
              </p>
            )}
            {sendError && <p className="mb-2 text-xs text-red-500">{sendError}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setComposeOpen(false)} className="rounded-md border border-mist/30 px-3 py-1.5 text-sm text-ink">
                Cancel
              </button>
              <button
                onClick={sendCompose}
                disabled={sending || !composeFromMailboxId || !composeTo || !composeText}
                className="rounded-md bg-green px-3 py-1.5 text-sm font-medium text-paper disabled:opacity-50"
              >
                {sending ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
