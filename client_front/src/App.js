import React, { useState } from 'react';
import { Send, Upload, Settings, Lock } from 'lucide-react';

export default function CryptoClient() {
  const [serverIp, setServerIp] = useState('localhost');
  const [serverPort, setServerPort] = useState('8000');
  const [message, setMessage] = useState('');
  const [cipherType, setCipherType] = useState('caesar');
  const [key, setKey] = useState('3');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileContent, setFileContent] = useState('');

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const text = await file.text();
      setFileContent(text);
      setMessage(text);
    }
  };

  const handleEncryptAndSend = async () => {
    setLoading(true);
    setResponse('');
    
    try {
      const url = `http://${serverIp}:${serverPort}/encrypt`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          cipher_type: cipherType,
          key: cipherType === 'caesar' ? parseInt(key) : key
        })
      });

      const data = await res.json();
      
      if (res.ok) {
        setResponse(`✅ Şifreli Mesaj: ${data.encrypted_message}`);
      } else {
        setResponse(`❌ Hata: ${data.detail || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      setResponse(`❌ Bağlantı Hatası: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

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
        </div>

        {/* Server Settings Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-pink-300" />
            <h2 className="text-xl font-semibold text-white">Sunucu Ayarları</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-pink-200 mb-2">
                Server IP
              </label>
              <input
                type="text"
                value={serverIp}
                onChange={(e) => setServerIp(e.target.value)}
                className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-pink-200/50 focus:outline-none focus:ring-2 focus:ring-pink-400"
                placeholder="localhost"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-pink-200 mb-2">
                Port
              </label>
              <input
                type="text"
                value={serverPort}
                onChange={(e) => setServerPort(e.target.value)}
                className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-pink-200/50 focus:outline-none focus:ring-2 focus:ring-pink-400"
                placeholder="8000"
              />
            </div>
          </div>
        </div>

        {/* Cipher Settings Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
          <h2 className="text-xl font-semibold text-white mb-4">Şifreleme Ayarları</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-pink-200 mb-2">
                Şifreleme Türü
              </label>
              <select
                value={cipherType}
                onChange={(e) => setCipherType(e.target.value)}
                className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-400"
              >
                <option value="caesar" className="bg-purple-900">Caesar Cipher</option>
                <option value="vigenere" className="bg-purple-900">Vigenere Cipher</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-pink-200 mb-2">
                Anahtar (Key)
              </label>
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-pink-200/50 focus:outline-none focus:ring-2 focus:ring-pink-400"
                placeholder={cipherType === 'caesar' ? '3' : 'KEYWORD'}
              />
            </div>
          </div>
        </div>

        {/* Message Input Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
          <h2 className="text-xl font-semibold text-white mb-4">Mesaj</h2>
          
          <div className="mb-4">
            <label className="flex items-center gap-2 px-4 py-2 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-400/50 rounded-lg cursor-pointer transition-colors w-fit">
              <Upload className="w-5 h-5 text-pink-300" />
              <span className="text-pink-200 font-medium">TXT Dosyası Yükle</span>
              <input
                type="file"
                accept=".txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            {fileContent && (
              <p className="text-pink-200 text-sm mt-2">✓ Dosya yüklendi</p>
            )}
          </div>
          
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-pink-200/50 focus:outline-none focus:ring-2 focus:ring-pink-400 min-h-[150px]"
            placeholder="Şifrelenecek mesajınızı buraya yazın..."
          />
        </div>

        {/* Send Button */}
        <button
          onClick={handleEncryptAndSend}
          disabled={loading || !message}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 disabled:from-gray-500 disabled:to-gray-600 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed shadow-lg"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Gönderiliyor...</span>
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span>Şifrele ve Gönder</span>
            </>
          )}
        </button>

        {/* Response Card */}
        {response && (
          <div className="mt-6 bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-3">Sonuç</h3>
            <div className="bg-black/30 rounded-lg p-4 font-mono text-sm text-pink-100 break-all">
              {response}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}