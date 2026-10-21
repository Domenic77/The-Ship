import amqp from "amqplib";

function fliegeZu(ziel: any) {
  fetch("http://192.168.101.10:2009/set_target", {
    method: "POST",
    body: JSON.stringify({ target: ziel })
  });
}

console.log("Fliege zum Treffpunkt (-12514 / -19140)");
fliegeZu({ x: -12514, y: -19140 });

const verbindung = await amqp.connect("amqp://192.168.101.10:2014");
const kanal = await verbindung.createChannel();
const briefkasten = await kanal.assertQueue("");
await kanal.bindQueue(briefkasten.queue, "scanner/detected_objects", "");

console.log("Scanner verbunden, warte auf G-Station 1-1...");

kanal.consume(briefkasten.queue, function (post) {
  const objekte = JSON.parse(post.content.toString());

  for (const objekt of objekte) {
    if (objekt.name === "G-Station 1-1") {
      console.log("G-Station 1-1 bei " + Math.round(objekt.pos.x) + " / " + Math.round(objekt.pos.y) + ", fliege hinterher");
      fliegeZu({ x: objekt.pos.x, y: objekt.pos.y });
    }
  }
});