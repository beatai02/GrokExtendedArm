"use client";

import { useRouter } from "next/navigation";
import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { BotMarkdown } from "@/components/markdown";
import { MAX_CONTENT_LENGTH } from "@/lib/constants";
import type { Message } from "@/lib/types";

const POLL_MS = 5000;

function formatIst(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function Chat() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const loadMessages = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/chat/messages", { signal });
    if (response.status === 401) {
      router.replace("/login");
      return;
    }
    if (!response.ok) {
      throw new Error("Failed to load messages");
    }
    const payload = (await response.json()) as { messages: Message[] };
    setMessages(payload.messages);
    setError(null);
  }, [router]);

  useEffect(() => {
    const controller = new AbortController();

    async function poll() {
      try {
        await loadMessages(controller.signal);
      } catch (pollError) {
        if (controller.signal.aborted) {
          return;
        }
        setError(
          pollError instanceof Error ? pollError.message : "Failed to load messages",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, POLL_MS);

    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const next = content.trim();
    if (!next || sending) {
      return;
    }

    setSending(true);
    setError(null);

    try {
      const response = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: next }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { message?: Message; error?: string }
        | null;

      if (!response.ok) {
        setError(payload?.error ?? "Failed to send message");
        return;
      }

      if (payload?.message) {
        const created = payload.message;
        setMessages((current) =>
          current.some((item) => item.id === created.id)
            ? current
            : [...current, created],
        );
      }
      setContent("");
    } catch {
      setError("Failed to send message");
    } finally {
      setSending(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#0b0b0d] text-zinc-100">
      <header className="sticky top-0 z-10 border-b border-zinc-800/80 bg-[#0b0b0d]/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-amber-200/80">
              Private line
            </p>
            <h1 className="text-lg font-medium tracking-tight">Chat</h1>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-full border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-4 pt-6">
        <div className="flex-1 space-y-4 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-zinc-500">Loading conversation…</p>
          ) : null}
          {!loading && messages.length === 0 ? (
            <p className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-6 text-sm text-zinc-400">
              No messages yet. Send a note and the bot will pick it up.
            </p>
          ) : null}
          {messages.map((message) => (
            <article
              key={message.id}
              className={
                message.role === "user"
                  ? "ml-auto max-w-[92%] rounded-2xl rounded-br-md bg-zinc-100 px-4 py-3 text-zinc-950 sm:max-w-[78%]"
                  : "mr-auto max-w-[92%] rounded-2xl rounded-bl-md border border-zinc-800 bg-zinc-900/70 px-4 py-3 sm:max-w-[78%]"
              }
            >
              <div className="mb-2 flex items-center justify-between gap-3 text-[11px] uppercase tracking-wide">
                <span className={message.role === "user" ? "text-zinc-500" : "text-amber-200/80"}>
                  {message.role === "user" ? "You" : "Bot"}
                </span>
                <time dateTime={message.created_at} className={message.role === "user" ? "text-zinc-500" : "text-zinc-500"}>
                  {formatIst(message.created_at)}
                </time>
              </div>
              {message.role === "bot" ? (
                <BotMarkdown content={message.content} />
              ) : (
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
                  {message.content}
                </p>
              )}
              {message.role === "user" &&
              (message.status === "pending" || message.status === "processing") ? (
                <p className="mt-3 text-xs text-zinc-500">
                  waiting for bot (up to ~5 min)
                </p>
              ) : null}
            </article>
          ))}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={onSubmit}
          className="sticky bottom-0 mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/95 p-3 shadow-[0_-12px_40px_rgba(0,0,0,0.35)]"
        >
          {error ? (
            <p className="mb-2 text-sm text-rose-300" role="alert">
              {error}
            </p>
          ) : null}
          <label htmlFor="message" className="sr-only">
            Message
          </label>
          <textarea
            id="message"
            rows={3}
            value={content}
            maxLength={MAX_CONTENT_LENGTH}
            onChange={(event) => setContent(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Write a message. Enter to send, Shift+Enter for a new line."
            className="w-full resize-none bg-transparent px-2 py-2 text-[15px] leading-relaxed text-zinc-100 outline-none placeholder:text-zinc-600"
          />
          <div className="mt-2 flex items-center justify-between gap-3 px-2">
            <p className="text-xs text-zinc-600">
              {content.length}/{MAX_CONTENT_LENGTH}
            </p>
            <button
              type="submit"
              disabled={sending || content.trim().length === 0}
              className="rounded-xl bg-amber-200 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
