import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import {
  Sparkles,
  Send,
  X,
  Minus,
  Maximize2,
  Trash2,
  CheckCircle2,
  Circle,
  Flag,
  ArrowRight,
  GripHorizontal,
} from 'lucide-react';

import { useApp, chatQuickSuggestions } from '@/store';

const DEFAULT_W = 380;
const DEFAULT_H = 560;
const MIN_W = 320;
const MIN_H = 380;
const MINIMIZED_W = 300;
const MINIMIZED_H = 56;

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

export function ChatPanel() {
  const {
    messages,
    sendMessage,
    clearChat,
    chatOpen,
    toggleChat,
    chatMinimized,
    toggleChatMinimize,
  } = useApp();

  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const [pos, setPos] = useState(() => ({
    x: Math.max(16, window.innerWidth - DEFAULT_W - 24),
    y: Math.max(16, window.innerHeight - DEFAULT_H - 24),
  }));

  const [size, setSize] = useState({
    width: DEFAULT_W,
    height: DEFAULT_H,
  });

  const dragState = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const resizeState = useRef<{
    startX: number;
    startY: number;
    origW: number;
    origH: number;
  } | null>(null);

  /* ============================================================
     AUTO SCROLL
     ============================================================ */

  useEffect(() => {
    const element = scrollRef.current;

    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages, typing]);

  /* ============================================================
     TYPING INDICATOR
     ============================================================ */

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];

    if (lastMessage && lastMessage.role === 'user') {
      setTyping(true);

      const timer = setTimeout(() => {
        setTyping(false);
      }, 600);

      return () => clearTimeout(timer);
    }

    setTyping(false);
  }, [messages]);

  /* ============================================================
     DRAG
     ============================================================ */

  const onHeaderMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }

    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
    };

    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', onDragEnd);

    document.body.style.userSelect = 'none';
  };

  const onDragMove = (e: MouseEvent) => {
    if (!dragState.current) {
      return;
    }

    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;

    const width = chatMinimized
      ? MINIMIZED_W
      : size.width;

    setPos({
      x: clamp(
        dragState.current.origX + dx,
        0,
        window.innerWidth - Math.min(width, 120),
      ),

      y: clamp(
        dragState.current.origY + dy,
        0,
        window.innerHeight - 40,
      ),
    });
  };

  const onDragEnd = () => {
    dragState.current = null;

    window.removeEventListener('mousemove', onDragMove);
    window.removeEventListener('mouseup', onDragEnd);

    document.body.style.userSelect = '';
  };

  /* ============================================================
     RESIZE
     ============================================================ */

  const onResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();

    resizeState.current = {
      startX: e.clientX,
      startY: e.clientY,
      origW: size.width,
      origH: size.height,
    };

    window.addEventListener('mousemove', onResizeMove);
    window.addEventListener('mouseup', onResizeEnd);

    document.body.style.userSelect = 'none';
  };

  const onResizeMove = (e: MouseEvent) => {
    if (!resizeState.current) {
      return;
    }

    const dx = e.clientX - resizeState.current.startX;
    const dy = e.clientY - resizeState.current.startY;

    setSize({
      width: clamp(
        resizeState.current.origW + dx,
        MIN_W,
        window.innerWidth - pos.x - 16,
      ),

      height: clamp(
        resizeState.current.origH + dy,
        MIN_H,
        window.innerHeight - pos.y - 16,
      ),
    });
  };

  const onResizeEnd = () => {
    resizeState.current = null;

    window.removeEventListener('mousemove', onResizeMove);
    window.removeEventListener('mouseup', onResizeEnd);

    document.body.style.userSelect = '';
  };

  /* ============================================================
     CLEANUP
     ============================================================ */

  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', onDragMove);
      window.removeEventListener('mouseup', onDragEnd);

      window.removeEventListener('mousemove', onResizeMove);
      window.removeEventListener('mouseup', onResizeEnd);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ============================================================
     SUBMIT MESSAGE
     ============================================================ */

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    const message = input.trim();

    if (!message) {
      return;
    }

    sendMessage(message);
    setInput('');
  };

  /* ============================================================
     PREVIEW
     ============================================================ */

  const renderPreview = (
    items: string[],
    type: 'roadmap' | 'skill' | 'next',
  ) => {
    if (type === 'roadmap') {
      return (
        <div className="mt-2 space-y-1.5 rounded-lg border border-iris-200 bg-iris-50 p-3 dark:border-iris-800 dark:bg-iris-900/30">
          {items.map((item, index) => {
            const done = item.includes('completed');

            return (
              <div
                key={index}
                className="flex items-start gap-2 text-xs text-iris-800 dark:text-iris-200"
              >
                {done ? (
                  <CheckCircle2
                    size={14}
                    className="mt-0.5 shrink-0 text-sage-500"
                  />
                ) : (
                  <Circle
                    size={14}
                    className="mt-0.5 shrink-0 text-iris-400"
                  />
                )}

                <span>{item}</span>
              </div>
            );
          })}
        </div>
      );
    }

    if (type === 'skill') {
      return (
        <div className="mt-2 space-y-1.5 rounded-lg border border-iris-200 bg-iris-50 p-3 dark:border-iris-800 dark:bg-iris-900/30">
          {items.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-2 text-xs text-iris-800 dark:text-iris-200"
            >
              <Flag
                size={12}
                className="shrink-0 text-iris-500"
              />

              {item}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-900/30">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-2 text-xs font-medium text-amber-800 dark:text-amber-200"
          >
            {index === 0 ? (
              <ArrowRight
                size={12}
                className="text-amber-500"
              />
            ) : (
              <span className="w-3" />
            )}

            {item}
          </div>
        ))}
      </div>
    );
  };

  /* ============================================================
     CLOSED CHAT
     ============================================================ */

  if (!chatOpen) {
    return (
      <button
        onClick={toggleChat}
        aria-label="Open Learning Guide"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-iris-500 to-iris-700 text-white shadow-lift transition-transform hover:scale-105"
      >
        <Sparkles size={22} />
      </button>
    );
  }

  /* ============================================================
     HEADER
     ============================================================ */

  const header = (
    <div
      onMouseDown={onHeaderMouseDown}
      className="flex h-14 shrink-0 cursor-grab items-center justify-between border-b border-ink-100 px-3.5 active:cursor-grabbing dark:border-ink-700"
    >
      <div className="flex items-center gap-2.5">
        <GripHorizontal
          size={14}
          className="text-ink-300 dark:text-ink-500"
        />

        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-iris-500 to-iris-700 text-white">
          <Sparkles size={16} />
        </div>

        {!chatMinimized && (
          <div>
            <div className="text-sm font-semibold text-ink-800 dark:text-ink-50">
              Learning Guide
            </div>

            <div className="flex items-center gap-1 text-2xs text-sage-500">
              <span className="h-1.5 w-1.5 rounded-full bg-sage-400" />
              online
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        {!chatMinimized && (
          <button
            onClick={clearChat}
            aria-label="Clear chat"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-700"
          >
            <Trash2 size={14} />
          </button>
        )}

        <button
          onClick={toggleChatMinimize}
          aria-label={
            chatMinimized
              ? 'Expand chat'
              : 'Minimize chat'
          }
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-700"
        >
          {chatMinimized ? (
            <Maximize2 size={14} />
          ) : (
            <Minus size={16} />
          )}
        </button>

        <button
          onClick={toggleChat}
          aria-label="Close chat"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-700"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );

  /* ============================================================
     MINIMIZED CHAT
     ============================================================ */

  if (chatMinimized) {
    return (
      <div
        style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y,
          width: MINIMIZED_W,
          height: MINIMIZED_H,
          zIndex: 40,
        }}
        className="surface overflow-hidden rounded-xl2 shadow-lift"
      >
        {header}
      </div>
    );
  }

  /* ============================================================
     FULL CHAT PANEL
     ============================================================ */

  return (
    <div
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: size.width,
        height: size.height,
        zIndex: 40,
      }}
      className="surface flex flex-col overflow-hidden rounded-xl2 shadow-lift"
    >
      {header}

      {/* ======================================================
          MESSAGES
          ====================================================== */}

      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto p-4"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user'
                ? 'justify-end'
                : 'justify-start'
            } animate-fade-in`}
          >
            <div
              className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-sm ${
                message.role === 'user'
                  ? 'bg-amber-400 text-ink-900'
                  : 'bg-ink-50 text-ink-700 dark:bg-ink-700 dark:text-ink-100'
              }`}
            >
              {/* =================================================
                  MARKDOWN MESSAGE RENDERER
                  ================================================= */}

              <div className="leading-relaxed">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => (
                      <h1 className="mb-3 text-base font-bold text-ink-900 dark:text-white">
                        {children}
                      </h1>
                    ),

                    h2: ({ children }) => (
                      <h2 className="mb-3 mt-4 text-base font-bold text-ink-900 dark:text-white">
                        {children}
                      </h2>
                    ),

                    h3: ({ children }) => (
                      <h3 className="mb-2 mt-3 text-sm font-semibold text-ink-900 dark:text-white">
                        {children}
                      </h3>
                    ),

                    p: ({ children }) => (
                      <p className="mb-2 last:mb-0">
                        {children}
                      </p>
                    ),

                    ul: ({ children }) => (
                      <ul className="mb-3 ml-5 list-disc space-y-1">
                        {children}
                      </ul>
                    ),

                    ol: ({ children }) => (
                      <ol className="mb-3 ml-5 list-decimal space-y-1">
                        {children}
                      </ol>
                    ),

                    li: ({ children }) => (
                      <li className="pl-1">
                        {children}
                      </li>
                    ),

                    strong: ({ children }) => (
                      <strong className="font-semibold text-ink-900 dark:text-white">
                        {children}
                      </strong>
                    ),

                    em: ({ children }) => (
                      <em className="italic">
                        {children}
                      </em>
                    ),

                    code: ({ children }) => (
                      <code className="rounded bg-ink-200 px-1 py-0.5 font-mono text-xs dark:bg-ink-600">
                        {children}
                      </code>
                    ),

                    pre: ({ children }) => (
                      <pre className="my-3 overflow-x-auto rounded-lg bg-ink-900 p-3 font-mono text-xs text-white">
                        {children}
                      </pre>
                    ),

                    blockquote: ({ children }) => (
                      <blockquote className="my-3 border-l-2 border-amber-400 pl-3 italic text-ink-500 dark:text-ink-300">
                        {children}
                      </blockquote>
                    ),

                    table: ({ children }) => (
                      <div className="my-3 overflow-x-auto rounded-lg border border-ink-200 dark:border-ink-600">
                        <table className="min-w-full border-collapse text-xs">
                          {children}
                        </table>
                      </div>
                    ),

                    thead: ({ children }) => (
                      <thead className="bg-ink-100 dark:bg-ink-600">
                        {children}
                      </thead>
                    ),

                    tbody: ({ children }) => (
                      <tbody>{children}</tbody>
                    ),

                    tr: ({ children }) => (
                      <tr>{children}</tr>
                    ),

                    th: ({ children }) => (
                      <th className="border-b border-ink-200 px-2 py-2 text-left font-semibold dark:border-ink-500">
                        {children}
                      </th>
                    ),

                    td: ({ children }) => (
                      <td className="border-b border-ink-100 px-2 py-2 align-top dark:border-ink-600">
                        {children}
                      </td>
                    ),

                    a: ({ href, children }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-amber-600 underline hover:text-amber-700 dark:text-amber-300"
                      >
                        {children}
                      </a>
                    ),

                    hr: () => (
                      <hr className="my-4 border-ink-200 dark:border-ink-600" />
                    ),
                  }}
                >
                  {message.text}
                </ReactMarkdown>
              </div>

              {/* =================================================
                  EXISTING PREVIEW
                  ================================================= */}

              {message.preview &&
                renderPreview(
                  message.preview.items,
                  message.preview.type,
                )}
            </div>
          </div>
        ))}

        {/* ======================================================
            TYPING INDICATOR
            ====================================================== */}

        {typing && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-xl bg-ink-50 px-4 py-3 dark:bg-ink-700">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-300 [animation-delay:-0.3s] dark:bg-ink-400" />

              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-300 [animation-delay:-0.15s] dark:bg-ink-400" />

              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-300 dark:bg-ink-400" />
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          QUICK SUGGESTIONS
          ======================================================== */}

      <div className="shrink-0 px-3 pb-2">
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {chatQuickSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => sendMessage(suggestion)}
              className="chip border border-ink-200 bg-white text-ink-500 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-600 dark:border-ink-600 dark:bg-ink-700 dark:text-ink-300 dark:hover:border-amber-500 dark:hover:bg-amber-900/30 dark:hover:text-amber-300"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================
          INPUT
          ======================================================== */}

      <form
        onSubmit={submit}
        className="shrink-0 border-t border-ink-100 p-3 dark:border-ink-700"
      >
        <div className="relative">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your Learning Guide..."
            className="input-base pr-10"
          />

          <button
            type="submit"
            aria-label="Send"
            disabled={!input.trim()}
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md bg-amber-400 text-ink-900 transition-colors hover:bg-amber-300 disabled:opacity-40"
          >
            <Send size={14} />
          </button>
        </div>
      </form>

      {/* ========================================================
          RESIZE HANDLE
          ======================================================== */}

      <div
        onMouseDown={onResizeMouseDown}
        aria-label="Resize chat"
        className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize"
      >
        <svg
          viewBox="0 0 16 16"
          className="h-full w-full text-ink-300 dark:text-ink-500"
        >
          <circle
            cx="13"
            cy="13"
            r="1.2"
            fill="currentColor"
          />

          <circle
            cx="13"
            cy="9"
            r="1.2"
            fill="currentColor"
          />

          <circle
            cx="9"
            cy="13"
            r="1.2"
            fill="currentColor"
          />
        </svg>
      </div>
    </div>
  );
}