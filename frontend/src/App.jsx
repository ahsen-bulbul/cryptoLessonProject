import React from "react";
import EncryptForm from "./components/EncryptForm";

function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-center">Crypto App</h1>
        <EncryptForm />
      </div>
    </div>
  );
}

export default App;
