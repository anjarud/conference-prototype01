# Echtzeit-Kommunikationssystem mit WebSockets und WebRTC

Dieses Projekt ist eine einfache WebSocket-basierte Anwendung, die es ermöglicht,  
in Echtzeit Nachrichten und Video-Audio-Daten zwischen Browsern auszutauschen. Die Anwendung besteht aus  
einem Python-Backend (FastAPI + Uvicorn) und einem React-Frontend, das in mehreren Browser-Tabs bzw. verschiedenen Browsern getestet wurde.

## Funktionen bisher

- **Server läuft auf Port 8000** (Backend)
- **WebSocket-Verbindung** zwischen Browser und Server hergestellt
- **Nachrichten** werden in Echtzeit zwischen mehreren Clients (zwei Browser-Tabs oder verschiedene Endgeräte) ausgetauscht
- **React-Frontend** im Browser getestet (mit Eingabefeldern für Raum-ID und Client-IDs)
- **Zugriff auf die Webcam** und Echtzeit-Videostream im Frontend implementiert
- **Fehlerbehebung** bei Netzwerk-Problemen und WebRTC-Setup gelöst
- **Dynamische Clientslisten**, die es jedem Client erlauben auszuhandeln, wer das erste WebRTC-Offer sendet, ohne harte IP- oder ID-Codierungen
- **Verbesserte WebSocket-CORS-Konfiguration** für mehrere Geräte im lokalen Netz

## Setup & Installation

1. **Backend starten:**  
   Stelle sicher, dass dein Virtual Environment aktiv ist, und führe im Projektordner den folgenden Befehl aus:
    - `uvicorn app.main:app --reload --port 8000`
    - Das Backend läuft dann unter `http://localhost:8000`.

   > **Wichtig:** Für den Betrieb mit HTTPS und WebRTC sind eigene SSL-Zertifikate notwendig (z. B. `cert.pem` und `key.pem`). Diese müssen lokal erstellt und in den projektrelevanten Ordnern gespeichert werden. Öffentliche Zertifikate bitte nicht in das Git-Repository hochladen!

2. **Frontend starten:**  
   Navigiere in den Ordner deines React-Frontends (wo die `package.json` liegt) und starte den React-Entwicklungsserver:
    - `npm start`
    - Das Frontend ist dann unter `http://localhost:3000` erreichbar und öffnet sich automatisch im Browser.

3. **Frontend im Browser öffnen:**  
   Im Browser öffnest du automatisch `http://localhost:3000`.  
   Dort gibst du eine Raum-ID sowie deine Client- und Peer-IDs ein.

4. **[Troubleshooting: Test auf zwei Geräten]**
    - Gib die gewünschte Raum-ID ein (z.B. „raum1“).
    - Gib deine Client-ID (z.B. „1“) und die Peer-Client-ID (z.B. „2“) ein.
    - Klicke auf „Verbinden“.
    - Öffne ggf. einen zweiten Browser-Tab oder ein zweites Gerät mit denselben Rauminformationen und vertauschten Client-IDs, um die Peer-to-Peer-Verbindung zu testen.
    - **Hinweis:** Lokale Tests auf nur einem Gerät mit mehreren Tabs können wegen Kamera-Zugriffsbegrenzungen kein Remote-Video anzeigen. Für verlässliche Tests empfiehlt sich ein zweites physisches Gerät.

5. **Docker-Variante:**
    - Du kannst Backend und Frontend auch mit Docker und Docker Compose starten:
      ```
      docker-compose down          # Stoppt alle laufenden Container
      docker-compose up --build    # Baut Images neu und startet Backend (Port 8000) und Frontend (Port 3000)
      ```
    - Danach ist das Backend unter `http://localhost:8000` und das Frontend unter `http://localhost:3000` verfügbar (bei Test auf einem Endgerät).
    - Diese Variante erleichtert den Betrieb besonders in Entwicklungs- und Testumgebungen.

## Backend-CORS Einstellung

- Im Backend in `main.py` wurde die CORS-Konfiguration für `origins` angepasst:

origins = [
"http://0.0.0.0:3000",
"http://0.0.0.0:8080",
"http://0.0.0.0:8000"
]


- Dies erlaubt es mehreren Clients in verschiedenen Netzwerkkontexten (z.B. auf verschiedenen Geräten im lokalen Netz), den Server ohne CORS-Blockaden zu erreichen.

## Hinweise

- Backend und Frontend laufen auf verschiedenen Ports (`8000` für Backend, `3000` für Frontend) und kommunizieren per WebSocket.
- WebSocket-URL im Frontend wird dynamisch mit `window.location.hostname` gebildet, um statische IPs zu vermeiden.
- WebRTC Streams werden peer-to-peer übertragen, das Backend dient lediglich zur Signalisierung.
- Bitte lege eigene SSL-Zertifikate (Eigenzertifikate) an und speichere sie nicht im öffentlichen Repository!

## README-Aktualisierungen am 22.10.2025

- Einführung der dynamischen Clientslisten-Aushandlung für WebRTC Offer
- Verbesserte CORS-Konfiguration für lokalen Mehrgerätebetrieb
- Trennung von Streamstart und Angebotsaushandlung im React-Frontend
- Integration von Fehlerbehandlung und sauberen Hooks im Frontend
- Erinnerung und Anleitung zur Einbindung eigener SSL-Zertifikate
- `.gitignore` konfiguriert zum Ausschluss sensibler Dateien wie Zertifikate und Umgebungsvariablen

## Nächste Schritte

- Absicherung mit Authentifizierung und Autorisierung
- Nutzung von TURN-Servern für NAT-Traversal
- UI-Verbesserung für Media-Steuerung (Mikrofon/Kamera an/aus)
- Automatisierte Tests für Verbindung und Stream-Qualität

---

## Kontakt / Mitwirkende

- Anja Rudolph
- Projekt-Repository: [https://github.com/anjarud/conference-prototype01](https://github.com/anjarud/conference-prototype01)

---

**Hinweis:**  
Dieses Projekt ist ein aktueller Stand, der für eine WebSocket- und WebRTC-basierte Echtzeit-Kommunikation mit React und FastAPI entwickelt wurde. Weitere Funktionen und Verbesserungen sind geplant.

  
