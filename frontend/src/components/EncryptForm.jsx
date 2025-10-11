// src/components/EncryptForm.jsx
import React, { useState, useRef } from "react";

export default function EncryptForm() {
  const [text, setText] = useState("");
  const [key, setKey] = useState("");
  const [algorithm, setAlgorithm] = useState("Caesar");
  const [mode, setMode] = useState("encrypt");
  const [result, setResult] = useState("");
  const ws = useRef(null);

  const connectWebSocket = () => {
    ws.current = new WebSocket("ws://127.0.0.1:8000/ws");
    ws.current.onopen = () => console.log("Connected to server");
    ws.current.onmessage = (e) => setResult(JSON.parse(e.data).result);
  };

  const sendMessage = () => {
    ws.current.send(JSON.stringify({ text, key, algorithm, mode }));
  };

  return (
    <div style={{ padding: "10px" }}>
      <h1>Client</h1>
      <button onClick={connectWebSocket}>Connect</button>
      <div>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Text" />
        <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="Key" />
      </div>
      <div>
        <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value)}>
          <option>Caesar</option>
          <option>Vigenere</option>
          <option>Playfair</option>
          <option>Route</option>
          <option>RailFence</option>
        </select>
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="encrypt">Encrypt</option>
          <option value="decrypt">Decrypt</option>
        </select>
      </div>
      <button onClick={sendMessage}>Send</button>
      <h3>Result: {result}</h3>
    </div>
  );
}
