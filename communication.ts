import http from "node:http";

const MEINE_STATION = "Elyse Terminal";
const MODUL = "ws://192.168.101.10:2026/api";
const PARTNER = "http://192.168.101.11:5000";
const MEIN_PORT = 5000;

// --- Verbindung zum eigenen Comm-Modul ---
const ws = new WebSocket(MODUL);

ws.onopen = () => {
  console.log("verbunden mit " + MEINE_STATION);
};

ws.onmessage = async (event) => {
  const nachricht = JSON.parse(event.data);
  console.log("Station -> ich:", event.data);

  // An den Partner weiterleiten, mit meiner Station als Absender
  const weiterleitung = { source: MEINE_STATION, msg: nachricht.msg };

  try {
    await fetch(PARTNER, {
      method: "POST",
      body: JSON.stringify(weiterleitung)
    });
  } catch (fehler) {
    console.log("Partner nicht erreichbar");
  }
};

ws.onclose = () => {
  console.log("Verbindung zum Modul verloren");
};

// --- Server für Nachrichten vom Partner ---
const server = http.createServer((anfrage, antwort) => {
  let text = "";

  anfrage.on("data", (stueck) => {
    text = text + stueck;
  });

  anfrage.on("end", () => {
    console.log("Partner -> ich:", text);

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(text);
    } else {
      console.log("Modul nicht verbunden, Nachricht verworfen");
    }

    antwort.end("ok");
  });
});

server.listen(MEIN_PORT);
console.log("höre auf Port " + MEIN_PORT);