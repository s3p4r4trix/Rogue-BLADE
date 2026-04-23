# Game Design Konzept: Projekt "Rogue:BLADE" (Mobile / Auto-Battler)

## 1. Kernkonzept & Spielidee
Im Zentrum des Spiels stehen **Smart-Shuriken** – fliegende, drohnenartige Projektil-Waffen in einer dystopischen Cyberpunk-Welt. Das Spiel ist ein strategischer **Mobile-Auto-Battler mit Roguelite-Elementen**. Der Spieler verbringt seine aktive Zeit in einer Untergrund-Werkstatt mit dem Programmieren, Reparieren und Upgraden der Shuriken. Der eigentliche Kampfablauf ist passiv: Der Spieler beobachtet, wie seine Kreationen in prozedural generierten Leveln autonom gegen Feindkonzerne, Gangs und Roboter-Wellen antreten.

## 2. Der Mobile-Gameplay-Loop
Das Spiel ist für kurze "Zwischendurch"-Sessions (Casual) optimiert. Der Loop teilt sich in zwei Phasen:

* **Phase 1: Die Basis (Aktiv - Management & Taktik)**
  * **Routinen bauen:** Ausrüsten von simplen "Wenn-Dann"-Logikblöcken.
  * **Hardware-Tuning:** Anpassen von Motoren, Materialien, Klingen, Energiezellen und Sensoren.
  * **Wartung:** Reparieren von beschädigten Shuriken.
  * **Werkstatt-Management:** Forschung und Interaktion mit NPCs (Hacker, Schwarzmarkt-Mechaniker) für bessere Technologie.

* **Phase 2: Der Run (Passiv - Beobachten & Lernen)**
  * **Pfad-Wahl:** Ähnlich wie in *Slay the Spire* wählt der Spieler den Weg durch das Level (z.B. feindliches Konzerngebäude, verregnete Gassen, Schwarzmarkt).
  * Die Shuriken agieren zu 100% autonom nach den in Phase 1 programmierten Routinen.
  * **Lern-Effekt:** Der Spieler analysiert Fehler in seiner Logik und passt diese nach dem Run an.

## 3. Das Software-System (Die Routinen für Mobile)
Das **Slot-basierte Gambits-System** ist die Kernmechanik.

* **Trigger (WENN):** z.B. "Feindliches Projektil in Reichweite", "Gegner-Schild > 0", "Gegner hat Status: Markiert", "Eigener Status: Unentdeckt".
* **Aktion (DANN):** z.B. "Parieren", "Ramm-Angriff auf Schild", "Schutzformation um Charakter", "Hinterhalt-Angriff".
* **Prioritäten:** Die Reihenfolge der Slots bestimmt die Wichtigkeit der Aktionen.

## 4. Wirtschaft & Shuriken-Verwaltung
* **Startbedingung:** Der Spieler beginnt mit einem rudimentären Shuriken.
* **Skalierung:** Im Spielverlauf wird ein ganzer Drohnen-Schwarm aufgebaut.
* **Verschleiß & Reparatur:** Shuriken nehmen im Level Schaden. Nach einem Run gibt es zwei Wege:
  * **Passiv (Zeit):** Naniten setzen den Shuriken über Zeit wieder langsam instand.
  * **Aktiv (Ressource):** Der Spieler investiert Credits in eine Polymerlösung zur Sofort-Reparatur.

## 5. Das Hardware-System (Upgrades)

### 5.1 Anti-Grav Motoren
* **Geschwindigkeit:** Maximale Fluggeschwindigkeit.
* **Stealth (Akustik):** Reduziert Betriebsgeräusche und Wärmesignatur.
* **Energiebedarf:** Laufender Stromverbrauch.
* **Fluxkompensator:** Ermöglicht Ausweichmanöver.

### 5.2 Korpusmaterialien
* **Stufe I:** Sinter-Scrap, Plastistahl, Poly-Titan.
* **Stufe II:** Durastahl, Tritanium, Kineto-Graphen (Reaktiv-Metall).
* **Stufe III:** Null-Feld-Stahl, Neutronium-Guss, Adamant-Quanten-Gitter, Singularitäts-Matrix.

### 5.3 Energiezellen
* **Betriebsdauer:** Maximale Kapazität.
* **Regeneration:** Ladegeschwindigkeit im Kampf.
* **Maximale Energieabgabe:** Nötig für Burst-Manöver.

### 5.4 Semi-AI (Primitiv)
* **IFF:** Freund-Feind-Erkennung.
* **Reaktions-Boni:** Verringert Latenz der Routinen-Ausführung.
* **Schwarm-Kommunikation:** Erlaubt Koordination zwischen Shuriken.

### 5.5 Sensoren
* **Biosensoren:** Erfassen organische Ziele.
* **EM-Sensor:** Detektiert Energiefelder und Schilde.
* **Radar:** Klassische Allround-Überwachung.
* **Lidar:** Präzise optische Zielerfassung.
* **Terahertz:** Durchdringt physische Hindernisse (Wände).

### 5.6 Klingen & Schneiden
* **Klassisch:** Solider Basis-Schnittschaden.
* **Stumpf / Hammer:** Kinetischer Schaden gegen schwere Panzerung.
* **Vibro-Klinge:** Hochfrequente Sägebewegung gegen mittlere Rüstung.
* **Monofilament:** Ignoriert Rüstung fast vollständig, sehr fragil.
* **Energie/Plasma:** Hocheffektiv gegen Schilde, hoher Energieverbrauch.

## 6. Gegner-Design & Kontermechaniken
* **EMP-Grenadiere:** Zwingen zu EM-Härtung oder Abfang-Routinen.
* **Schildträger:** Erfordern Schildbrecher-Klingen.
* **Hacker-Drohnen:** Manipulieren Routinen-Prioritäten.
* **Sniper:** Erfordern Leibwächter-Verhalten.

## 7. Die Werkstatt (Meta-Progression)
* **Reparatur-Deck:** NPC-Mechaniker (Ripperdocs) verbessern Naniten-Effizienz.
* **Serverraum:** Netrunner schalten neue Gambit-Slots frei.
* **Genesis-Kammer:** Forschungslabor für neue Materialien und Legierungen.

## 8. Setting & Art Direction
* **Stil:** "Used Future" Cyberpunk. Dunkler Schmutz trifft auf Neon.
* **Design:** High-Tech Drohnen mit sichtbaren Platinen und Plasma-Leuchten.

## 9. Monetarisierung
* **Skins:** Neon-Discs, Chrom-Räder, Kreissägen.
* **Trails:** Leuchtspuren der Antriebe.
* **Customization:** Dekorationen für den Underground-Hub.
