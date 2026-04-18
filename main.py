import socket
import subprocess
import json
import time
import base64
import os
import google.generativeai as genai

# ================================================================
# CONFIG
# ================================================================
COOLDOWN_IA = 10.0
ultimo_gemini = 0.0

API_KEY        = process.env.API_KEY
ESP32_IP       = "172.20.10.2"
DASHBOARD_IP   = "172.20.10.9"
PORT_RX        = 5005
PORT_TX        = 1234
PORT_DASHBOARD = 1234
FRAME_PATH     = "/tmp/frame.jpg"

genai.configure(api_key=API_KEY)
model = genai.GenerativeModel("gemini-2.5-flash")

# ================================================================
# SOCKETS
# ================================================================
sock_rx = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock_rx.bind(("0.0.0.0", PORT_RX))
sock_rx.settimeout(None)

sock_tx = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock_dashboard = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

# ================================================================
# PROMPT
# ================================================================
PROMPT = """
Actúa como el sistema de procesamiento espacial para un traje háptico de un usuario ciego.
Analiza la imagen y asigna intensidades PWM (0-255) a zonas corporales:

1. Obstáculo ALTO a la IZQUIERDA  -> armL1, armL2 altos
2. Obstáculo ALTO a la DERECHA    -> armR1, armR2 altos
3. Escalones o desniveles BAJOS   -> footL, footR altos
4. Obstáculo FRONTAL directo      -> chest alto
5. alert: 0 (libre) hasta 3 (choque inminente)
6. back: SIEMPRE 0

Devuelve ÚNICAMENTE este JSON:
{"armL1":0,"armL2":0,"armR1":0,"armR2":0,"footL":0,"footR":0,"chest":0,"back":0,"alert":0}
""".strip()

JSON_VACIO = {
    "armL1":0,"armL2":0,"armR1":0,"armR2":0,
    "footL":0,"footR":0,"chest":0,"back":0,"alert":0
}

ultimo_estado_valido = JSON_VACIO.copy()
memoria_pecho = 0

# ================================================================
# FUNCIONES
# ================================================================
def capturar_frame():
    r = subprocess.run(
        ["fswebcam", "--no-banner", "-r", "640x480", "-S", "10", FRAME_PATH],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    )
    return r.returncode == 0 and os.path.exists(FRAME_PATH)

def procesar_con_ia():
    with open(FRAME_PATH, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()

    print("[IA] Enviando imagen...")

    response = model.generate_content([
        PROMPT,
        {"mime_type": "image/jpeg", "data": b64}
    ])

    texto = response.text.strip()

    print("\n[IA RAW]\n", texto, "\n")

    if texto.startswith("```"):
        texto = "\n".join(texto.splitlines()[1:])
        texto = texto.replace("```", "").strip()

    try:
        data = json.loads(texto)
        return data
    except Exception as e:
        print("Error parseando JSON:", e)
        return None

def enviar_pwm(datos, distancia=0):
    msg_esp = json.dumps(datos, separators=(",", ":"))
    sock_tx.sendto(msg_esp.encode(), (ESP32_IP, PORT_TX))

    datos_dash = dict(datos)
    datos_dash["distancia"] = distancia
    msg_dash = json.dumps(datos_dash, separators=(",", ":"))

    try:
        sock_dashboard.sendto(msg_dash.encode(), (DASHBOARD_IP, PORT_DASHBOARD))
    except Exception as e:
        print("[Dashboard ERROR]:", e)

    return msg_esp

# ================================================================
# MAIN
# ================================================================
print("═" * 50)
print("Servidor háptico listo")
print("═" * 50)

try:
    while True:
        datos_rx, origen = sock_rx.recvfrom(1024)
        mensaje = datos_rx.decode().strip()
        hora = time.strftime('%H:%M:%S')

        # ========================================================
        # SCAN
        # ========================================================
        if mensaje.startswith("SCAN"):
            distancia = 0
            if ":" in mensaje:
                try:
                    distancia = int(mensaje.split(":")[1])
                except:
                    pass

            print(f"\n[{hora}] SCAN {distancia}mm")

            if not capturar_frame():
                print("Cámara falló")
                enviar_pwm(JSON_VACIO, distancia)
                continue

            try:
                ahora = time.time()

                # COOLdown
                if False:
                    print("Cooldown activo → usando último estado")
                    enviar_pwm(ultimo_estado_valido, distancia)
                    continue

                ultimo_gemini = ahora

                datos = procesar_con_ia()

                if datos is None:
                    print("Usando último estado válido")
                    enviar_pwm(ultimo_estado_valido, distancia)
                    continue

                # Completar campos faltantes
                for clave in JSON_VACIO:
                    datos.setdefault(clave, 0)

                datos["back"] = 0

                # Lógica de memoria pecho → espalda
                pecho_actual = datos.get("chest", 0)

                if memoria_pecho > 150 and pecho_actual < 50:
                    print("Pulso en espalda")
                    datos["back"] = 200
                    datos["chest"] = 0

                memoria_pecho = pecho_actual

                ultimo_estado_valido = datos.copy()

                enviado = enviar_pwm(datos, distancia)

                print("Enviado ESP32:", enviado)

            except Exception as e:
                print("ERROR IA:", e)
                enviar_pwm(ultimo_estado_valido, distancia)

        # ========================================================
        # CLEAR
        # ========================================================
        elif mensaje == "CLEAR":
            print(f"[{hora}] CLEAR")

            memoria_pecho = 0
            ultimo_estado_valido = JSON_VACIO.copy()

            enviar_pwm(JSON_VACIO, 0)

except KeyboardInterrupt:
    enviar_pwm(JSON_VACIO, 0)
    sock_rx.close()
    sock_tx.close()
    sock_dashboard.close()
    print("\nServidor detenido.")