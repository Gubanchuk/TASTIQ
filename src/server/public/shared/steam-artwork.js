// Current store capsules for the apps whose previous Steam image URLs return 404.
const capsules = {
  'steam:1374490': '1374490/d6ad4cd81b88bfe265db77279ccf160594f0ceca/capsule_616x353.jpg?t=1794565381',
  'steam:2427410': '2427410/7df10172386cd2b1b359f36705560c5686e6b203/capsule_616x353.jpg?t=1771270054',
  'steam:3059520': '3059520/111acdc401454a19bc728b030bcc4b49769677e0/capsule_616x353.jpg?t=1786646076',
};

export function steamArtwork(id) {
  return Object.hasOwn(capsules, id)
    ? `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${capsules[id]}`
    : null;
}
