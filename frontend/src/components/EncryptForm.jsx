import React, { useState } from "react";
import axios from "axios";

const EncryptForm = () => {
  const [text, setText] = useState("");
  const [key, setKey] = useState("");
  const [method, setMethod] = useState("caesar");
  const [result, setResult] = useState("");

  const handleEncrypt = async () => {
    try {
      const res = await axios.post("http://127.0.0.1:8000/crypto", {
        text: text,
        key: key,
        algorithm: method,
        mode: "encrypt"
      });
      setResult(res.data.result);
    } catch (err) {
      console.error(err);
      setResult("Error connecting to backend");
    }
  };

  const handleDecrypt = async () => {
    try {
      const res = await axios.post("http://127.0.0.1:8000/crypto", {
        text: text,
        key: key,
        algorithm: method,
        mode: "decrypt"
      });
      setResult(res.data.result);
    } catch (err) {
      console.error(err);
      setResult("Error connecting to backend");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block mb-1 font-semibold">Text:</label>
        <input
          type="text"
          className="w-full border px-2 py-1 rounded"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      <div>
        <label className="block mb-1 font-semibold">Key:</label>
        <input
          type="text"
          className="w-full border px-2 py-1 rounded"
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
      </div>
      <div>
        <label className="block mb-1 font-semibold">Method:</label>
        <select
        className="w-full border px-2 py-1 rounded"
        value={method}
        onChange={(e) => setMethod(e.target.value)}
        >
        <option value="caesar">Caesar</option>
        <option value="vigenere">Vigenère</option>
        <option value="playfair">Playfair</option>
        <option value="route">Route Cipher</option>
        <option value="railfence">Rail Fence</option>
        </select>

      </div>
      <div className="flex space-x-2">
        <button
          onClick={handleEncrypt}
          className="flex-1 bg-blue-500 text-white py-1 rounded hover:bg-blue-600"
        >
          Encrypt
        </button>
        <button
          onClick={handleDecrypt}
          className="flex-1 bg-green-500 text-white py-1 rounded hover:bg-green-600"
        >
          Decrypt
        </button>
      </div>
      <div>
        <label className="block mb-1 font-semibold">Result:</label>
        <textarea
          className="w-full border px-2 py-1 rounded"
          value={result}
          readOnly
        />
      </div>
    </div>
  );
};

export default EncryptForm;
