import * as Minio from "minio";

const SCHIFF = "http://192.168.101.10";
const SENSOR = SCHIFF + ":2043";

async function holen(adresse: string) {
  const antwort = await fetch(adresse);
  return antwort.json();
}

let node = SCHIFF + ":2032";

try {
  const status = await holen(node + "/status");
  if (status.role !== "active") {
    node = SCHIFF + ":2033";
  }
} catch {
  node = SCHIFF + ":2033";
}

const limits = await holen(node + "/limits");
limits.sensor_antimatter = 1;
limits.analyzer_gamma = 1;
await fetch(node + "/limits", { method: "PUT", body: JSON.stringify(limits) });

console.log("⚡ Strom freigegeben bei " + node);

await fetch(SCHIFF + ":2009/set_target", {
  method: "POST",
  body: JSON.stringify({ target: { x: 30957, y: -28933 } })
});

console.log("🚀 Kurs auf Aetherium Rock gesetzt");

const s3 = new Minio.Client({
  endPoint: "192.168.101.10",
  port: 2016,
  useSSL: false,
  accessKey: "theship",
  secretKey: "theship1234"
});

const bucketDa = await s3.bucketExists("analyzer-gamma");
if (bucketDa === false) {
  await s3.makeBucket("analyzer-gamma");
}

console.log("📦 S3-Bucket bereit");

async function messen(achse: string) {
  const antwort = await fetch(SENSOR + "/" + achse + "/measure", { method: "POST" });
  return antwort.json();
}

while (true) {
  const antworten = await Promise.all([messen("x"), messen("y"), messen("z")]);

  for (const antwort of antworten) {
    if (antwort.measurement) {
      await s3.putObject("analyzer-gamma", "data.hex", antwort.measurement);
      console.log("🔬 Hochgeladen: " + antwort.measurement);
    }
  }
}