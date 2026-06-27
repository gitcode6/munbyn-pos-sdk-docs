# MUNBYN POS SDK

> **Hinweis:** Dieses Paket ist ein inoffizielles Community-Projekt und steht in keiner Verbindung zur MUNBYN-Gruppe oder deren Tochtergesellschaften. MUNBYN ist eine eingetragene Marke der jeweiligen Eigentümer.

TypeScript-SDK für MUNBYN POS-80XX Thermodrucker (ESC/POS).  
Unterstützt Netzwerk (TCP), USB und Seriell. Läuft in Node.js ≥ 18.

---

## Installation

```bash
npm install @gitcode6/munbyn-pos-sdk
```

Optionale Transporte:

```bash
npm install usb        # USB-Verbindung
npm install serialport # Seriell-Verbindung
```

---

## Schnellstart

```typescript
import { Printer, NetworkConnection, ReceiptBuilder, CutMode } from "@gitcode6/munbyn-pos-sdk";

const connection = new NetworkConnection("192.168.1.100"); // Port 9100 Standard
const printer    = new Printer(connection);

await printer.open();

const bon = new ReceiptBuilder()
  .initialize()
  .center().bold(true).textLine("Mein Laden").bold(false)
  .left().divider("-", 48)
  .textLine("Kaffee                   2.50 EUR")
  .textLine("Croissant                1.80 EUR")
  .divider("-", 48)
  .right().bold(true).textLine("GESAMT:              4.30 EUR").bold(false)
  .feedLines(3)
  .cut(CutMode.Partial);

await printer.print(bon);
await printer.close();
```

---

## Strukturierter Bon mit InvoiceBuilder

Der `InvoiceBuilder` erweitert den `ReceiptBuilder` um vorgefertigte Blöcke
für Logo, Adresse, Artikeltabelle, Summen, QR-Code und Fußzeile.

```typescript
import {
  Printer, NetworkConnection, InvoiceBuilder,
  CutMode, HriPosition, BarcodeSystem
} from "@gitcode6/munbyn-pos-sdk";
import { Code128Strategy } from "@gitcode6/munbyn-pos-sdk";

const printer = new Printer(new NetworkConnection("192.168.1.100"));
await printer.open();

const b = new InvoiceBuilder({ quantityDisplay: "separate" });

// Logo (async — muss vor der synchronen Kette stehen)
await b.logo("./assets/logo.png");

b.address({
  company:    "Muster GmbH",
  street:     "Hauptstraße 1",
  postalCity: "1010 Wien",
  extra:      "UID: ATU12345678",
})
.separator()
.itemsHeader()
.separator()
.item(1, "Wiener Schnitzel", "14.90 EUR", {
  qty:       2,
  unitPrice: " 7.45 EUR",
  subLines:  [{ label: "- Stammkunden 10%", value: "-1.49 EUR" }],
})
.item(2, "Verlängerter",  " 3.20 EUR")
.item(3, "Mineralwasser", " 2.50 EUR", {
  subLines: [{ label: "Anmerkung: ohne Kohlensäure" }],
})
.separator()
.total("GESAMT:",    "33.11 EUR")
.taxLine("MwSt 10%:", " 3.01 EUR")
.taxLine("MwSt 20%:", " 1.06 EUR")
.separator("=")
.center()
.qrCode("https://meinladen.at/bon/2024-001")
.footer(["Danke für Ihren Besuch!", "www.meinladen.at", "Tel: +43 1 234 5678"])
.feedLines(3)
.cut(CutMode.PartialAfterFeed, 5);

await printer.print(b);
await printer.close();
```

### Mengen-Anzeige

| Option | Ausgabe |
|---|---|
| `"inline"` (Standard) | ` 1  2x Schnitzel          14.90 EUR` |
| `"separate"` | ` 1  Schnitzel             14.90 EUR` + Zeile `    2x à 7.45 EUR` |

Die globale Option wird im Konstruktor gesetzt und kann pro Artikel mit
`item(..., { qtyDisplay: "inline" })` überschrieben werden.

---

## Ohne Hardware testen (BufferConnection)

`BufferConnection` schreibt alle Bytes in den Speicher — kein Drucker nötig.

```typescript
import { Printer, BufferConnection, ReceiptBuilder } from "@gitcode6/munbyn-pos-sdk";

const conn    = new BufferConnection();
const printer = new Printer(conn);

await printer.open();
await printer.print(new ReceiptBuilder().textLine("Test").feed());

const bytes = conn.getBuffer();
console.log(`${bytes.length} Bytes generiert`);
```

---

## Observer: Events abhören

```typescript
import type { PrinterObserver, PrinterEvent } from "@gitcode6/munbyn-pos-sdk";

const observer: PrinterObserver = {
  onEvent(event: PrinterEvent) {
    if (event.type === "written") {
      const { byteCount } = event.data as { byteCount: number };
      console.log(`Gesendet: ${byteCount} Bytes`);
    }
    if (event.type === "error") {
      const { error } = event.data as { error: Error };
      console.error("Druckerfehler:", error.message);
    }
  },
};

const unsub = printer.subscribe(observer);
// ...
unsub(); // Observer wieder entfernen
```

---

## Eigenen Transport implementieren

Jede Verbindungsart (z.B. Bluetooth, WebSocket) lässt sich über
`AbstractConnection` einbinden:

```typescript
import { AbstractConnection } from "@gitcode6/munbyn-pos-sdk";

export class MyTransport extends AbstractConnection {
  protected async _open(): Promise<void> {
    // Verbindung aufbauen
  }

  protected async _write(data: Uint8Array): Promise<void> {
    // Bytes senden
  }

  protected async _close(): Promise<void> {
    // Verbindung trennen
  }

  async read(timeout?: number): Promise<Uint8Array> {
    // Antwort lesen (z.B. für Statusabfragen)
    return new Uint8Array(0);
  }
}

// Verwendung wie NetworkConnection:
const printer = new Printer(new MyTransport());
```

---

## Eigenes ESC/POS-Command

Über `CommandFactory.raw()` oder eine eigene `AbstractCommand`-Implementierung
können beliebige ESC/POS-Sequenzen eingebettet werden:

```typescript
import { AbstractCommand, ReceiptBuilder, CommandFactory } from "@gitcode6/munbyn-pos-sdk";

// Variante A — Raw-Bytes direkt
const builder = new ReceiptBuilder()
  .add(CommandFactory.raw(new Uint8Array([0x1b, 0x40]), "Initialize"))
  .textLine("Hallo");

// Variante B — eigene Command-Klasse
class SetCharSpacingCommand extends AbstractCommand {
  constructor(private readonly n: number) { super(); }
  encode(): Uint8Array { return new Uint8Array([0x1b, 0x20, this.n]); }
}

builder.add(new SetCharSpacingCommand(2)).textLine("Mehr Abstand");
```

---

## Verbindungsarten

| Klasse | Verwendung |
|---|---|
| `NetworkConnection` | Ethernet / WLAN (TCP Port 9100) |
| `UsbConnection` | USB (benötigt `npm install usb`) |
| `SerialConnection` | RS-232 / Seriell (benötigt `npm install serialport`) |
| `BufferConnection` | Tests / Dry-Run ohne Hardware |
