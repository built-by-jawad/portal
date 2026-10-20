"use client";

import { useEffect, useState, useCallback } from "react";

type Mailbox = { id: string; label: string; email: string };
type MessageRow = {
  id: string;
  uid: number;
  fromAddress: string;
  fromName: string | null;
  toAddress: string | null;
  subject: string;
  date: string;
  seen: boolean;
  snippet: string;
  threadKey: string;
};
type MessageDetail = {
  id: string;
  mailboxId: string;
  folder: string;
  fromAddress: string;
  fromName: string | null;
  toAddress: string | null;
  subject: string;
  textPlain: string | null;
  textHtml: string | null;
  date: string;
  messageId: string | null;
};

const FOLDERS = ["INBOX", "Sent", "Drafts", "Archive", "Spam", "Trash"];

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function MailClient() {
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [mailboxId, setMailboxId] = useState<string>("");
  const [folder, setFolder] = useState<string>("INBOX");
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thread, setThread] = useState<MessageDetail[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);

  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeText, setComposeText] = useState("");
  const [composeInReplyTo, setComposeInReplyTo] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/mail/mailboxes")
      .then((r) => r.json())
      .then((d) => {
        setMailboxes(d.mailboxes ?? []);
        if (d.mailboxes?.length) setMailboxId(d.mailboxes[0].id);
      });
  }, []);

  const loadMessages = useCallback(() => {
    if (!mailboxId) return;
    setLoadingList(true);
    fetch(`/api/mail/messages?mailboxId=${mailboxId}&folder=${encodeURIComponent(folder)}`)
      .then((r) => r.json())
      .then((d) => setMessages(d.messages ?? []))
      .finally(() => setLoadingList(false));
  }, [mailboxId, folder]);

  useEffect(() => {
    setSelectedId(null);
    setThread([]);
    loadMessages();
  }, [loadMessages]);

  function openMessage(id: string) {
    setSelectedId(id);
    setLoadingThread(true);
    fetch(`/api/mail/messages/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setThread(d.thread ?? []);
        setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, seen: true } : m)));
      })
      .finally(() => setLoadingThread(false));
  }

  function startReply(msg: MessageDetail) {
    const currentMailbox = mailboxes.find((m) => m.id === mailboxId);
    const replyTo = msg.fromAddress === currentMailbox?.email ? msg.toAddress ?? "" : msg.fromAddress;
    setComposeTo(replyTo ?? "");
    setComposeSubject(/^re:/i.test(msg.subject) ? msg.subject : `Re: ${msg.subject}`);
    setComposeText("");
    setComposeInReplyTo(msg.messageId ?? null);
    setComposeOpen(true);
    setSendError(null);
  }

  function startCompose() {
    setComposeTo("");
    setComposeSubject("");
    setComposeText("");
    setComposeInReplyTo(null);
    setComposeOpen(true);
    setSendError(null);
  }

  async function sendCompose() {
    if (!mailboxId || !composeTo || !composeText) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch("/api/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mailboxId,
          to: composeTo,
          subject: composeSubject,
          text: composeText,
          inReplyTo: composeInReplyTo,
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

  const selectedMailbox = mailboxes.find((m) => m.id === mailboxId);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-mist/20 px-4 py-3">
        <h1 className="font-display text-lg font-semibold text-ink">Mail</h1>
        <button
          onClick={startCompose}
          disabled={!mailboxId}
          className="rounded-md bg-green px-3 py-1.5 text-sm font-medium text-paper disabled:opacity-50"
        >
          Compose
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Mailbox + folder sidebar */}
        <div className="w-48 shrink-0 overflow-y-auto border-r border-mist/20 p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate">Mailbox</p>
          <select
            value={mailboxId}
            onChange={(e) => setMailboxId(e.target.value)}
            className="mb-4 w-full rounded-md border border-mist/30 bg-transparent px-2 py-1.5 text-sm text-ink"
          >
            {mailboxes.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label || m.email}
              </option>
            ))}
          </select>

          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate">Folder</p>
          <div className="flex flex-col gap-0.5">
            {FOLDERS.map((f) => (
              <button
                key={f}
                onClick={() => setFolder(f)}
                className={`rounded-md px-2 py-1.5 text-left text-sm ${
                  folder === f ? "bg-green/15 text-green" : "text-ink hover:bg-mist/10"
                }`}
              >
                {f === "INBOX" ? "Inbox" : f}
              </button>
            ))}
          </div>
        </div>

        {/* Message list */}
        <div className="w-80 shrink-0 overflow-y-auto border-r border-mist/20">
          {loadingList && <p className="p-4 text-sm text-slate">Loading…</p>}
          {!loadingList && messages.length === 0 && <p className="p-4 text-sm text-slate">No messages.</p>}
          {messages.map((m) => (
            <button
              key={m.id}
              onClick={() => openMessage(m.id)}
              className={`block w-full border-b border-mist/10 px-4 py-3 text-left ${
                selectedId === m.id ? "bg-mist/10" : "hover:bg-mist/5"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`truncate text-sm ${m.seen ? "text-slate" : "font-semibold text-ink"}`}>
                  {m.fromName || m.fromAddress}
                </span>
                <span className="shrink-0 text-xs text-slate">{formatDate(m.date)}</span>
              </div>
              <p className={`truncate text-sm ${m.seen ? "text-slate" : "font-medium text-ink"}`}>{m.subject}</p>
              <p className="truncate text-xs text-slate">{m.snippet}</p>
            </button>
          ))}
        </div>

        {/* Detail pane */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedId && <p className="text-sm text-slate">Select a message to read it.</p>}
          {selectedId && loadingThread && <p className="text-sm text-slate">Loading…</p>}
          {selectedId &&
            !loadingThread &&
            thread.map((msg) => (
              <div key={msg.id} className="mb-6 rounded-lg border border-mist/20 p-4">
                <div className="mb-2 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-ink">{msg.fromName || msg.fromAddress}</p>
                    <p className="text-xs text-slate">
                      {msg.fromAddress} → {msg.toAddress} · {msg.folder}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-slate">{formatDate(msg.date)}</span>
                </div>
                <p className="mb-3 text-sm font-medium text-ink">{msg.subject}</p>
                {msg.textHtml ? (
                  <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: msg.textHtml }} />
                ) : (
                  <pre className="whitespace-pre-wrap text-sm text-ink">{msg.textPlain}</pre>
                )}
                <button
                  onClick={() => startReply(msg)}
                  className="mt-3 rounded-md border border-mist/30 px-3 py-1 text-xs font-medium text-ink hover:bg-mist/10"
                >
                  Reply
                </button>
              </div>
            ))}
        </div>
      </div>

      {composeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-paper p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-ink">
                {composeInReplyTo ? "Reply" : "New message"}
              </h2>
              <button onClick={() => setComposeOpen(false)} className="text-slate hover:text-ink">
                ✕
              </button>
            </div>
            <p className="mb-2 text-xs text-slate">From: {selectedMailbox?.email}</p>
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
            {sendError && <p className="mb-2 text-xs text-red-500">{sendError}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setComposeOpen(false)}
                className="rounded-md border border-mist/30 px-3 py-1.5 text-sm text-ink"
              >
                Cancel
              </button>
              <button
                onClick={sendCompose}
                disabled={sending || !composeTo || !composeText}
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
