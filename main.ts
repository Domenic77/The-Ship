async function getStationsInReach() {
  const response = await fetch("http://192.168.101.10:2011/stations_in_reach");
  const data = await response.json();
  console.log(data);
  return data;
}

getStationsInReach();