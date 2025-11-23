import React, { useState, useEffect, useMemo } from 'react';
import { Unlock, RefreshCw, Server, AlertCircle } from 'lucide-react';

function App() {
  // STATE'LER
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('8080');
  const [messages, setMessages] = useState([]);
  const [incomingMessages, setIncomingMessages] = useState([]);
  const [encryptedInput, setEncryptedInput] = useState('');
  const [cipherType, setCipherType] = useState('caesar');
  const [mode, setMode] = useState('ECB');
  const [key, setKey] = useState('3');
  const [decryptedResult, setDecryptedResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState('offline');

  // RENKLER
  const COLOR_PINK = '#f0a4caff';
  const COLOR_DARK = '#1a1a1a';
  const COLOR_ACCENT = '#ff1493';

  // URL'LER
  const BASE_HTTP_URL = useMemo(() => `http://${host}:${port}`, [host, port]);
  const BASE_WS_URL = useMemo(() => `ws://${host}:${port}/ws`, [host, port]);

  // YILDIZLAR
  const generateStars = (count) => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 3 + 1,
      delay: Math.random() * 3
    }));
  };

  const [stars] = useState(generateStars(50));

  // SUNUCU DURUMU
  const checkServerStatus = async () => {
    try {
      const res = await fetch(`${BASE_HTTP_URL}/health`, { method: 'GET' });
      if (res.ok) {
        setServerStatus('online');
      } else {
        setServerStatus('offline');
      }
    } catch {
      setServerStatus('offline');
    }
  };

  // WEBSOCKET & HEALTH CHECK
  useEffect(() => {
    checkServerStatus();
    const interval = setInterval(checkServerStatus, 5000);
    
    const ws = new WebSocket(BASE_WS_URL);
    
    ws.onopen = () => {
      console.log('✅ WebSocket bağlantısı kuruldu!');
    };
    
    ws.onmessage = (event) => {
      console.log('📨 Broadcast Mesajı alındı:', event.data);
      try {
        const data = JSON.parse(event.data);
        
        setIncomingMessages(prev => [{
          id: Date.now(),
          encrypted: data.encrypted_message,
          cipher: data.cipher_type,
          key: data.key,
          mode: data.mode || 'ECB',
          original: data.original_message,
          timestamp: new Date().toLocaleString('tr-TR')
        }, ...prev]);
        
        console.log('💾 Mesaj kaydedildi:', data);
      } catch (error) {
        console.error('❌ Mesaj parse hatası:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('❌ WebSocket hatası:', error);
    };
    
    ws.onclose = () => {
      console.log('⚠️ WebSocket bağlantısı kapandı');
    };
    
    return () => {
      clearInterval(interval);
      ws.close();
    };
  }, [BASE_WS_URL, BASE_HTTP_URL]); 

  // DECRYPT FONKSIYONU
  const handleDecrypt = async () => {
    if (!encryptedInput) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${BASE_HTTP_URL}/decrypt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          encrypted_message: encryptedInput,
          cipher_type: cipherType,
          key: cipherType === 'caesar' ? parseInt(key) : key,
          mode: cipherType === 'des_manual' ? mode : undefined
        })
      });

      const data = await res.json();
      
      if (res.ok) {
        setDecryptedResult(data.decrypted_message);
        setMessages(prev => [{
          id: Date.now(),
          encrypted: encryptedInput,
          decrypted: data.decrypted_message,
          cipher: cipherType,
          mode: cipherType === 'des_manual' ? mode : undefined,
          timestamp: new Date().toLocaleString('tr-TR')
        }, ...prev]);
        setEncryptedInput('');
      } else {
        setDecryptedResult(`Hata: ${data.detail || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      setDecryptedResult(`Bağlantı Hatası: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    setMessages([]);
    setDecryptedResult('');
  };

  const clearIncoming = () => {
    setIncomingMessages([]);
  };

  const loadToDecrypt = (msg) => {
    setEncryptedInput(msg.encrypted);
    setCipherType(msg.cipher);
    setKey(String(msg.key));
    if (msg.mode) {
      setMode(msg.mode);
    }
  };

  const getServerStatusColor = () => {
    switch(serverStatus) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-red-500';
      default: return 'bg-yellow-500';
    }
  };

  return (
    <div style={{ backgroundColor: COLOR_DARK }} className="min-h-screen p-6 font-sans text-white relative overflow-hidden">
      {/* Animated Stars */}
      <div className="fixed inset-0 pointer-events-none">
        {stars.map(star => (
          <div
            key={star.id}
            style={{
              position: 'absolute',
              left: star.left,
              top: star.top,
              width: `${star.size}px`,
              height: `${star.size}px`,
              backgroundColor: COLOR_PINK,
              borderRadius: '50%',
              animation: `twinkle ${2 + star.delay}s ease-in-out infinite`,
              animationDelay: `${star.delay}s`,
              boxShadow: `0 0 ${star.size * 2}px ${COLOR_PINK}`
            }}
          />
        ))}
      </div>
      
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }
        
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in-up {
          animation: fadeInUp 1s ease-out;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${COLOR_PINK};
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${COLOR_ACCENT};
        }
      `}</style>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-16 mt-8 animate-fade-in-up">
          <div className="relative">
            <div className="absolute left-0 right-0 top-1/2 h-px bg-gradient-to-r from-transparent via-pink-500 to-transparent opacity-30"></div>
            
            <div className="flex items-center justify-center gap-6 mb-4 relative">
              <div style={{ 
                width: '60px', 
                height: '60px',
                background: `radial-gradient(circle, ${COLOR_PINK} 0%, transparent 70%)`,
                filter: 'blur(20px)',
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)'
              }}></div>
              
              <h1 style={{ 
                color: COLOR_PINK,
                textShadow: `0 0 30px ${COLOR_PINK}, 0 0 60px ${COLOR_PINK}80`
              }} className="text-7xl md:text-9xl font-black tracking-[0.3em] uppercase relative">
                SERVER
              </h1>
            </div>
            
            
            
            <p className="text-2xl font-light tracking-[0.4em] uppercase" style={{ 
              color: '#999',
              textShadow: '0 0 10px rgba(255, 105, 180, 0.3)'
            }}> 
              Broadcast & Decrypt Hub
            </p>
          </div>
        </div>

        {/* Server Status Bar */}
        <div className="bg-white/5 backdrop-blur-xl border border-pink-500/20 rounded-2xl p-6 mb-12 shadow-2xl shadow-pink-500/10 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 shrink-0">
              <div className={`w-4 h-4 rounded-full ${getServerStatusColor()} animate-pulse shadow-lg`} 
                style={{ boxShadow: serverStatus === 'online' ? '0 0 20px #10b981' : '0 0 20px #ef4444' }} />
              <span className="text-white font-bold tracking-[0.2em] text-lg">
                {serverStatus === 'online' ? '● ONLINE' : '○ OFFLINE'}
              </span>
            </div>
            
            <div className="flex gap-3 w-full sm:w-auto p-3 border border-pink-500/30 rounded-xl bg-black/50 backdrop-blur-sm">
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                className="flex-1 px-4 py-2 bg-transparent border-b-2 border-pink-500/30 text-white text-sm focus:outline-none focus:border-pink-500 transition-all placeholder-white/40"
                placeholder="localhost"
                style={{ minWidth: '120px' }}
              />
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className="w-24 px-4 py-2 bg-transparent border-b-2 border-pink-500/30 text-white text-sm focus:outline-none focus:border-pink-500 transition-all placeholder-white/40"
                placeholder="8080"
                min="1024"
                max="65535"
              />
            </div>
          </div>
          <div className="mt-4 text-right">
            <p style={{ color: COLOR_ACCENT }} className="text-xs font-mono tracking-wider opacity-60">
              {BASE_HTTP_URL} • {BASE_WS_URL}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Incoming Messages Panel */}
          <div className="bg-white/5 backdrop-blur-xl border border-pink-500/20 rounded-2xl p-6 shadow-2xl shadow-pink-500/10 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-pink-500/20">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" style={{ boxShadow: '0 0 15px #10b981' }} />
                <h2 className="text-xl font-bold tracking-[0.15em] text-white">INCOMING</h2>
              </div>
              <button
                onClick={clearIncoming}
                style={{ backgroundColor: COLOR_PINK }}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-black text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-lg"
              >
                <RefreshCw className="w-3 h-3" />
                CLEAR
              </button>
            </div>

            {incomingMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-white/40">
                <div className="relative mb-4">
                  <AlertCircle className="w-16 h-16 opacity-20" />
                  <div className="absolute inset-0 blur-xl" style={{ backgroundColor: COLOR_PINK, opacity: 0.1 }}></div>
                </div>
                <p className="text-sm tracking-[0.3em] font-light">AWAITING BROADCAST</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {incomingMessages.map((msg, index) => (
                  <div 
                    key={msg.id} 
                    className="bg-black/40 backdrop-blur-sm border border-pink-500/20 rounded-xl p-4 transition-all duration-300 cursor-pointer hover:border-pink-500 hover:bg-black/60 hover:scale-[1.02] hover:shadow-xl hover:shadow-pink-500/20"
                    onClick={() => loadToDecrypt(msg)}
                    style={{ 
                      animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`
                    }}
                  >
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-pink-500/20">
                      <span style={{ 
                        color: COLOR_PINK,
                        textShadow: `0 0 10px ${COLOR_PINK}50`
                      }} className="text-xs font-bold uppercase tracking-[0.2em]">
                        {msg.cipher}
                      </span>
                      <span className="text-xs text-white/40 font-mono">{msg.timestamp}</span>
                    </div>
                    {msg.mode && (
                      <p className="text-xs text-white/60 font-mono mb-2">Mode: {msg.mode}</p>
                    )}
                    
                    <div className="mb-3">
                      <p className="text-xs text-white/40 mb-2 tracking-wider">KEY</p>
                      <p className="text-sm text-white font-mono bg-black/60 rounded-lg px-3 py-2 select-all break-all border border-pink-500/10">
                        {msg.key}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-white/40 mb-2 tracking-wider">ENCRYPTED</p>
                      <p className="text-sm text-white font-mono bg-black/60 rounded-lg p-3 break-all select-all border border-pink-500/10">
                        {msg.encrypted}
                      </p>
                    </div>

                    <div style={{ 
                      color: COLOR_PINK,
                      borderColor: COLOR_PINK,
                      boxShadow: `0 0 15px ${COLOR_PINK}30`
                    }} className="mt-4 text-xs text-center font-bold tracking-[0.2em] border-2 rounded-full py-2 hover:bg-pink-500 hover:text-black transition-all duration-300">
                      CLICK TO DECRYPT
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Decrypt Panel */}
          <div className="bg-white/5 backdrop-blur-xl border border-pink-500/20 rounded-2xl p-6 shadow-2xl shadow-pink-500/10 lg:col-span-2 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center gap-3 mb-6 pb-3 border-b border-pink-500/20">
              <Unlock style={{ color: COLOR_PINK }} className="w-6 h-6" />
              <h2 className="text-xl font-bold tracking-[0.15em] text-white">DECRYPT</h2>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-white/50 mb-2 tracking-wider">
                  CIPHER TYPE
                </label>
                <select
                  value={cipherType}
                  onChange={(e) => setCipherType(e.target.value)}
                  className="w-full px-4 py-3 bg-black/40 backdrop-blur-sm border border-pink-500/30 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all"
                  style={{ cursor: 'pointer' }}
                >
                  <option value="caesar" style={{ backgroundColor: COLOR_DARK, color: 'black' }}>Caesar Cipher</option>
                  <option value="vigenere" style={{ backgroundColor: COLOR_DARK, color: 'black' }}>Vigenere Cipher</option>
                  <option value="railfence" style={{ backgroundColor: COLOR_DARK, color: 'black' }}>Rail Fence Cipher</option>
                  <option value="playfair" style={{ backgroundColor: COLOR_DARK, color: 'black' }}>Playfair Cipher</option>
                  <option value="route" style={{ backgroundColor: COLOR_DARK, color: 'black' }}>Route Cipher</option>
                  <option value="des_lib" style={{ backgroundColor: COLOR_DARK, color: 'black' }}>DES Cipher (Library)</option>
                  <option value="des_manual" style={{ backgroundColor: COLOR_DARK, color: 'black' }}>DES Cipher (Manual)</option>
                  <option value="aes" style={{ backgroundColor: COLOR_DARK, color: 'black' }}>AES Cipher</option>
                  <option value="aes_manual" style={{ backgroundColor: COLOR_DARK, color: 'black' }}>AES Cipher (Manual)</option>
                  <option value="hash" style={{ backgroundColor: COLOR_DARK, color: 'black' }}>Hash Cipher</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white/50 mb-2 tracking-wider">
                  KEY
                </label>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full px-4 py-3 bg-black/40 backdrop-blur-sm border border-pink-500/30 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all font-mono"
              placeholder={cipherType === 'caesar' ? '3' : 'KEYWORD'}
            />
          </div>
          {cipherType === 'des_manual' && (
            <div>
              <label className="block text-sm font-medium text-white/50 mb-2 tracking-wider">
                MODE (ECB / CBC)
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="w-full px-4 py-3 bg-black/40 backdrop-blur-sm border border-pink-500/30 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all"
                style={{ cursor: 'pointer' }}
              >
                <option value="ECB" style={{ backgroundColor: COLOR_DARK }}>ECB</option>
                <option value="CBC" style={{ backgroundColor: COLOR_DARK }}>CBC</option>
              </select>
            </div>
          )}
        </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-white/50 mb-2 tracking-wider">
                ENCRYPTED MESSAGE
              </label>
              <textarea
                value={encryptedInput}
                onChange={(e) => setEncryptedInput(e.target.value)}
                className="w-full px-4 py-3 bg-black/40 backdrop-blur-sm border border-pink-500/30 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-pink-500 min-h-[120px] font-mono text-sm transition-all resize-none"
                placeholder="Paste encrypted message here..."
              />
            </div>

            <button
              onClick={handleDecrypt}
              disabled={loading || !encryptedInput || serverStatus === 'offline'}
              style={{ 
                background: loading || !encryptedInput || serverStatus === 'offline' 
                  ? '#333' 
                  : `linear-gradient(135deg, ${COLOR_PINK} 0%, ${COLOR_ACCENT} 100%)`,
                boxShadow: loading || !encryptedInput || serverStatus === 'offline'
                  ? 'none'
                  : `0 0 30px ${COLOR_PINK}60, 0 10px 30px rgba(0,0,0,0.3)`
              }}
              className="w-full text-white font-extrabold py-4 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed tracking-[0.2em] text-lg"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>DECRYPTING...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-5 h-5" />
                  <span>DECRYPT NOW</span>
                </>
              )}
            </button>

            {decryptedResult && (
              <div className="mt-6 animate-fade-in-up">
                <label className="block text-sm font-medium text-white/50 mb-2 tracking-wider">
                  DECRYPTED MESSAGE
                </label>
                <div className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 backdrop-blur-sm border-2 border-green-500/40 rounded-xl p-5 shadow-xl" style={{
                  boxShadow: '0 0 30px rgba(16, 185, 129, 0.2)'
                }}>
                  <p className="text-white font-mono text-sm break-all select-all">{decryptedResult}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* History */}
        <div className="mt-12 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
          <div className="bg-white/5 backdrop-blur-xl border border-pink-500/20 rounded-2xl p-6 shadow-2xl shadow-pink-500/10">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-pink-500/20">
              <h2 className="text-xl font-bold tracking-[0.15em] text-white">HISTORY</h2>
              <button
                onClick={clearHistory}
                style={{ backgroundColor: COLOR_PINK }}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-black text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-lg"
              >
                <RefreshCw className="w-3 h-3" />
                CLEAR
              </button>
            </div>

            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-white/40">
                <div className="relative mb-4">
                  <AlertCircle className="w-16 h-16 opacity-20" />
                  <div className="absolute inset-0 blur-xl" style={{ backgroundColor: COLOR_PINK, opacity: 0.1 }}></div>
                </div>
                <p className="text-sm tracking-[0.3em] font-light">NO HISTORY</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {messages.map((msg, index) => (
                  <div key={msg.id} className="bg-black/40 backdrop-blur-sm rounded-xl p-5 border border-pink-500/20 shadow-lg hover:border-pink-500/50 transition-all duration-300"
                    style={{ 
                      animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`
                    }}>
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-pink-500/20">
                      <span style={{ 
                        color: COLOR_PINK,
                        textShadow: `0 0 10px ${COLOR_PINK}50`
                      }} className="text-xs font-bold uppercase tracking-[0.2em]">
                        {msg.cipher}
                      </span>
                      <span className="text-xs text-white/40 font-mono">{msg.timestamp}</span>
                    </div>
                    {msg.mode && (
                      <p className="text-xs text-white/60 font-mono mb-2">Mode: {msg.mode}</p>
                    )}
                    
                    <div className="mb-3">
                      <p className="text-xs text-white/40 mb-2 tracking-wider">ENCRYPTED</p>
                      <p className="text-sm text-white font-mono bg-black/60 rounded-lg p-3 break-all select-all border border-pink-500/10">
                        {msg.encrypted}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-green-400/80 mb-2 tracking-wider">DECRYPTED</p>
                      <p className="text-sm text-white font-mono bg-green-900/20 rounded-lg p-3 break-all select-all border border-green-500/30">
                        {msg.decrypted}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
