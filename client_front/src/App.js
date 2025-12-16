import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Upload, Lock } from 'lucide-react';

const generateStars = (count) =>
  Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: Math.random() * 3 + 1,
    delay: Math.random() * 3,
  }));

export default function CryptoClient() {
  const [serverIp, setServerIp] = useState('localhost');
  const [serverPort, setServerPort] = useState('8080');
  const [stars] = useState(() => generateStars(55));

  const [message, setMessage] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [cipherType, setCipherType] = useState('caesar');
  const [mode, setMode] = useState('ECB');
  const [key, setKey] = useState('3');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [incomingMessages, setIncomingMessages] = useState([]);
  const [rsaPublicKey, setRsaPublicKey] = useState('');
  const [rsaPrivateKey, setRsaPrivateKey] = useState('');
  const [symmetricKey, setSymmetricKey] = useState('');
  const [encryptedKey, setEncryptedKey] = useState('');
  const [rsaStatus, setRsaStatus] = useState('');

  const wsRef = useRef(null);
  const [wsStatus, setWsStatus] = useState('Disconnected');

  const COLOR_PINK = '#f5a3c7';
  const COLOR_ACCENT = '#f9b9d9';
  const COLOR_DARK = '#0f0f12';

  const WS_URL = useMemo(() => `ws://${serverIp}:${serverPort}/ws`, [serverIp, serverPort]);
  const HTTP_URL = useMemo(() => `http://${serverIp}:${serverPort}`, [serverIp, serverPort]);

  useEffect(() => {
    if (wsRef.current) wsRef.current.close();

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ WS Connected');
      setWsStatus('Connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setIncomingMessages((prev) => [
          {
            id: Date.now(),
            encrypted: data.encrypted_message,
            cipher: data.cipher_type,
            key: data.key,
            mode: data.mode || 'ECB',
            original: data.original_message,
            encrypted_key: data.encrypted_key,
            timestamp: new Date().toLocaleString(),
          },
          ...prev,
        ]);
      } catch (err) {
        console.error('WS Broadcast Parse Error:', event.data, err);
        setResponse(`❌ WS Yayınını İşleme Hatası: ${event.data.substring(0, 50)}...`);
      }
    };

    ws.onerror = (err) => {
      console.error('WS Error:', err);
      setWsStatus('Error');
    };

    ws.onclose = () => {
      console.log('⚠️ WS Closed');
      setWsStatus('Disconnected');
      wsRef.current = null;
    };

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [WS_URL]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const text = await file.text();
      setFileContent(text);
      setMessage(text);
    }
  };

  const handleEncryptAndBroadcast = async () => {
    if (!message) return;
    setLoading(true);
    setResponse('');

    try {
      const res = await fetch(`${HTTP_URL}/encrypt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          cipher_type: cipherType,
          key: cipherType === 'caesar' ? parseInt(key) : key,
          mode: cipherType === 'des_manual' ? mode : undefined,
          encrypted_key: encryptedKey || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok)
        setResponse(`✅ HTTP POST başarılı. Şifreli Mesaj: ${data.encrypted_message} (WS broadcast edildi)`);
      else setResponse(`❌ Hata: ${data.detail || 'Bilinmeyen hata'}`);
    } catch (err) {
      setResponse(`❌ Bağlantı Hatası: ${err.message}. Port ve IP adreslerini kontrol edin.`);
    } finally {
      setLoading(false);
    }
  };

  const generateRsaKeys = async () => {
    setRsaStatus('');
    try {
      const res = await fetch(`${HTTP_URL}/rsa/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key_size: 2048 }),
      });
      const data = await res.json();
      if (res.ok) {
        setRsaPrivateKey(data.private_key);
        setRsaPublicKey(data.public_key);
        setRsaStatus('✅ RSA anahtar çifti üretildi.');
      } else {
        setRsaStatus(`⚠️ Hata: ${data.detail || 'Bilinmeyen hata'}`);
      }
    } catch (err) {
      setRsaStatus(`⚠️ Bağlantı hatası: ${err.message}`);
    }
  };

  const wrapSymmetricKey = async () => {
    setRsaStatus('');
    if (!rsaPublicKey || !symmetricKey) {
      setRsaStatus('⚠️ Public key ve simetrik anahtar girilmeli.');
      return;
    }
    try {
      const res = await fetch(`${HTTP_URL}/rsa/wrap-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_key: rsaPublicKey, symmetric_key: symmetricKey }),
      });
      const data = await res.json();
      if (res.ok) {
        setEncryptedKey(data.encrypted_key);
        setRsaStatus('✅ Anahtar sarıldı (RSA-OAEP).');
      } else {
        setRsaStatus(`⚠️ Hata: ${data.detail || 'Bilinmeyen hata'}`);
      }
    } catch (err) {
      setRsaStatus(`⚠️ Bağlantı hatası: ${err.message}`);
    }
  };

  const unwrapSymmetricKey = async () => {
    setRsaStatus('');
    if (!rsaPrivateKey || !encryptedKey) {
      setRsaStatus('⚠️ Private key ve sarılmış anahtar gerekli.');
      return;
    }
    try {
      const res = await fetch(`${HTTP_URL}/rsa/unwrap-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ private_key: rsaPrivateKey, encrypted_key: encryptedKey }),
      });
      const data = await res.json();
      if (res.ok) {
        setSymmetricKey(data.symmetric_key);
        setRsaStatus('✅ Anahtar açıldı.');
      } else {
        setRsaStatus(`⚠️ Hata: ${data.detail || 'Bilinmeyen hata'}`);
      }
    } catch (err) {
      setRsaStatus(`⚠️ Bağlantı hatası: ${err.message}`);
    }
  };

  const loadToInput = (msg) => {
    setMessage(msg.encrypted);
    setCipherType(msg.cipher);
    setKey(String(msg.key));
    if (msg.mode) setMode(msg.mode);
  };

  const getWsStatusColor = () => {
    switch (wsStatus) {
      case 'Connected':
        return 'bg-green-500';
      case 'Disconnected':
        return 'bg-red-500';
      case 'Error':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div style={{ backgroundColor: COLOR_DARK }} className="min-h-screen text-white relative overflow-hidden">
      {/* Animated stars */}
      <div className="fixed inset-0 pointer-events-none">
        {stars.map((star) => (
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
              boxShadow: `0 0 ${star.size * 2}px ${COLOR_PINK}`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }
      `}</style>

      <div className="max-w-6xl mx-auto p-6 relative z-10 space-y-8">
        {/* Header */}
        <div className="text-center mt-6">
          <div className="flex items-center justify-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shadow-[0_10px_40px_rgba(245,163,199,0.25)]">
              <Lock className="w-6 h-6" color={COLOR_PINK} />
            </div>
            <div className="text-left">
              <p className="text-sm uppercase tracking-[0.35em] text-white/50">Broadcast Client</p>
              <h1 className="text-4xl font-black tracking-tight" style={{ color: COLOR_PINK }}>
                Crypto Client
              </h1>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className={`w-3 h-3 rounded-full ${getWsStatusColor()} animate-pulse`} />
            <span className="text-sm text-white/60 font-semibold">WS Durumu: {wsStatus}</span>
          </div>
        </div>

        {/* Top controls */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-5 shadow-lg shadow-pink-500/10 backdrop-blur">
            <p className="text-xs text-white/60 tracking-[0.25em] mb-3">SERVER</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/60 mb-2 block">Sunucu IP</label>
                <input
                  type="text"
                  value={serverIp}
                  onChange={(e) => setServerIp(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white text-gray-900 border border-white/30 focus:outline-none focus:ring-2 focus:ring-pink-300"
                />
              </div>
              <div>
                <label className="text-xs text-white/60 mb-2 block">Port</label>
                <input
                  type="text"
                  value={serverPort}
                  onChange={(e) => setServerPort(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white text-gray-900 border border-white/30 focus:outline-none focus:ring-2 focus:ring-pink-300"
                />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/15 rounded-2xl p-5 shadow-lg shadow-pink-500/10 backdrop-blur">
            <p className="text-xs text-white/60 tracking-[0.25em] mb-3">ÖZET</p>
            <div className="space-y-2 text-sm text-white/80">
              <p>
                <span className="text-white/50">WS URL:</span> <span className="font-mono">{WS_URL}</span>
              </p>
              <p>
                <span className="text-white/50">HTTP URL:</span> <span className="font-mono">{HTTP_URL}</span>
              </p>
              <p>
                <span className="text-white/50">Algoritma:</span>{' '}
                <span style={{ color: COLOR_ACCENT }}>{cipherType}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Cipher + Key */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-lg shadow-pink-500/10 backdrop-blur">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Şifreleme Ayarları</p>
            <div className="text-xs px-3 py-1 rounded-full bg-white/10 text-white/70 border border-white/10">
              Client → Server
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs text-white/60 mb-2 block">Şifreleme Türü</label>
              <select
                value={cipherType}
                onChange={(e) => setCipherType(e.target.value)}
                className="w-full px-4 py-3 bg-white text-gray-900 border border-white/30 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
              >
                <option value="caesar" style={{ color: 'black' }}>Caesar Cipher</option>
                <option value="vigenere" style={{ color: 'black' }}>Vigenere Cipher</option>
                <option value="railfence" style={{ color: 'black' }}>Rail Fence Cipher</option>
                <option value="playfair" style={{ color: 'black' }}>Playfair Cipher</option>
                <option value="route" style={{ color: 'black' }}>Route Cipher</option>
                <option value="des_lib" style={{ color: 'black' }}>DES Cipher (Library)</option>
                <option value="des_manual" style={{ color: 'black' }}>DES Cipher (Manual)</option>
                <option value="aes" style={{ color: 'black' }}>AES Cipher</option>
                <option value="aes_manual" style={{ color: 'black' }}>AES Cipher (Manual)</option>
                <option value="hash" style={{ color: 'black' }}>Hash Cipher</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-white/60 mb-2 block">Anahtar (Key)</label>
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 text-white border border-white/15 focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
            </div>
            {cipherType === 'des_manual' && (
              <div>
                <label className="text-xs text-white/60 mb-2 block">DES Mode</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 text-white border border-white/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300"
                >
                  <option value="ECB" style={{ color: 'black' }}>ECB</option>
                  <option value="CBC" style={{ color: 'black' }}>CBC</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Message + actions */}
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6 shadow-lg shadow-pink-500/10 backdrop-blur">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Mesaj</p>
              <label className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl cursor-pointer text-sm transition">
                <Upload className="w-4 h-4" color={COLOR_PINK} />
                <span>TXT Yükle</span>
                <input type="file" accept=".txt" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
            {fileContent && <p className="text-xs text-white/60 mb-2">✓ Dosya yüklendi</p>}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-4 bg-black/40 border border-white/10 rounded-xl text-white min-h-[160px] focus:outline-none focus:ring-2 focus:ring-pink-300"
              placeholder="Şifrelenecek mesaj..."
            />
          </div>

          <div className="bg-gradient-to-b from-white/10 to-white/5 border border-white/15 rounded-2xl p-6 shadow-lg shadow-pink-500/10 backdrop-blur flex flex-col gap-4 justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/60 mb-3">İşlem</p>
              <p className="text-sm text-white/70 mb-4">Mesajı HTTP ile şifrele ve WS üzerinden broadcast et.</p>
            </div>
            <button
              onClick={handleEncryptAndBroadcast}
              disabled={loading || !message}
              style={{
                background:
                  loading || !message
                    ? 'rgba(255,255,255,0.1)'
                    : `linear-gradient(135deg, ${COLOR_PINK} 0%, ${COLOR_ACCENT} 100%)`,
                boxShadow: loading || !message ? 'none' : `0 15px 40px ${COLOR_PINK}40`,
              }}
              className="w-full text-gray-900 font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition transform hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Şifreleniyor...' : (
                <>
                  <Lock className="w-5 h-5" />
                  Şifrele ve Gönder
                </>
              )}
            </button>
            <div className="flex items-center gap-2 text-xs text-white/50">
              <span className="w-2 h-2 rounded-full bg-white/50" />
              <span>Broadcast edilen mesajlar aşağıda listelenir.</span>
            </div>
          </div>
        </div>

        {/* Response */}
        {response && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-lg shadow-pink-500/10 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60 mb-3">Sonuç</p>
            <div className="bg-black/50 rounded-xl p-4 font-mono text-sm text-white/80 break-all border border-white/10">
              {response}
            </div>
          </div>
        )}

        {/* RSA Key Transport */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-lg shadow-pink-500/10 backdrop-blur">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">RSA Anahtar Taşıma</p>
            <div className="text-xs px-3 py-1 rounded-full bg-white/10 text-white/70 border border-white/10">
              Key Wrap (OAEP)
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-white/60">Public Key (PEM)</label>
                <button
                  onClick={generateRsaKeys}
                  className="text-xs px-3 py-1 bg-white text-gray-900 rounded-lg border border-white/30 hover:bg-white/90"
                >
                  RSA Üret
                </button>
              </div>
              <textarea
                value={rsaPublicKey}
                onChange={(e) => setRsaPublicKey(e.target.value)}
                className="w-full px-3 py-3 bg-black/40 border border-white/10 rounded-lg text-white text-xs min-h-[120px] font-mono"
                placeholder="-----BEGIN PUBLIC KEY-----"
              />
              <label className="text-xs text-white/60">Simetrik Anahtar (AES/DES)</label>
              <input
                value={symmetricKey}
                onChange={(e) => setSymmetricKey(e.target.value)}
                className="w-full px-3 py-3 bg-white/10 text-white border border-white/15 rounded-lg"
                placeholder="ör. my-secret-key"
              />
              <button
                onClick={wrapSymmetricKey}
                className="w-full text-gray-900 font-bold py-3 rounded-lg"
                style={{
                  background: `linear-gradient(135deg, ${COLOR_PINK} 0%, ${COLOR_ACCENT} 100%)`,
                  boxShadow: `0 10px 30px ${COLOR_PINK}40`,
                }}
              >
                Anahtarı Sar (Public)
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-white/60">Private Key (PEM)</label>
              <textarea
                value={rsaPrivateKey}
                onChange={(e) => setRsaPrivateKey(e.target.value)}
                className="w-full px-3 py-3 bg-black/40 border border-white/10 rounded-lg text-white text-xs min-h-[120px] font-mono"
                placeholder="-----BEGIN PRIVATE KEY-----"
              />
              <label className="text-xs text-white/60">Sarılmış Anahtar (Base64)</label>
              <textarea
                value={encryptedKey}
                onChange={(e) => setEncryptedKey(e.target.value)}
                className="w-full px-3 py-3 bg-black/40 border border-white/10 rounded-lg text-white text-xs min-h-[80px] font-mono"
                placeholder="RSA ile sarılmış anahtar"
              />
              <button
                onClick={unwrapSymmetricKey}
                className="w-full text-gray-900 font-bold py-3 rounded-lg"
                style={{
                  background: `linear-gradient(135deg, ${COLOR_ACCENT} 0%, ${COLOR_PINK} 100%)`,
                  boxShadow: `0 10px 30px ${COLOR_PINK}40`,
                }}
              >
                Anahtarı Aç (Private)
              </button>
            </div>
          </div>
          {rsaStatus && (
            <div className="mt-3 text-sm text-white/80 font-mono break-all bg-black/40 border border-white/10 rounded-lg p-3">
              {rsaStatus}
            </div>
          )}
        </div>

        {/* Incoming WS Messages */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-lg shadow-pink-500/10 backdrop-blur">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Gelen Yayınlar (WS)</p>
              <div className="text-xs text-white/50">Tıklayarak formu doldur</div>
            </div>
            {incomingMessages.length === 0 ? (
              <p className="text-white/60">Şifrelenmiş mesaj bekleniyor...</p>
            ) : (
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-2">
                {incomingMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-4 rounded-xl bg-black/30 border border-white/10 hover:border-pink-300/60 cursor-pointer transition"
                    onClick={() => loadToInput(msg)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs uppercase tracking-[0.2em]" style={{ color: COLOR_ACCENT }}>
                        {msg.cipher}
                      </span>
                      <span className="text-xs text-white/50">{msg.timestamp}</span>
                    </div>
                    <p className="text-xs text-white/60 mb-1">Mode: {msg.mode || '-'}</p>
                    <p className="text-xs text-white/60 mb-2">Anahtar: {msg.key}</p>
                    {msg.encrypted_key && (
                      <p className="text-xs text-white/60 mb-2">Sarılmış Anahtar: {msg.encrypted_key}</p>
                    )}
                    <p className="text-sm text-white font-mono break-all">Şifreli: {msg.encrypted}</p>
                    <p className="text-xs text-white/60 mt-1">Orijinal: {msg.original}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
      </div>
    </div>
  );
}
