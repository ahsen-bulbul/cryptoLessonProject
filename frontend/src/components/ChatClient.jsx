import React, { useState, useEffect, useRef } from "react";

export default function ChatClient() {
  const [ip, setIp] = useState("localhost");
  const [port, setPort] = useState("8000");
  const [ws, setWs] = useState(null);
  const [text, setText] = useState("");
  const [key, setKey] = useState("");
  const [algorithm, setAlgorithm] = useState("caesar");
  const [mode, setMode] = useState("encrypt");
  const [messages, setMessages] = useState([]);
  const wsRef = useRef(null);

  const connectWebSocket = () => {
    const socket = new WebSocket(`ws://${ip}:${port}/ws`);
    wsRef.current = socket;

    socket.onopen = () => {
      console.log("Connected to server");
      setWs(socket);
    };

    socket.onmessage = (event) => {
      setMessages((prev) => [...prev, `Server: ${event.data}`]);
    };

    socket.onclose = () => console.log("Disconnected from server");
  };

  const sendMessage = () => {
    if (!wsRef.current) return;
    wsRef.current.send(
      JSON.stringify({ text, key, algorithm, mode })
    );
    setMessages((prev) => [...prev, `Client: ${text}`]);
    setText("");
  };

  return (
    <div className="bg-white p-6 rounded shadow w-96">
      <h2 className="text-xl font-bold mb-4">Crypto Client</h2>
      <div className="mb-2">
        <input
          placeholder="Server IP"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          className="border p-1 mr-2"
        />
        <input
          placeholder="Port"
          value={port}
          onChange={(e) => setPort(e.target.value)}
          className="border p-1"
        />
        <button
          onClick={connectWebSocket}
          className="bg-blue-500 text-white px-2 py-1 rounded"
        >
          Connect
        </button>
      </div>
      <div className="mb-2">
        <input
          placeholder="Message"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="border p-1 w-full mb-2"
        />
        <input
          placeholder="Key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="border p-1 w-full mb-2"
        />
        <select
          value={algorithm}
          onChange={(e) => setAlgorithm(e.target.value)}
          className="border p-1 w-full mb-2"
        >
          <option value="caesar">Caesar</option>
          <option value="vigenere">Vigenere</option>
          <option value="playfair">Playfair</option>
          <option value="route">Route</option>
          <option value="railfence">Railfence</option>
        </select>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="border p-1 w-full mb-2"
        >
          <option value="encrypt">Encrypt</option>
          <option value="decrypt">Decrypt</option>
        </select>
        <button
          onClick={sendMessage}
          className="bg-green-500 text-white px-4 py-2 rounded w-full"
        >
          Send
        </button>
      </div>
      <div className="h-40 overflow-auto border p-2">
        {messages.map((msg, idx) => (
          <div key={idx}>{msg}</div>
        ))}
      </div>
    </div>
  );
}
