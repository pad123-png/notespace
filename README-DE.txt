NOTESPACE – OFFLINE-PWA
=======================

Dateien:
- index.html: App-Oberfläche
- styles.css: Gestaltung
- app.js: Zeichenfunktionen, Seiten, Speichern
- manifest.webmanifest: Installationsinfos
- sw.js: Offline-Cache
- icons/: App-Symbole

WICHTIG:
Eine Service Worker Offline-PWA kann nicht direkt per file:// geöffnet werden.
Sie muss einmal über HTTPS oder localhost geladen werden. Danach kann sie offline starten.
Notizen werden lokal im Browser auf jedem Gerät getrennt gespeichert.

SCHNELLSTER WEG: GITHUB PAGES (kostenlos)
1. Entpacke NoteSpace-PWA.zip auf dem PC.
2. Melde dich bei GitHub an und erstelle ein neues Repository, z. B. "notespace".
3. Lade alle Dateien und den Ordner "icons" hoch. index.html muss im Hauptordner liegen.
4. Öffne im Repository Settings -> Pages.
5. Unter Build and deployment wähle "Deploy from a branch", Branch "main", Ordner "/ (root)", dann Save.
6. Warte, bis GitHub Pages eine HTTPS-Adresse anzeigt.
7. Öffne diese Adresse einmal auf dem PC und einmal auf dem iPad. Warte, bis die App geladen ist.
8. Auf dem iPad in Safari: Teilen -> Zum Home-Bildschirm -> Hinzufügen.
9. Öffne NoteSpace vom Home-Bildschirm. Nach dem ersten erfolgreichen Laden sollte die App offline funktionieren.

iPAD:
- Öffne die HTTPS-Adresse zuerst in Safari, während du Internet hast.
- Füge sie zum Home-Bildschirm hinzu.
- Starte NoteSpace einmal online, bevor du offline gehst.
- Mit Apple Pencil schreiben; Fingerberührungen werden als Zeichnen ignoriert.
- iPadOS und Browser können sich je nach Version unterschiedlich verhalten. Teste den Pencil vor dem Unterricht.
- Lokale Browserdaten können durch Löschen von Website-Daten verloren gehen. Exportiere wichtige Seiten als PNG.

WINDOWS:
- Öffne dieselbe HTTPS-Adresse in Edge oder Chrome.
- Über das Installieren-Symbol in der Adressleiste bzw. Menü "App installieren" hinzufügen.
- Für die Offline-Nutzung die App einmal online öffnen.

EINSCHRÄNKUNGEN:
- Die Notizen synchronisieren nicht automatisch zwischen Geräten.
- Speichern erfolgt lokal im Browser über localStorage; sehr große Notizbücher können den Speicher füllen.
- Offline-Verfügbarkeit gilt für die App-Dateien, nachdem sie einmal online geladen wurden.
- Das Google Fonts Stylesheet kann offline nicht nachgeladen werden; die App verwendet dann eine Systemschrift.
