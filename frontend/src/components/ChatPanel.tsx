import { useEffect, useRef, useState } from 'react';
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
  const { messages, sendMessage, clearChat, chatOpen, toggleChat, chatMinimized, toggleChatMinimize } = useApp();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [typing, setTyping] = useState(false);

  const [pos, setPos] = useState(() => ({
    x: Math.max(16, window.innerWidth - DEFAULT_W - 24),
    y: Math.max(16, window.innerHeight - DEFAULT_H - 24),
  }));
  const [size, setSize] = useState({ width: DEFAULT_W, height: DEFAULT_H });

  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeState = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last && last.role === 'user') {
      setTyping(true);
      const t = setTimeout(() => setTyping(false), 600);
      return () => clearTimeout(t);
    }
    setTyping(false);
  }, [messages]);

  // ---- drag (movable) ----
  const onHeaderMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return; // don't drag from header buttons
    dragState.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', onDragEnd);
    document.body.style.userSelect = 'none';
  };
  const onDragMove = (e: MouseEvent) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    const w = chatMinimized ? MINIMIZED_W : size.width;
    setPos({
      x: clamp(dragState.current.origX + dx, 0, window.innerWidth - Math.min(w, 120)),
      y: clamp(dragState.current.origY + dy, 0, window.innerHeight - 40),
    });
  };
  const onDragEnd = () => {
    dragState.current = null;
    window.removeEventListener('mousemove', onDragMove);
    window.removeEventListener('mouseup', onDragEnd);
    document.body.style.userSelect = '';
  };

  // ---- resize (expandable) ----
  const onResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    resizeState.current = { startX: e.clientX, startY: e.clientY, origW: size.width, origH: size.height };
    window.addEventListener('mousemove', onResizeMove);
    window.addEventListener('mouseup', onResizeEnd);
    document.body.style.userSelect = 'none';
  };
  const onResizeMove = (e: MouseEvent) => {
    if (!resizeState.current) return;
    const dx = e.clientX - resizeState.current.startX;
    const dy = e.clientY - resizeState.current.startY;
    setSize({
      width: clamp(resizeState.current.origW + dx, MIN_W, window.innerWidth - pos.x - 16),
      height: clamp(resizeState.current.origH + dy, MIN_H, window.innerHeight - pos.y - 16),
    });
  };
  const onResizeEnd = () => {
    resizeState.current = null;
    window.removeEventListener('mousemove', onResizeMove);
    window.removeEventListener('mouseup', onResizeEnd);
    document.body.style.userSelect = '';
  };

  useEffect(() => () => {
    window.removeEventListener('mousemove', onDragMove);
    window.removeEventListener('mouseup', onDragEnd);
    window.removeEventListener('mousemove', onResizeMove);
    window.removeEventListener('mouseup', onResizeEnd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  };

  const renderPreview = (items: string[], type: 'roadmap' | 'skill' | 'next') => {
    if (type === 'roadmap') {
      return (
        <div className="mt-2 space-y-1.5 rounded-lg border border-iris-200 bg-iris-50 p-3 dark:border-iris-800 dark:bg-iris-900/30">
          {items.map((item, i) => {
            const done = item.includes('completed');
            return (
              <div key={i} className="flex items-start gap-2 text-xs text-iris-800 dark:text-iris-200">
                {done ? (
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-sage-500" />
                ) : (
                  <Circle size={14} className="mt-0.5 shrink-0 text-iris-400" />
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
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-iris-800 dark:text-iris-200">
              <Flag size={12} className="shrink-0 text-iris-500" />
              {item}
            </div>
          ))}
        </div>
      );
    }
    return (
      <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-900/30">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-xs font-medium text-amber-800 dark:text-amber-200">
            {i === 0 ? <ArrowRight size={12} className="text-amber-500" /> : <span className="w-3" />}
            {item}
          </div>
        ))}
      </div>
    );
  };

  // ---- fully closed: floating launcher button ----
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

  const header = (
    <div
      onMouseDown={onHeaderMouseDown}
      className="flex h-14 shrink-0 cursor-grab items-center justify-between border-b border-ink-100 px-3.5 active:cursor-grabbing dark:border-ink-700"
    >
      <div className="flex items-center gap-2.5">
        <GripHorizontal size={14} className="text-ink-300 dark:text-ink-500" />
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-iris-500 to-iris-700 text-white">
          <Sparkles size={16} />
        </div>
        {!chatMinimized && (
          <div>
            <div className="text-sm font-semibold text-ink-800 dark:text-ink-50">Learning Guide</div>
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
          aria-label={chatMinimized ? 'Expand chat' : 'Minimize chat'}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-700"
        >
          {chatMinimized ? <Maximize2 size={14} /> : <Minus size={16} />}
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

  // ---- minimized: slim draggable bar only ----
  if (chatMinimized) {
    return (
      <div
        style={{ position: 'fixed', left: pos.x, top: pos.y, width: MINIMIZED_W, height: MINIMIZED_H, zIndex: 40 }}
        className="surface overflow-hidden rounded-xl2 shadow-lift"
      >
        {header}
      </div>
    );
  }

  // ---- full floating, draggable, resizable panel ----
  return (
    <div
      style={{ position: 'fixed', left: pos.x, top: pos.y, width: size.width, height: size.height, zIndex: 40 }}
      className="surface flex flex-col overflow-hidden rounded-xl2 shadow-lift"
    >
      {header}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            <div
              className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-sm ${
                m.role === 'user'
                  ? 'bg-amber-400 text-ink-900'
                  : 'bg-ink-50 text-ink-700 dark:bg-ink-700 dark:text-ink-100'
              }`}
            >
              <p className="leading-relaxed">{m.text}</p>
              {m.preview && renderPreview(m.preview.items, m.preview.type)}
            </div>
          </div>
        ))}
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

      {/* Suggestions */}
      <div className="shrink-0 px-3 pb-2">
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {chatQuickSuggestions.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="chip border border-ink-200 bg-white text-ink-500 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-600 dark:border-ink-600 dark:bg-ink-700 dark:text-ink-300 dark:hover:border-amber-500 dark:hover:bg-amber-900/30 dark:hover:text-amber-300"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <form onSubmit={submit} className="shrink-0 border-t border-ink-100 p-3 dark:border-ink-700">
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
            className="absolute right-2 top-1/2 flex -translate-y-1/2 h-7 w-7 items-center justify-center rounded-md bg-amber-400 text-ink-900 transition-colors hover:bg-amber-300 disabled:opacity-40"
          >
            <Send size={14} />
          </button>
        </div>
      </form>

      {/* Resize handle (expandable) */}
      <div
        onMouseDown={onResizeMouseDown}
        aria-label="Resize chat"
        className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize"
      >
        <svg viewBox="0 0 16 16" className="h-full w-full text-ink-300 dark:text-ink-500">
          <path d="M14 14L14 2M14 14L2 14" stroke="none" />
          <circle cx="13" cy="13" r="1.2" fill="currentColor" />
          <circle cx="13" cy="9" r="1.2" fill="currentColor" />
          <circle cx="9" cy="13" r="1.2" fill="currentColor" />
        </svg>
      </div>
    </div>
  );
}
