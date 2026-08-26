const IP = process.argv[2];
const sleep = () => new Promise(r => setTimeout(r, 1000));

async function request(port: number, path: string, data?: any) {
    return fetch(`http://${IP}:${port}/${path}`, data ? {
        method: "POST",
        body: JSON.stringify(data)
    } : {}).then(r => r.json() as any);
}

async function fly(station: string) {
    await request(2009, "set_target", { target: station });

    while (true) {
        const data = await request(2011, "stations_in_reach");

        if (data.stations[station])
            return data.stations[station];

        await sleep();
    }
}

async function main() {
    const core = (await fly("Core Station")).resources.IRON;
    const azura = (await fly("Azura Station")).resources.IRON;

    const coreBetter =
        azura.sell_price - core.buy_price >
        core.sell_price - azura.buy_price;

    const buyStation = coreBetter ? "Core Station" : "Azura Station";
    const sellStation = coreBetter ? "Azura Station" : "Core Station";
    const price = coreBetter ? core.buy_price : azura.buy_price;

    while (true) {
        await fly(buyStation);

        let hold = (await request(2012, "hold")).hold;
        const missing = hold.hold_size - (hold.resources.IRON || 0);

        if (missing === 0) break;

        const amount = price === 0
            ? missing
            : Math.min(missing, Math.floor(hold.credits / price));

        if (amount > 0)
            await request(2011, "buy",
                { station: buyStation, what: "IRON", amount });

        hold = (await request(2012, "hold")).hold;

        if (hold.resources.IRON === hold.hold_size) break;

        await fly(sellStation);

        await request(2011, "sell", {
            station: sellStation,
            what: "IRON",
            amount: hold.resources.IRON
        });
    }

    await request(2009, "set_target", {
        target: { x: 7000, y: 7000 }
    });
}

main();