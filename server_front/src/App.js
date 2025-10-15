import React, { useState, useEffect } from 'react';
import { Unlock, RefreshCw, Server, AlertCircle } from 'lucide-react';

function App() {
  const [messages, setMessages] = useState([]);
  const [encryptedInput, setEncryptedInput] = useState('');
  const [cipherType, setCipherType] = useState('caesar');
  const [key, setKey] = useState('3');
  const [decryptedResult, setDecryptedResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState('offline');
  const [serverUrl, setServerUrl] = useState('http://172.17.8.179:8000');

  useEffect(() => {
    checkServerStatus();
    const interval = setInterval(checkServerStatus, 5000);
    
    // WebSocket bağlantısı
    const ws = new WebSocket('ws://172.17.8.179:8000/ws');
    
    ws.onopen = () => {
      console.log('✅ WebSocket bağlantısı kuruldu!');
    };
    
    ws.onmessage = (event) => {
      console.log('📩 Mesaj alındı:', event.data);
      try {
        const data = JSON.parse(event.data);
        // Gelen şifreli mesajı otomatik doldur
        setEncryptedInput(data.encrypted_message);
        setCipherType(data.cipher_type);
        setKey(data.key.toString());
        
        // Başarı bildirimi
        console.log('✅ Mesaj işlendi:', data);
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
  }, [serverUrl]);

  const checkServerStatus = async () => {
    try {
      const res = await fetch(`${serverUrl}/health`, { method: 'GET' });
      if (res.ok) {
        setServerStatus('online');
      } else {
        setServerStatus('offline');
      }
    } catch {
      setServerStatus('offline');
    }
  };

  const handleDecrypt = async () => {
    if (!encryptedInput) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${serverUrl}/decrypt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          encrypted_message: encryptedInput,
          cipher_type: cipherType,
          key: cipherType === 'caesar' ? parseInt(key) : key
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Server className="w-10 h-10 text-blue-400" />
            <h1 className="text-4xl font-bold text-white">Crypto Server</h1>
          </div>
          <p className="text-blue-200">Şifreli mesajları çözün ve görüntüleyin</p>
        </div>

        {/* Server Status Bar */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 mb-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${serverStatus === 'online' ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              <span className="text-white font-medium">
                Sunucu Durumu: {serverStatus === 'online' ? 'Çevrimiçi' : 'Çevrimdışı'}
              </span>
            </div>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              className="px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="http://172.17.8.179:8000"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Decrypt Panel */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center gap-2 mb-4">
              <Unlock className="w-5 h-5 text-blue-300" />
              <h2 className="text-xl font-semibold text-white">Mesaj Deşifre</h2>
            </div>

            {/* Cipher Settings */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  Şifreleme Türü
                </label>
                <select
                  value={cipherType}
                  onChange={(e) => setCipherType(e.target.value)}
                  className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="caesar" className="bg-indigo-900">Caesar</option>
                  <option value="vigenere" className="bg-indigo-900">Vigenere</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  Anahtar
                </label>
                <input
                  type="text"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder={cipherType === 'caesar' ? '3' : 'KEYWORD'}
                />
              </div>
            </div>

            {/* Encrypted Message Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-blue-200 mb-2">
                Şifreli Mesaj
              </label>
              <textarea
                value={encryptedInput}
                onChange={(e) => setEncryptedInput(e.target.value)}
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[120px] font-mono text-sm"
                placeholder="Şifreli mesajı buraya yapıştırın..."
              />
            </div>

            {/* Decrypt Button */}
            <button
              onClick={handleDecrypt}
              disabled={loading || !encryptedInput || serverStatus === 'offline'}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 disabled:from-gray-500 disabled:to-gray-600 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Çözülüyor...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-5 h-5" />
                  <span>Deşifre Et</span>
                </>
              )}
            </button>

            {/* Decrypted Result */}
            {decryptedResult && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  Çözülmüş Mesaj
                </label>
                <div className="bg-green-500/20 border border-green-400/50 rounded-lg p-4">
                  <p className="text-white font-mono text-sm break-all">{decryptedResult}</p>
                </div>
              </div>
            )}
          </div>

          {/* Message History */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Mesaj Geçmişi</h2>
              <button
                onClick={clearHistory}
                className="flex items-center gap-2 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-400/50 rounded-lg text-red-200 text-sm transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Temizle
              </button>
            </div>

            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-blue-300">
                <AlertCircle className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">Henüz deşifre edilmiş mesaj yok</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {messages.map((msg) => (
                  <div key={msg.id} className="bg-white/10 rounded-lg p-4 border border-white/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-blue-300 uppercase">
                        {msg.cipher} Cipher
                      </span>
                      <span className="text-xs text-blue-200">{msg.timestamp}</span>
                    </div>
                    
                    <div className="mb-3">
                      <p className="text-xs text-blue-300 mb-1">Şifreli:</p>
                      <p className="text-sm text-gray-300 font-mono bg-black/20 rounded p-2 break-all">
                        {msg.encrypted}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-green-300 mb-1">Çözülmüş:</p>
                      <p className="text-sm text-white font-mono bg-green-900/20 rounded p-2 break-all">
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