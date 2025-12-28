import React, { useState, useEffect, useMemo, useRef } from 'react';
import { encryptLocal } from './local_ciphers';
import { Upload, Lock } from 'lucide-react';

const generateStars = (count) =>
  Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: Math.random() * 3 + 1,
    delay: Math.random() * 3,
  }));
const bytesToBase64 = (bytes) => {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const base64ToBytes = (b64) => {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const pemToArrayBuffer = (pem) => {
  const b64 = pem.replace(/-----(BEGIN|END)[^-]+-----/g, '').replace(/\s+/g, '');
  const bytes = base64ToBytes(b64);
  return bytes.buffer;
};

const rsaWrapWithPublicKey = async (publicKeyPem, symmetricKey) => {
  const keyData = pemToArrayBuffer(publicKeyPem);
  const publicKey = await window.crypto.subtle.importKey(
    'spki',
    keyData,
    { name: 'RSA-OAEP', hash: 'SHA-1' },
    false,
    ['encrypt']
  );
  const plainBytes = new TextEncoder().encode(symmetricKey);
  const encrypted = await window.crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, plainBytes);
  return bytesToBase64(new Uint8Array(encrypted));
};

const eccWrapWithPublicKey = async (publicKeyPem, symmetricKey) => {
  const keyData = pemToArrayBuffer(publicKeyPem);
  const publicKey = await window.crypto.subtle.importKey(
    'spki',
    keyData,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
  const eph = await window.crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const shared = await window.crypto.subtle.deriveBits({ name: 'ECDH', public: publicKey }, eph.privateKey, 256);
  const hkdfKey = await window.crypto.subtle.importKey('raw', shared, 'HKDF', false, ['deriveBits']);
  const derived = await window.crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: new Uint8Array(0) },
    hkdfKey,
    256
  );
  const aesKey = await window.crypto.subtle.importKey('raw', derived, { name: 'AES-GCM' }, false, ['encrypt']);
  const nonce = window.crypto.getRandomValues(new Uint8Array(12));
  const plainBytes = new TextEncoder().encode(symmetricKey);
  const ciphertextWithTag = new Uint8Array(
    await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, plainBytes)
  );
  const tag = ciphertextWithTag.slice(ciphertextWithTag.length - 16);
  const ciphertext = ciphertextWithTag.slice(0, ciphertextWithTag.length - 16);
  const ephSpki = new Uint8Array(await window.crypto.subtle.exportKey('spki', eph.publicKey));
  const payload = {
    ephemeral_pub: bytesToBase64(ephSpki),
    nonce: bytesToBase64(nonce),
    tag: bytesToBase64(tag),
    ciphertext: bytesToBase64(ciphertext),
  };
  return btoa(JSON.stringify(payload));
};

const randomInt = (min, max) => {
  const buf = new Uint32Array(1);
  window.crypto.getRandomValues(buf);
  return min + (buf[0] % (max - min + 1));
};

const gcd = (a, b) => {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
};

const randomFromCharset = (length, charset) => {
  const bytes = new Uint8Array(length);
  window.crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += charset[bytes[i] % charset.length];
  }
  return out;
};

const generateKeyForCipher = (type) => {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  switch ((type || '').toLowerCase()) {
    case 'caesar':
      return String(randomInt(1, 25));
    case 'affine': {
      const coprimes = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25];
      const a = coprimes[randomInt(0, coprimes.length - 1)];
      const b = randomInt(0, 25);
      return `${a},${b}`;
    }
    case 'vigenere':
      return randomFromCharset(6, upper);
    case 'railfence':
      return String(randomInt(2, 6));
    case 'playfair':
      return randomFromCharset(6, upper);
    case 'route':
      return String(randomInt(2, 6));
    case 'substitution': {
      const letters = upper.split('');
      for (let i = letters.length - 1; i > 0; i -= 1) {
        const j = randomInt(0, i);
        const tmp = letters[i];
        letters[i] = letters[j];
        letters[j] = tmp;
      }
      return letters.join('');
    }
    case 'polybius':
      return randomFromCharset(6, upper);
    case 'columnar':
    case 'columnar_transposition':
      return randomFromCharset(6, upper);
    case 'hill': {
      let a = 0;
      let b = 0;
      let c = 0;
      let d = 0;
      let det = 0;
      do {
        a = randomInt(0, 25);
        b = randomInt(0, 25);
        c = randomInt(0, 25);
        d = randomInt(0, 25);
        det = (a * d - b * c) % 26;
      } while (det === 0 || gcd(det, 26) !== 1);
      return `${a},${b},${c},${d}`;
    }
    default:
      return '';
  }
};



export default function CryptoClient() {
  const [serverIp, setServerIp] = useState('localhost');
  const [serverPort, setServerPort] = useState('8080');
  const [useCryptoHttps, setUseCryptoHttps] = useState(false);
  const [rsaServerIp, setRsaServerIp] = useState('localhost');
  const [rsaServerPort, setRsaServerPort] = useState('9090');
  const [useRsaHttps, setUseRsaHttps] = useState(false);
  const [receiverHost, setReceiverHost] = useState('localhost');
  const [receiverPort, setReceiverPort] = useState('8080');
  const [receiverPath, setReceiverPath] = useState('/key-distribution');
  const [useReceiverHttps, setUseReceiverHttps] = useState(false);
  const [stars] = useState(() => generateStars(55));

  const [message, setMessage] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [cipherType, setCipherType] = useState('caesar');
  const [mode, setMode] = useState('ECB');
  const [key, setKey] = useState('3');
  const [keyTransport, setKeyTransport] = useState('plain');
  const [encryptLocation, setEncryptLocation] = useState('local');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [encryptTimeMs, setEncryptTimeMs] = useState(null);
  const [incomingMessages, setIncomingMessages] = useState([]);
  const [decryptEvents, setDecryptEvents] = useState([]);
  const [rsaPublicKey, setRsaPublicKey] = useState('');
  const [symmetricKey, setSymmetricKey] = useState('');
  const [rsaEncryptedKey, setRsaEncryptedKey] = useState('');
  const [rsaStatus, setRsaStatus] = useState('');
  const [eccPublicKey, setEccPublicKey] = useState('');
  const [eccEncryptedKey, setEccEncryptedKey] = useState('');
  const [eccStatus, setEccStatus] = useState('');

  const wsRef = useRef(null);
  const [wsStatus, setWsStatus] = useState('Disconnected');

  const COLOR_PINK = '#f5a3c7';
  const COLOR_ACCENT = '#f9b9d9';
  const COLOR_DARK = '#0f0f12';
  const isSymmetricCipher = ['aes', 'aes_manual', 'des_lib', 'des_manual'].includes(cipherType);

  const WS_URL = useMemo(
    () => `${useCryptoHttps ? 'wss' : 'ws'}://${serverIp}:${serverPort}/ws`,
    [serverIp, serverPort, useCryptoHttps]
  );
  const HTTP_URL = useMemo(
    () => `${useCryptoHttps ? 'https' : 'http'}://${serverIp}:${serverPort}`,
    [serverIp, serverPort, useCryptoHttps]
  );
  const RSA_HTTP_URL = useMemo(
    () => `${useRsaHttps ? 'https' : 'http'}://${rsaServerIp}:${rsaServerPort}`,
    [rsaServerIp, rsaServerPort, useRsaHttps]
  );

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
        if (data.event === 'decrypt_result') {
          setDecryptEvents((prev) => [
            {
              id: Date.now(),
              encrypted: data.encrypted_message,
              decrypted: data.decrypted_message,
              cipher: data.cipher_type,
              mode: data.mode || 'ECB',
              timestamp: new Date().toLocaleString(),
            },
            ...prev,
          ]);
          return;
        }
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
        setResponse(`WS Yayin isleme hatasi: ${event.data.substring(0, 50)}...`);
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

  useEffect(() => {
    const supportsKeyTransport = ['aes', 'aes_manual', 'des_lib', 'des_manual'].includes(cipherType);
    if (!supportsKeyTransport && keyTransport !== 'plain') {
      setKeyTransport('plain');
    }
  }, [cipherType, keyTransport]);

  useEffect(() => {
    if (encryptLocation !== 'local' && keyTransport !== 'plain') {
      setKeyTransport('plain');
    }
  }, [encryptLocation, keyTransport]);

  useEffect(() => {
    const isAes = ['aes', 'aes_manual'].includes(cipherType);
    if (isAes && key && !symmetricKey) {
      setSymmetricKey(key);
    }
  }, [cipherType, key, symmetricKey]);

  useEffect(() => {
    if (!isSymmetricCipher) return;
    if (key && key !== '3') return;
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const length = ['aes', 'aes_manual'].includes(cipherType) ? 16 : 8;
    const bytes = new Uint8Array(length);
    window.crypto.getRandomValues(bytes);
    let nextKey = '';
    for (let i = 0; i < length; i += 1) {
      nextKey += chars[bytes[i] % chars.length];
    }
    setKey(nextKey);
    setSymmetricKey(nextKey);
  }, [cipherType, isSymmetricCipher, key, symmetricKey]);

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
    setEncryptTimeMs(null);
    const startTime = performance.now();

    try {
      const useRsaForCipher = keyTransport === 'rsa' && isSymmetricCipher;
      const useEccForCipher = keyTransport === 'ecc' && isSymmetricCipher;
      const useKeyTransport = useRsaForCipher || useEccForCipher;
      const keyForCipher = useKeyTransport ? symmetricKey : key;

      if (!keyForCipher && cipherType !== 'hash' && cipherType !== 'pigpen') {
        setResponse('Bu sifreleme icin anahtar gerekli.');
        setLoading(false);
        return;
      }

      if (encryptLocation !== 'local') {
        if (useKeyTransport) {
          setResponse('Server sifreleme seciliyken RSA/ECC key transport kullanilamaz. Plain secin.');
          setLoading(false);
          return;
        }
        const res = await fetch(`${HTTP_URL}/encrypt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            cipher_type: cipherType,
            key: cipherType === 'caesar' ? parseInt(keyForCipher, 10) : keyForCipher,
            mode: cipherType === 'des_manual' ? mode : undefined
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setEncryptTimeMs(performance.now() - startTime);
          setResponse(`HTTP POST basarili. Sifreli Mesaj: ${data.encrypted_message} (WS broadcast edildi)`);
        } else {
          setResponse(`Hata: ${data.detail || 'Bilinmeyen hata'}`);
        }
        setLoading(false);
        return;
      }

      let encryptedKeyToSend = useRsaForCipher ? rsaEncryptedKey : eccEncryptedKey;
      if (useKeyTransport && !symmetricKey) {
        setResponse('Simetrik anahtar gerekli. Anahtar tasima icin anahtar girin.');
        setLoading(false);
        return;
      }
      if (useRsaForCipher && !encryptedKeyToSend) {
        encryptedKeyToSend = await wrapSymmetricKey();
      }
      if (useEccForCipher && !encryptedKeyToSend) {
        encryptedKeyToSend = await wrapEccSymmetricKey();
      }
      if (useKeyTransport && !encryptedKeyToSend) {
        setResponse('Anahtar sarma basarisiz. Key dosyasini ve sunucuyu kontrol edin.');
        setLoading(false);
        return;
      }
      let messageToSend = '';
      try {
        messageToSend = encryptLocal(cipherType, message, keyForCipher, mode);
      } catch (err) {
        setResponse(`Yerel sifreleme hatasi: ${err.message}`);
        setLoading(false);
        return;
      }
      const res = await fetch(`${HTTP_URL}/encrypt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageToSend,
          cipher_type: cipherType,
          key: useKeyTransport ? '' : (cipherType === 'caesar' ? parseInt(keyForCipher, 10) : keyForCipher),
          mode: cipherType === 'des_manual' ? mode : undefined,
          encrypted_key: useKeyTransport ? encryptedKeyToSend || undefined : undefined,
          already_encrypted: true,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setEncryptTimeMs(performance.now() - startTime);
        setResponse(`HTTP POST basarili. Sifreli Mesaj: ${data.encrypted_message} (WS broadcast edildi)`);
      } else {
        setResponse(`Hata: ${data.detail || 'Bilinmeyen hata'}`);
      }
    } catch (err) {
      setResponse(`Baglanti Hatasi: ${err.message}. Port ve IP adreslerini kontrol edin.`);
    } finally {
      setLoading(false);
    }
  };

const fetchRsaPublicKey = async () => {
    setRsaStatus('');
    try {
      const res = await fetch(`${RSA_HTTP_URL}/rsa/public-key`);
      const data = await res.json();
      if (res.ok && data.public_key) {
        setRsaPublicKey(data.public_key);
        setRsaStatus('RSA public key alindi.');
        return data.public_key;
      }
      setRsaStatus(`Hata: ${data.detail || 'Bilinmeyen hata'}`);
    } catch (err) {
      setRsaStatus(`Baglanti hatasi: ${err.message}`);
    }
    return '';
  };

  const fetchEccPublicKey = async () => {
    setEccStatus('');
    try {
      const res = await fetch(`${RSA_HTTP_URL}/ecc/public-key`);
      const data = await res.json();
      if (res.ok && data.public_key) {
        setEccPublicKey(data.public_key);
        setEccStatus('ECC public key alindi.');
        return data.public_key;
      }
      setEccStatus(`Hata: ${data.detail || 'Bilinmeyen hata'}`);
    } catch (err) {
      setEccStatus(`Baglanti hatasi: ${err.message}`);
    }
    return '';
  };

  const wrapSymmetricKey = async () => {
    setRsaStatus('');
    if (!symmetricKey) {
      setRsaStatus('Simetrik anahtar girilmeli.');
      return null;
    }
    let publicKey = rsaPublicKey;
    if (!publicKey) {
      publicKey = await fetchRsaPublicKey();
    }
    if (!publicKey) {
      return null;
    }
    try {
      const encrypted = await rsaWrapWithPublicKey(publicKey, symmetricKey);
      setRsaEncryptedKey(encrypted);
      setRsaStatus('Anahtar sarildi (RSA-OAEP) - client side.');
      return encrypted;
    } catch (err) {
      setRsaStatus(`Sarma hatasi: ${err.message}`);
    }
    return null;
  };

  const wrapEccSymmetricKey = async () => {
    setEccStatus('');
    if (!symmetricKey) {
      setEccStatus('Simetrik anahtar girilmeli.');
      return null;
    }
    let publicKey = eccPublicKey;
    if (!publicKey) {
      publicKey = await fetchEccPublicKey();
    }
    if (!publicKey) {
      return null;
    }
    try {
      const encrypted = await eccWrapWithPublicKey(publicKey, symmetricKey);
      setEccEncryptedKey(encrypted);
      setEccStatus('Anahtar sarildi (ECIES) - client side.');
      return encrypted;
    } catch (err) {
      setEccStatus(`Sarma hatasi: ${err.message}`);
    }
    return null;
  };

  const distributeSymmetricKey = async () => {
    const isRsa = keyTransport === 'rsa';
    const isEcc = keyTransport === 'ecc';
    const encryptedKey = isEcc ? eccEncryptedKey : rsaEncryptedKey;
    if (!isRsa && !isEcc) {
      setRsaStatus('Key transport RSA/ECC secilmeli.');
      return;
    }
    if (!encryptedKey) {
      setRsaStatus('Encrypted key gerekli.');
      return;
    }
    try {
      const endpoint = isEcc ? 'ecc/distribute-key' : 'rsa/distribute-key';
      const res = await fetch(`${RSA_HTTP_URL}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          encrypted_key: encryptedKey,
          receiver_host: receiverHost,
          receiver_port: parseInt(receiverPort, 10),
          receiver_path: receiverPath,
          use_https: useReceiverHttps,
          verify_tls: !useReceiverHttps ? true : false,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setRsaStatus(`Key distributed to ${data.delivered_to || 'receiver'}.`);
      } else {
        setRsaStatus(`Error: ${data.detail || 'Unknown error'}`);
      }
    } catch (err) {
      setRsaStatus(`Connection error: ${err.message}`);
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
            <div className="flex items-center gap-2 mt-3">
              <input
                id="client-use-https"
                type="checkbox"
                checked={useCryptoHttps}
                onChange={(e) => setUseCryptoHttps(e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="client-use-https" className="text-xs text-white/60">
                Use HTTPS (wss)
              </label>
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
                <option value="affine" style={{ color: 'black' }}>Affine Cipher</option>
                <option value="substitution" style={{ color: 'black' }}>Substitution Cipher</option>
                <option value="polybius" style={{ color: 'black' }}>Polybius Cipher</option>
                <option value="pigpen" style={{ color: 'black' }}>Pigpen Cipher</option>
                <option value="columnar" style={{ color: 'black' }}>Columnar Transposition</option>
                <option value="hill" style={{ color: 'black' }}>Hill Cipher</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-white/60 mb-2 block">Anahtar (Key)</label>
              <input
                type="text"
                value={key}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setKey(nextValue);
                  if (isSymmetricCipher) {
                    setSymmetricKey(nextValue);
                  }
                }}
                className="w-full px-4 py-3 rounded-xl bg-white/10 text-white border border-white/15 focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
              {!isSymmetricCipher && !['hash', 'pigpen'].includes(cipherType) && (
                <button
                  type="button"
                  onClick={() => setKey(generateKeyForCipher(cipherType))}
                  className="mt-3 text-xs px-3 py-2 bg-white text-gray-900 rounded-lg border border-white/30 hover:bg-white/90"
                >
                  Generate Key
                </button>
              )}
              {cipherType === 'hill' && (
                <p className="text-xs text-white/50 mt-2">Hill key format: 4, 9, or 16 numbers (2x2, 3x3, 4x4).</p>
              )}
            </div>
            {['aes', 'aes_manual', 'des_lib', 'des_manual'].includes(cipherType) && (
              <div>
                <label className="text-xs text-white/60 mb-2 block">Key Transport</label>
                <div className="flex items-center gap-4 text-sm text-white/70">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="key-transport"
                      checked={keyTransport === 'plain'}
                      onChange={() => setKeyTransport('plain')}
                    />
                    Plain
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="key-transport"
                      checked={keyTransport === 'rsa'}
                      onChange={() => setKeyTransport('rsa')}
                    />
                    With RSA
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="key-transport"
                      checked={keyTransport === 'ecc'}
                      onChange={() => setKeyTransport('ecc')}
                    />
                    With ECC
                  </label>
                </div>
              </div>
            )}
            <div>
              <label className="text-xs text-white/60 mb-2 block">Encrypt Location</label>
              <div className="flex items-center gap-4 text-sm text-white/70">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="encrypt-location"
                    checked={encryptLocation === 'local'}
                    onChange={() => setEncryptLocation('local')}
                  />
                  Local
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="encrypt-location"
                    checked={encryptLocation === 'server_post'}
                    onChange={() => setEncryptLocation('server_post')}
                  />
                  Server (POST)
                </label>
              </div>
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
            {encryptTimeMs !== null && (
              <div className="mt-3 text-xs text-white/60 font-mono">
                Encrypt time: {encryptTimeMs.toFixed(2)} ms
              </div>
            )}
          </div>
        )}

        {decryptEvents.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-lg shadow-pink-500/10 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60 mb-3">Decrypt Events</p>
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {decryptEvents.slice(0, 3).map((item) => (
                <div key={item.id} className="bg-black/50 rounded-xl p-3 font-mono text-xs text-white/80 break-all border border-white/10">
                  <div className="text-white/60 mb-1">{item.cipher} | {item.mode} | {item.timestamp}</div>
                  <div>Encrypted: {item.encrypted}</div>
                  <div>Decrypted: {item.decrypted}</div>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* Key Wrap */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-lg shadow-pink-500/10 backdrop-blur">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Key Wrap</p>
            <div className="text-xs px-3 py-1 rounded-full bg-white/10 text-white/70 border border-white/10">
              RSA / ECC
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-white/60 mb-2 block">RSA Server IP</label>
              <input
                type="text"
                value={rsaServerIp}
                onChange={(e) => setRsaServerIp(e.target.value)}
                className="w-full px-3 py-3 rounded-lg bg-white text-gray-900 border border-white/30 focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
            </div>
            <div>
              <label className="text-xs text-white/60 mb-2 block">RSA Server Port</label>
              <input
                type="text"
                value={rsaServerPort}
                onChange={(e) => setRsaServerPort(e.target.value)}
                className="w-full px-3 py-3 rounded-lg bg-white text-gray-900 border border-white/30 focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <input
              id="rsa-server-https"
              type="checkbox"
              checked={useRsaHttps}
              onChange={(e) => setUseRsaHttps(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="rsa-server-https" className="text-xs text-white/60">
              Use HTTPS for RSA server
            </label>
          </div>
          <div className="mb-6">
            <label className="text-xs text-white/60 mb-2 block">Symmetric Key (AES/DES)</label>
            <input
              value={symmetricKey}
              onChange={(e) => {
                const nextValue = e.target.value;
                setSymmetricKey(nextValue);
                if (isSymmetricCipher) {
                  setKey(nextValue);
                }
              }}
              className="w-full px-3 py-3 bg-white/10 text-white border border-white/15 rounded-lg"
              placeholder="or. my-secret-key"
            />
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="text-xs uppercase tracking-[0.25em] text-white/60">RSA</div>
              <button
                onClick={fetchRsaPublicKey}
                className="text-xs px-3 py-2 bg-white text-gray-900 rounded-lg border border-white/30 hover:bg-white/90"
              >
                Fetch Public Key
              </button>
              <button
                onClick={wrapSymmetricKey}
                className="w-full text-gray-900 font-bold py-3 rounded-lg"
                style={{
                  background: `linear-gradient(135deg, ${COLOR_PINK} 0%, ${COLOR_ACCENT} 100%)`,
                  boxShadow: `0 10px 30px ${COLOR_PINK}40`,
                }}
              >
                RSA Wrap (Client)
              </button>
              <label className="text-xs text-white/60">Wrapped Key (Base64)</label>
              <textarea
                value={rsaEncryptedKey}
                onChange={(e) => setRsaEncryptedKey(e.target.value)}
                className="w-full px-3 py-3 bg-black/40 border border-white/10 rounded-lg text-white text-xs min-h-[80px] font-mono"
                placeholder="RSA wrapped key"
              />
              {rsaStatus && (
                <div className="text-sm text-white/80 font-mono break-all bg-black/40 border border-white/10 rounded-lg p-3">
                  {rsaStatus}
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div className="text-xs uppercase tracking-[0.25em] text-white/60">ECC</div>
              <button
                onClick={fetchEccPublicKey}
                className="text-xs px-3 py-2 bg-white text-gray-900 rounded-lg border border-white/30 hover:bg-white/90"
              >
                Fetch Public Key
              </button>
              <button
                onClick={wrapEccSymmetricKey}
                className="w-full text-gray-900 font-bold py-3 rounded-lg"
                style={{
                  background: `linear-gradient(135deg, ${COLOR_PINK} 0%, ${COLOR_ACCENT} 100%)`,
                  boxShadow: `0 10px 30px ${COLOR_PINK}40`,
                }}
              >
                ECC Wrap (Client)
              </button>
              <label className="text-xs text-white/60">Wrapped Key (Base64)</label>
              <textarea
                value={eccEncryptedKey}
                onChange={(e) => setEccEncryptedKey(e.target.value)}
                className="w-full px-3 py-3 bg-black/40 border border-white/10 rounded-lg text-white text-xs min-h-[80px] font-mono"
                placeholder="ECC wrapped key"
              />
              {eccStatus && (
                <div className="text-sm text-white/80 font-mono break-all bg-black/40 border border-white/10 rounded-lg p-3">
                  {eccStatus}
                </div>
              )}
            </div>
          </div>
          <div className="mt-6 border-t border-white/10 pt-5">
            <div className="text-xs uppercase tracking-[0.25em] text-white/60 mb-3">Key Distribution</div>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs text-white/60 mb-2 block">Receiver Host</label>
                <input
                  type="text"
                  value={receiverHost}
                  onChange={(e) => setReceiverHost(e.target.value)}
                  className="w-full px-3 py-3 rounded-lg bg-white text-gray-900 border border-white/30 focus:outline-none focus:ring-2 focus:ring-pink-300"
                />
              </div>
              <div>
                <label className="text-xs text-white/60 mb-2 block">Receiver Port</label>
                <input
                  type="text"
                  value={receiverPort}
                  onChange={(e) => setReceiverPort(e.target.value)}
                  className="w-full px-3 py-3 rounded-lg bg-white text-gray-900 border border-white/30 focus:outline-none focus:ring-2 focus:ring-pink-300"
                />
              </div>
              <div>
                <label className="text-xs text-white/60 mb-2 block">Receiver Path</label>
                <input
                  type="text"
                  value={receiverPath}
                  onChange={(e) => setReceiverPath(e.target.value)}
                  className="w-full px-3 py-3 rounded-lg bg-white text-gray-900 border border-white/30 focus:outline-none focus:ring-2 focus:ring-pink-300"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <input
                id="rsa-use-https"
                type="checkbox"
                checked={useReceiverHttps}
                onChange={(e) => setUseReceiverHttps(e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="rsa-use-https" className="text-xs text-white/60">
                Use HTTPS for receiver
              </label>
            </div>
            <button
              onClick={distributeSymmetricKey}
              className="w-full text-gray-900 font-bold py-3 rounded-lg"
              style={{
                background: `linear-gradient(135deg, ${COLOR_PINK} 0%, ${COLOR_ACCENT} 100%)`,
                boxShadow: `0 10px 30px ${COLOR_PINK}40`,
              }}
            >
              Distribute Key to Receiver (RSA/ECC)
            </button>
          </div>
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
