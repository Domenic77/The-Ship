const IP = process.argv[2];
const BUY = "Azura Station";   
const SELL = "Core Station";  

const api = (port: number, path: string, body?: object) =>
  fetch(`http://${IP}:${port}/${path}`,
    body ? { method: "POST", body: JSON.stringify(body) } : undefined)
    .then(r => r.json() as any);

async function fly(station: string) {
  await api(2009, "set_target", { target: station });
  let s;
  while (!(s = (await api(2011, "stations_in_reach")).stations[station]))
    await new Promise(r => setTimeout(r, 1000));
  return s;
}

async function main() {
  while (true) {
    const price = (await fly(BUY)).resources.IRON.buy_price;
    let { credits, hold_free } = (await api(2012, "hold")).hold;
    const amount = price ? Math.min(hold_free, Math.floor(credits / price)) : hold_free;
    if (amount > 0) await api(2011, "buy", { station: BUY, what: "IRON", amount });

    const hold = (await api(2012, "hold")).hold;
    if (hold.hold_free === 0) break;

    await fly(SELL);
    await api(2011, "sell", { station: SELL, what: "IRON", amount: hold.resources.IRON });
  }
  await api(2009, "set_target", { target: { x: 7000, y: 7000 } });
}

main();