'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/lib/store';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  "Quel est le meilleur district pour investir ?",
  "Compare le yield de JVC vs Dubai Marina",
  "Quel district a la meilleure liquidité ?",
  "Analyse les risques de Palm Jumeirah",
];

function formatTime(d: Date) {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function AiAnalystPage() {
  const { selectedDistricts, language } = useAppStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, loading]);

  async function handleSend(text?: string) {
    const messageText = (text ?? input).trim();
    if (!messageText || loading) return;

    const userMsg: Message = { role: 'user', content: messageText, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: messageText, language, districts: selectedDistricts }),
      });
      const data = await res.json();
      const assistantMsg: Message = {
        role: 'assistant',
        content: data.answer || "Pas de réponse.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Désolé, une erreur s'est produite. Vérifiez que le backend est démarré et que la clé API est configurée.",
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#F4F6F9', padding: 0 }}>
      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; }
          40% { opacity: 1; }
        }
        .dot { animation: pulse 1.4s ease-in-out infinite; }
        .suggestion-btn:hover { border-color: #1E5FA8!important; color: #1E5FA8!important; }
        .send-input:focus { border-color: #1E5FA8!important; outline: none; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ padding: '24px 32px 16px' }}>
        <div style={{ fontFamily: '"Playfair Display", serif', fontSize: 26, fontWeight: 600, color: '#0A1628' }}>
          AI Analyst
        </div>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#7A90A8', marginTop: 4 }}>
          Posez vos questions sur le marché Dubai · Powered by Claude
        </div>
        <div style={{ width: 40, height: 2, background: '#C9A84C', marginTop: 8 }} />
      </div>

      {/* ── Chat zone ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px 16px' }}>
        {messages.length === 0 ? (
          /* Empty state */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16, background: '#0A1628',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontFamily: '"Playfair Display", serif', fontSize: 28, color: '#C9A84C' }}>?</span>
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 16, fontWeight: 600, color: '#0A1628', marginTop: 16 }}>
              Que voulez-vous savoir sur le marché ?
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#7A90A8', marginTop: 4 }}>
              L'analyste IA a accès aux données de tous les districts sélectionnés
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 24, width: '100%', maxWidth: 520 }}>
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  className="suggestion-btn"
                  onClick={() => handleSend(s)}
                  style={{
                    background: '#FFFFFF', border: '1px solid #D8E2EE', borderRadius: 8,
                    padding: '12px 16px', fontSize: 12, color: '#3D5470',
                    textAlign: 'left', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    transition: 'all 0.15s', lineHeight: 1.4,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Messages */
          <div style={{ paddingTop: 8 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ marginBottom: 16 }}>
                {msg.role === 'user' ? (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div>
                      <div style={{
                        maxWidth: '70%', background: '#0A1628', color: '#FFFFFF',
                        borderRadius: '16px 16px 4px 16px', padding: '12px 16px',
                        fontSize: 13, lineHeight: 1.6, fontFamily: 'Inter, sans-serif',
                      }}>
                        {msg.content}
                      </div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#7A90A8', marginTop: 4, textAlign: 'right' }}>
                        {formatTime(msg.timestamp)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, background: '#0A1628',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
                    }}>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700, color: '#C9A84C' }}>B</span>
                    </div>
                    <div>
                      <div style={{
                        maxWidth: '75%', background: '#FFFFFF', border: '1px solid #D8E2EE',
                        borderRadius: '16px 16px 16px 4px', padding: '14px 18px',
                        fontSize: 13, color: '#0A1628', lineHeight: 1.7,
                        fontFamily: 'Inter, sans-serif',
                        boxShadow: '0 1px 3px rgba(10,22,40,0.06)',
                      }}>
                        {msg.content.split('\n').map((line, li) =>
                          line.trim() === '' ? (
                            <div key={li} style={{ height: 4 }} />
                          ) : (
                            <p key={li} style={{ margin: 0, marginBottom: 8 }}>{line}</p>
                          )
                        )}
                      </div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#7A90A8', marginTop: 4 }}>
                        {formatTime(msg.timestamp)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 10, marginBottom: 16 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, background: '#0A1628',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
                }}>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700, color: '#C9A84C' }}>B</span>
                </div>
                <div style={{
                  background: '#FFFFFF', border: '1px solid #D8E2EE',
                  borderRadius: '16px 16px 16px 4px', padding: '14px 18px',
                  boxShadow: '0 1px 3px rgba(10,22,40,0.06)',
                  display: 'flex', alignItems: 'center', gap: 2,
                }}>
                  {[0, 0.15, 0.3].map((delay, i) => (
                    <span key={i} className="dot" style={{
                      width: 6, height: 6, borderRadius: '50%', background: '#7A90A8',
                      display: 'inline-block', marginRight: 4,
                      animationDelay: `${delay}s`,
                    }} />
                  ))}
                </div>
              </div>
            )}

            <div ref={scrollRef} />
          </div>
        )}
      </div>

      {/* ── Input bar ── */}
      <div style={{ padding: '16px 32px 24px', background: '#F4F6F9', borderTop: '1px solid #D8E2EE', display: 'flex', gap: 10 }}>
        <input
          className="send-input"
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSend(); }}
          placeholder="Posez une question sur le marché Dubai..."
          style={{
            flex: 1, padding: '12px 16px', border: '1px solid #D8E2EE',
            borderRadius: 8, fontSize: 14, fontFamily: 'Inter, sans-serif',
            color: '#0A1628', background: '#FFFFFF',
          }}
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          style={{
            width: 44, height: 44, borderRadius: 8, background: '#0A1628',
            color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
            opacity: !input.trim() || loading ? 0.5 : 1,
            border: 'none', flexShrink: 0, transition: 'opacity 0.15s',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
