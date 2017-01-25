'use strict';

const fs = require('fs');
const xml2js = require('xml2js').parseString;

let dir = `${__dirname}/data/`;
let ep = fs.readdirSync(dir).reduce((arr, file) => {
  xml2js(fs.readFileSync(dir + file), (err, dom) => {
    dom.Dataset.ElevPt.forEach(pt => {
      let [lat, lon] = pt.pos[0]['gml:Point'][0]['gml:pos'][0].split(' ');
      arr.push({
        latitude: +lat,
        longitude: +lon,
        altitude: +pt.alti[0],
      });
    });
  });
  return arr;
}, []);

fs.writeFileSync(`${__dirname}/html/data.json`, JSON.stringify(ep));
