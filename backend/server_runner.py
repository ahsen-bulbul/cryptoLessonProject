import subprocess
import os

def start_backend(host, port):
    backend_dir = os.path.dirname(__file__)
    subprocess.Popen(
        ["uvicorn", "backend.main:app", "--host", host, "--port", str(port)],
        cwd=os.path.dirname(backend_dir)  # Proje kök dizininde çalıştır
    )
