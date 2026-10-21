import { MongoClient } from "mongodb";
import { setTimeout as warten } from "node:timers/promises";

const SCHIFF = "http://192.168.101.10";
const SENSOR = SCHIFF + ":2037";

async function holen(adresse: string) {
  const antwort = await fetch(adresse);
  return antwort.json();
}

// 1. Strom freigeben, beim aktiven Node
let node = SCHIFF + ":2032";
const status = await holen(node + "/status");

if (status.role !== "active") {
  node = SCHIFF + ":2033";
}

const limits = await holen(node + "/limits");
limits.sensor_void_energy = 1;
limits.shield_generator = 1;
await fetch(node + "/limits", { method: "PUT", body: JSON.stringify(limits) });

console.log("⚡ Strom freigegeben bei " + node);

// Kurs auf Relief Station
await fetch(SCHIFF + ":2009/set_target", {
  method: "POST",
  body: JSON.stringify({ target: { x: 150000, y: 150000 } })
});

console.log("🚀 Kurs auf Relief Station gesetzt");

// 2. Mit der Datenbank verbinden
const datenbank = new MongoClient("mongodb://theship:theship1234@192.168.101.10:2021/theshipdb");
const sammlung = datenbank.db().collection("vacuum-energy");

// 3. Endlos: messen, speichern, aufraeumen
while (true) {
  const id = "messung_" + Date.now();
  await fetch(SENSOR + "/trigger_measurement", { method: "POST", body: JSON.stringify({ request_id: id }) });

  let messung = await holen(SENSOR + "/measurements/" + id);
  while (messung.state !== "measured") {
    await warten(500);
    messung = await holen(SENSOR + "/measurements/" + id);
  }

  await sammlung.replaceOne({}, { data: messung.result }, { upsert: true });
  await fetch(SENSOR + "/measurements/" + id, { method: "DELETE" });

  console.log("🛡️  Schild versorgt: " + messung.result);
}