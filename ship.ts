const IP = "192.168.101.10";
const BUY = "Azura Station";
const SELL = "Core Station";

function warte() {
  return new Promise(r => setTimeout(r, 1000));
}

async function get(port: number, pfad: string) {
  const antwort = await fetch(`http://${IP}:${port}/${pfad}`);
  return await antwort.json() as any;
}

async function post(port: number, pfad: string, daten: object) {
  const antwort = await fetch(`http://${IP}:${port}/${pfad}`, {
    method: "POST",
    body: JSON.stringify(daten)
  });
  return await antwort.json() as any;
}

async function fliegeZu(station: string) {
  await post(2009, "set_target", { target: station });

  while (true) {
    const antwort = await get(2011, "stations_in_reach");
    const gefunden = antwort.stations[station];
    
    if (gefunden) {
      return gefunden;
    }

    await warte();
  }
}

async function ladeRaum() {
  const antwort = await get(2012, "hold");
  return antwort.hold;
}

async function main() {
  while (true) {
    const station = await fliegeZu(BUY);
    const preis = station.resources.IRON.buy_price;

    const vorher = await ladeRaum();
    let menge = vorher.hold_free;

    if (preis > 0) {
      const bezahlbar = Math.floor(vorher.credits / preis);

      if (bezahlbar < menge) {
        menge = bezahlbar;
      }
    }

    if (menge > 0) {
      await post(2011, "buy", { station: BUY, what: "IRON", amount: menge });
    }

    const nachher = await ladeRaum();
    const eisen = nachher.resources.IRON || 0;
    console.log(`Eisen: ${eisen}, Credits: ${nachher.credits}`);

    if (nachher.hold_free === 0) {
      break;
    }

    await fliegeZu(SELL);
    await post(2011, "sell", { station: SELL, what: "IRON", amount: eisen });
  }

  console.log("Laderaum voll, fliege nach Vesta Station");
  await post(2009, "set_target", { target: { x: 7000, y: 7000 } });
}

main();