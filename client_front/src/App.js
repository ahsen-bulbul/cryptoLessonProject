import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Upload, Lock } from 'lucide-react';

export default function CryptoClient() {
  const [serverIp, setServerIp] = useState('localhost');
  const [serverPort, setServerPort] = useState('8080'); 
  
  // WS IP ve Port ayarları HTTP ile aynı varsayılacak, sadece HTTP ayarları tutulacak
  const [message, setMessage] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [cipherType, setCipherType] = useState('caesar');
  const [key, setKey] = useState('3');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [incomingMessages, setIncomingMessages] = useState([]);
  
  const wsRef = useRef(null); 
  const [wsStatus, setWsStatus] = useState('Disconnected');

  // URL'ler
  // WS URL'si için HTTP ayarları kullanılıyor
  const WS_URL = useMemo(() => `ws://${serverIp}:${serverPort}/ws`, [serverIp, serverPort]);
  const HTTP_URL = useMemo(() => `http://${serverIp}:${serverPort}`, [serverIp, serverPort]);

  // WebSocket bağlantısı (Sadece Broadcast almak için tutulur)
  useEffect(() => {
    // Mevcut bağlantı varsa kapat
    if (wsRef.current) {
        wsRef.current.close();
    }

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws; // Nesneyi useRef'e kaydet

    ws.onopen = () => {
      console.log('✅ WS Connected');
      setWsStatus('Connected');
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setIncomingMessages(prev => [{
          id: Date.now(),
          encrypted: data.encrypted_message,
          cipher: data.cipher_type,
          key: data.key,
          original: data.original_message,
          timestamp: new Date().toLocaleString()
        }, ...prev]);
      } catch (err) {
        // Ham mesaj (WS üzerinden gönderme kaldırıldığı için bu artık beklenmiyor, 
        // ancak hata mesajını görmeye devam edebiliriz.
        console.error('WS Broadcast Parse Error or unexpected Plain Text:', event.data, err); 
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

    // Temizleme fonksiyonu
    return () => {
        if (wsRef.current) {
            wsRef.current.close();
        }
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

  // Mesajı HTTP POST üzerinden gönderir (Broadcast'ı tetikler)
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
          key: cipherType === 'caesar' ? parseInt(key) : key
        })
      });
      const data = await res.json();
      if (res.ok) setResponse(`✅ HTTP POST başarılı. Şifreli Mesaj: ${data.encrypted_message} (WS üzerinden broadcast edildi)`);
      else setResponse(`❌ Hata: ${data.detail || 'Bilinmeyen hata'}`);
    } catch (err) {
      setResponse(`❌ Bağlantı Hatası: ${err.message}. Port ve IP adreslerini kontrol edin.`);
    } finally {
      setLoading(false);
    }
  };

  const loadToInput = (msg) => {
    setMessage(msg.encrypted);
    setCipherType(msg.cipher);
    setKey(String(msg.key));
  };

  const getWsStatusColor = () => {
      switch(wsStatus) {
          case 'Connected': return 'text-green-400';
          case 'Disconnected': return 'text-red-400';
          case 'Error': return 'text-yellow-400';
          default: return 'text-gray-400';
      }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Lock className="w-10 h-10 text-pink-400" />
            <h1 className="text-4xl font-bold text-white">Crypto Client</h1>
          </div>
          <p className="text-pink-200">Mesajlarınızı şifreleyin ve güvenli gönderin</p>
          <p className={`text-sm font-semibold mt-1 ${getWsStatusColor()}`}>
              WS Broadcast Alıcı Durumu: {wsStatus}
          </p>
        </div>

        {/* Server Settings (Sadece HTTP/WS temel ayarları kaldı) */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className='md:col-span-2'>
            <label className="block text-sm font-medium text-pink-200 mb-2">Sunucu IP (HTTP & WS)</label>
            <input type="text" value={serverIp} onChange={(e)=>setServerIp(e.target.value)}
              className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-400" />
          </div>
          <div className='md:col-span-2'>
            <label className="block text-sm font-medium text-pink-200 mb-2">Port (HTTP & WS)</label>
            <input type="text" value={serverPort} onChange={(e)=>setServerPort(e.target.value)}
              className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-400" />
          </div>
        </div>

        {/* Cipher Settings */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-pink-200 mb-2">Şifreleme Türü</label>
            <select value={cipherType} onChange={(e)=>setCipherType(e.target.value)}
              className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white">
              <option value="caesar">Caesar Cipher</option>
              <option value="vigenere">Vigenere Cipher</option>
              <option value="railfence">Rail Fence Cipher</option>
              <option value="playfair">Playfair Cipher</option>
              <option value="route">Route Cipher</option>
              <option value="hash">Hash Cipher</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-pink-200 mb-2">Anahtar (Key)</label>
            <input type="text" value={key} onChange={(e)=>setKey(e.target.value)}
              className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white" />
          </div>
        </div>

        {/* Message Input */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
          <label className="flex items-center gap-2 px-4 py-2 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-400/50 rounded-lg cursor-pointer w-fit">
            <Upload className="w-5 h-5 text-pink-300" /> TXT Dosyası Yükle
            <input type="file" accept=".txt" onChange={handleFileUpload} className="hidden" />
          </label>
          {fileContent && <p className="text-pink-200 text-sm mt-2">✓ Dosya yüklendi</p>}
          <textarea value={message} onChange={(e)=>setMessage(e.target.value)}
            className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white min-h-[120px] mt-2"
            placeholder="Şifrelenecek mesaj..." />
        </div>

        {/* Send Button (Sadece HTTP kaldı) */}
        <button onClick={handleEncryptAndBroadcast} disabled={loading || !message}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-3">
          {loading ? 'Şifreleniyor...' : <><Lock className="w-5 h-5" /> Şifrele ve Gönder</>}
        </button>


        {/* Response */}
        {response && (
          <div className="mt-6 bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-3">Sonuç</h3>
            <div className="bg-black/30 rounded-lg p-4 font-mono text-sm text-pink-100 break-all">
              {response}
            </div>
          </div>
        )}

        {/* Incoming WS Messages */}
        <div className="mt-6 bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-3">Gelen Yayınlar (WS)</h3>
          {incomingMessages.length === 0 ? (
            <p className="text-pink-200">Şifrelenmiş mesaj bekleniyor...</p>
          ) : (
            incomingMessages.map(msg => (
              <div key={msg.id} className="mb-2 p-2 bg-purple-500/20 rounded cursor-pointer"
                    onClick={()=>loadToInput(msg)}>
                <p className="text-sm text-white font-mono break-all">Şifreli: {msg.encrypted}</p>
                <p className="text-xs text-purple-200">Tip: {msg.cipher} | Anahtar: {msg.key} | {msg.timestamp}</p>
                <p className="text-xs text-purple-200">Orijinal: {msg.original}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
