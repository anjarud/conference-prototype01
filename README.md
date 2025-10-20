20.10.2025
# Echtzeit-Kommunikationssystem mit WebSockets

Dieses Projekt ist eine einfache WebSocket-basierte Anwendung, die es ermöglicht, 
in Echtzeit Nachrichten zwischen Browsern auszutauschen. Die Anwendung besteht aus 
einem Python-Backend (FastAPI + Uvicorn) und einem einfachen HTML-Frontend (vorerst), 
das in mehreren Browser-Tabs getestet wurde.

## Funktionen bisher

- **Server läuft auf Port 8000**
- **WebSocket-Verbindung** zwischen Browser und Server hergestellt
- **Nachrichten** werden in Echtzeit zwischen mehreren Clients (zwei Browser-Tabs) ausgetauscht
- **Frontend** im Browser getestet (Test-HTML mit Eingabefeld für Raum-ID)
- **Fehlerbehebung** bei Netzwerk-Problemen gelöst

## Setup & Installation

1. **Backend starten:**  
   Stelle sicher, dass dein Virtual Environment aktiv ist, und führe den folgenden Befehl im 
2. Projektordner aus:
- uvicorn app.main:app --reload --port 8000

2. **Frontend starten:**
- Navigiere in deinem Projektordner zu einem Verzeichnis, wo die `test.html` liegt.
- Starte einen einfachen HTTP-Server (z.B. mit Python 3):  
- python -m http.server 8080

3. **Frontend im Browser öffnen:**
- Gehe im Browser zu:  
- http://localhost:8080/test.html
- Es erscheint eine Oberfläche, in der du eine Raum-ID eingeben kannst.

4. **Verbindung herstellen:**
- Gib eine Raum-ID ein (z.B. „raum1“) und klicke auf „Verbinden“.
- Starte bei Bedarf einen zweiten Browser-Tab und verbinde dich mit derselben Raum-ID, 
- um Nachrichten zu senden und zu empfangen.

## Nächste Schritte

- Zugriff auf die Webcam im Browser implementieren
- Video- und Audio-Stream ans Backend senden
- Mehr Funktionen wie Nutzerverwaltung hinzufügen

## Kontakt / Mitwirkende

- [Anja Rudolph]
- Projekt-Repository: https://github.com/anjarud/conference-prototype01

---

**Hinweis:**  
Dieses Projekt ist ein aktueller Stand, der für eine WebSocket-basierte Kommunikation entwickelt wurde. 
Weitere Funktionen und Verbesserungen sind geplant.

---





