from flask import Flask, request, jsonify
from flask_cors import CORS
from backend.server_runner import start_backend

app = Flask(__name__)
CORS(app)  # 👈 Bu satır çok önemli

@app.route("/start-backend", methods=["POST"])
def start_backend_endpoint():
    data = request.json
    host = data.get("host", "127.0.0.1")
    port = data.get("port", 8000)
    start_backend(host, port)
    return jsonify({"status": "started"}), 200

if __name__ == "__main__":
    app.run(port=5000)
