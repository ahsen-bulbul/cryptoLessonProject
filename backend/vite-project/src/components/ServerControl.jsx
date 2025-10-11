import React, { useState } from "react";

export default function ServerControl() {
  const [host, setHost] = useState("127.0.0.1");
  const [port, setPort] = useState("8000");
  const [status, setStatus] = useState("Stopped");

  const startServer = async () => {
    try {
      const res = await fetch("http://127.0.0.1:5000/start-backend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host, port }),
      });
      if (res.ok) {
        setStatus("Running");
      } else {
        setStatus("Error");
      }
    } catch (err) {
      console.error(err);
      setStatus("Error");
    }
  };

  return (
    <div>
      <h2>Server Control</h2>
      <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="Host" />
      <input value={port} onChange={(e) => setPort(e.target.value)} placeholder="Port" />
      <button onClick={startServer}>Start Server</button>
      <p>Status: {status}</p>
    </div>
  );
}
