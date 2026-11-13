import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bot,
  MessageSquareText,
  Send,
  Trash2,
  X,
  Zap,
  Sparkles,
  User,
  AlertCircle,
} from 'lucide-react';

export interface ChatbotStudioContext {
  regionName: string;
  templateTitle: string;
  platformLabel: string;
  crsEpsg: string;
  spectralIndex: string;
  sensor: string;
  thresholdValue: number;
  vizSummary?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  modelUsed?: string;
}

interface GeoGeminiChatbotProps {
  studioContext: ChatbotStudioContext;
}

const CHAT_ROLES = [
  { id: 'gis-architect', label: 'Asisten GIS & Script (GEE / Python / QGIS)' },
  { id: 'coastal-oceanographer', label: 'Ahli Pesisir, SWAN & Pasang Surut' },
  { id: 'uav-photogrammetry', label: 'Spesialis Drone Agisoft & Pix4D' },
];

export const GeoGeminiChatbot: React.FC<GeoGeminiChatbotProps> = ({ studioContext }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [roleId, setRoleId] = useState<string>('gis-architect');
  const [fastMode, setFastMode] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'model',
      text: `Halo! Saya Asisten GeoScript. Anda dapat berdiskusi multi-turn mengenai script ${studioContext.platformLabel}, membaca interpretasi visualisasi peta (${studioContext.spectralIndex}), atau mengoptimalkan parameter AOI ${studioContext.regionName}.`,
    },
  ]);

  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isSending]);

  const sendMessage = async (overrideText?: string) => {
    const trimmed = (overrideText ?? inputText).trim();
    if (!trimmed || isSending) return;

    setErrorMsg(null);
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    const historyPayload = messages
      .filter((m) => m.id !== 'welcome-1')
      .map((m) => ({ role: m.role, text: m.text }));

    setMessages((prev) => [...prev, userMsg]);
    if (!overrideText) setInputText('');
    setIsSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: historyPayload,
          roleId,
          fastMode,
          studioContext,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Gagal menghubungi server (HTTP ${res.status}).`);
      }

      const botMsg: ChatMessage = {
        id: `m-${Date.now()}`,
        role: 'model',
        text: data.reply || 'Tidak ada respons teks.',
        modelUsed: data.model,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kendala saat mengirim pesan.');
    } finally {
      setIsSending(false);
    }
  };

  const handleClearHistory = () => {
    setErrorMsg(null);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'model',
        text: `Riwayat percakapan direset. Konteks aktif: ${studioContext.templateTitle} di ${studioContext.regionName} (${studioContext.crsEpsg}). Silakan ajukan pertanyaan baru!`,
      },
    ]);
  };

  const quickPrompts = [
    `Jelaskan hasil visualisasi ${studioContext.spectralIndex} di peta saat ini`,
    `Apakah ambang batas ${studioContext.thresholdValue} sudah optimal?`,
    `Buatkan ringkasan interpretasi wilayah ${studioContext.regionName} untuk laporan`,
  ];

  return (
    <div className="no-print fixed bottom-5 right-5 z-40 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.section
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            aria-label="Asisten Chat GIS Gemini"
            data-testid="gemini-chatbot-drawer"
            className="mb-3 w-[calc(100vw-2rem)] sm:w-[410px] h-[540px] max-h-[78vh] bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-[0_20px_50px_-12px_rgba(15,23,42,0.22)] flex flex-col overflow-hidden"
          >
            {/* Header Drawer */}
            <div className="bg-gradient-to-r from-slate-900 via-teal-900 to-teal-800 text-white px-4 py-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-teal-200" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold truncate">Asisten Spasial GIS</h3>
                  <p className="text-[11px] text-teal-100/85 truncate">
                    Konteks: {studioContext.regionName}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleClearHistory}
                  title="Bersihkan riwayat percakapan"
                  aria-label="Bersihkan riwayat percakapan"
                  className="p-1.5 rounded-lg text-teal-100 hover:bg-white/15 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Tutup asisten chat"
                  className="p-1.5 rounded-lg text-teal-100 hover:bg-white/15 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Role & Model Selector Bar */}
            <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
              <select
                aria-label="Peran Asisten GIS"
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className="flex-1 min-w-[180px] px-2.5 py-1 text-[11px] font-medium bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600/40"
              >
                {CHAT_ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setFastMode((prev) => !prev)}
                title="Ganti kecepatan respons model"
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  fastMode
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-teal-50 text-teal-800 border-teal-200'
                }`}
              >
                {fastMode ? (
                  <>
                    <Zap className="w-3 h-3" />
                    Mode Cepat
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    Analisis Mendalam
                  </>
                )}
              </button>
            </div>

            {/* Scrollable Multi-Turn Conversation Thread */}
            <div
              data-testid="chatbot-message-list"
              className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3 bg-slate-50/50"
            >
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isUser
                          ? 'bg-slate-800 text-white'
                          : 'bg-teal-100 text-teal-800 border border-teal-200'
                      }`}
                    >
                      {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                    </div>
                    <div
                      className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap shadow-2xs ${
                        isUser
                          ? 'bg-teal-700 text-white rounded-tr-xs'
                          : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })}

              {isSending && (
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-xl bg-teal-100 text-teal-800 border border-teal-200 flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5 animate-pulse" />
                  </div>
                  <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-xs px-3.5 py-2.5 text-xs text-slate-500">
                    Menyusun analisis spasial...
                  </div>
                </div>
              )}

              {errorMsg && (
                <div
                  role="alert"
                  className="flex items-start gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div ref={scrollEndRef} />
            </div>

            {/* Quick Starter Prompts */}
            <div className="px-3 py-1.5 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto">
              {quickPrompts.map((qp) => (
                <button
                  key={qp}
                  type="button"
                  disabled={isSending}
                  onClick={() => sendMessage(qp)}
                  className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 rounded-lg border border-slate-200/70 transition-colors whitespace-nowrap shrink-0"
                >
                  {qp}
                </button>
              ))}
            </div>

            {/* Composer Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="p-3 bg-white border-t border-slate-200/80 flex items-center gap-2"
            >
              <input
                type="text"
                aria-label="Tanyakan sesuatu ke Asisten GIS"
                placeholder="Tanya soal visualisasi, script, SWAN, atau Drone..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isSending}
                className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/40"
              />
              <button
                type="submit"
                disabled={isSending || !inputText.trim()}
                aria-label="Kirim pesan"
                className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white transition-colors shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        data-testid="open-gemini-chatbot"
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-teal-800 text-white text-xs font-semibold shadow-lg border border-slate-700/60 transition-colors"
      >
        <MessageSquareText className="w-4 h-4 text-teal-300" />
        {isOpen ? 'Tutup Asisten GIS' : 'Asisten AI GIS'}
      </button>
    </div>
  );
};
