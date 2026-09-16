import http from "node:http";
import WebSocket from "ws";

const IP = "192.168.101.11";
const PARTNER = "http://192.168.101.10:5000";
const STATION = "Shangris Station";

let ws: WebSocket;

function warten(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function api(port: number, path: string, data?: any) {
  const response = await fetch(`http://${IP}:${port}${path}`, {
    method: data ? "POST" : "GET",
    headers: data ? { "Content-Type": "application/json" } : undefined,
    body: data ? JSON.stringify(data) : undefined
  });

  return await response.json() as any;
}

async function fliegen() {
  console.log("Fliege zu Shangris...");

  await api(2009, "/set_target", {
    target: { x: 4446, y: 4340 }
  });

  while (true) {
    const response = await api(2011, "/stations_in_reach");

    if (response.stations?.[STATION]) {
      break;
    }

    await warten(1000);
  }

  await api(2009, "/set_target", {
    target: "stop"
  });

  console.log("Shangris erreicht");
}

async function sendeAnPartner(message: any) {
  try {
    await fetch(`${PARTNER}/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(message)
    });

    console.log("Shangris -> Elyse");
  } catch {
    console.log("Partner nicht erreichbar");
  }
}

function verbindeWebSocket() {
  ws = new WebSocket(
    "ws://192.168.101.11:2025/ws"
  );

  ws.on("open", () => {
    console.log("Shangris verbunden");
  });

  ws.on("message", async data => {
    const message = JSON.parse(
      data.toString()
    );

    await sendeAnPartner(message);
  });
}

http.createServer((req, res) => {
  if (
    req.method !== "POST" ||
    req.url !== "/message"
  ) {
    res.statusCode = 404;
    return res.end();
  }

  let body = "";

  req.on("data", chunk => {
    body += chunk;
  });

  req.on("end", () => {
    const message = JSON.parse(body);

    const fuerShangris = {
      source: "Elyse Terminal",
      data: message.msg ?? message.data
    };

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify(fuerShangris)
      );

      console.log("Elyse -> Shangris");
      res.end("ok");
    } else {
      res.statusCode = 503;
      res.end("WebSocket nicht bereit");
    }
  });

}).listen(5000, "0.0.0.0");

async function main() {
  console.log("HTTP Server Port 5000");

  await fliegen();

  verbindeWebSocket();
}

main();