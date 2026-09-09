import http from "node:http";
import WebSocket from "ws";

const IP = "192.168.101.11";
const MEINE_STATION = "Shangris Station";
const MODUL = "ws://192.168.101.11:2025/ws";
const PARTNER = "http://192.168.101.10:5000";
const MEIN_PORT = 5000;

let ws: WebSocket;
let takt: NodeJS.Timeout;

async function fliegeZurStation() {
  await fetch(`http://${IP}:2009/set_target`, {
    method: "POST",
    body: JSON.stringify({ target: MEINE_STATION })
  });
  console.log("fliege zu " + MEINE_STATION);
}

function zeigePosition() {
  setInterval(async () => {
    const antwort = await fetch(`http://${IP}:2010/pos`);
    const daten = await antwort.json() as any;
    console.log(`Position: ${daten.pos.x} / ${daten.pos.y}`);
  }, 10000);
}

function verbinde() {
  ws = new WebSocket(MODUL);

  ws.onopen = () => {
    console.log("verbunden mit " + MEINE_STATION);

    takt = setInterval(() => {
      const start = { source: MEINE_STATION, data: [1, 2, 3] };
      console.log("ich -> Station:", JSON.stringify(start));
      ws.send(JSON.stringify(start));
    }, 3000);
  };

  ws.onmessage = async (event) => {
    const nachricht = JSON.parse(event.data);
    console.log("Station -> ich:", event.data);

    // Shangris nennt das Feld "data", Domenics Seite erwartet "msg"
    const weiterleitung = { source: MEINE_STATION, msg: nachricht.data };

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
    console.log("noch nicht in Reichweite, neuer Versuch in 5s");
    clearInterval(takt);
    setTimeout(verbinde, 5000);
  };

  ws.onerror = () => {
    // Fehler fuehrt immer zu onclose, dort wird neu verbunden
  };
}

const server = http.createServer((anfrage, antwort) => {
  let text = "";

  anfrage.on("data", (stueck) => {
    text = text + stueck;
  });

  anfrage.on("end", () => {
    console.log("Partner -> ich:", text);

    // Domenics "msg" zurueck auf "data" fuer Shangris
    const vonPartner = JSON.parse(text);
    const fuerModul = { source: vonPartner.source, data: vonPartner.msg };

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(fuerModul));
    } else {
      console.log("Modul nicht verbunden, Nachricht verworfen");
    }

    antwort.end("ok");
  });
});

server.listen(MEIN_PORT);
console.log("höre auf Port " + MEIN_PORT);

fliegeZurStation();
zeigePosition();
verbinde();