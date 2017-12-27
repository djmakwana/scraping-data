const express = require('express');
const router = express.Router();
const fs = require('fs');
const tableToJSON = require('tabletojson');
const yaml = require('js-yaml');

// function parseConfig(file) {
//     try {
//         const config = yaml.safeLoad(fs.readFileSync(file));
//         const counties = config.counties;
//         if (undefined === counties) {
//             return undefined;
//         }
//         const ret = [];
//         for (const c in counties) {
//             let dists = [];
//             // console.log("c = " + counties[c].name);
//             const county = counties[c];
//             county.districts.forEach(d => dists.push(d));
//             let zips = [];
//             county.zips.forEach(z => zips.push(z));
//             ret.push({name : county.name,
//                         code : county.code,
//                         districts : dists,
//                         zips : zips});
//         }
//         return ret;
//     } catch (e) {
//         console.log(e);
//         return undefined;
//     }
// }

function parseZipConfig(file) {
    try {
        const config = yaml.safeLoad(fs.readFileSync(file));
        const counties = config.counties;
        let found = 0;
        let notFound = 0;
        if (undefined === counties) {
            console.log('zip data file has no counties');
            return undefined;
        }
        const ret = {};
        for (const c in counties) {
            const entry = counties[c];
            const zip = entry.zip;
            const district = entry.district;
            if ( undefined === district ) {
                // console.log("District not found for zip " + zip);
                notFound++;
                continue;
            }
            found++;
            ret[zip] = {zip : zip, district:
                        district.trim().toLowerCase(),
                        city: entry.city.trim().toLowerCase(),
                        county : entry.county.trim().toLowerCase()
            };
        }
        console.log("Total zips :" + (found+notFound) + ", not found : " + notFound);
        return ret;
    } catch (e) {
        console.log(e);
        return undefined;
    }
}

function parseCountyConfig(file) {
    try {
        const config = yaml.safeLoad(fs.readFileSync(file));
        const counties = config.counties;
        let found = 0;
        let notFound = 0;
        if (undefined === counties) {
            console.log('zip data file has no counties');
            return undefined;
        }
        const ret = {};
        for (const c in counties) {
            const entry = counties[c];
            const name = entry._id.trim().toLocaleLowerCase();
            const cc = entry.code;
            const districts = entry.districts;
            if ( undefined === districts ) {
                console.log("District not found for county " + name);
                notFound++;
                continue;
            }
            entry.districts.forEach(c => {
                found++;
                let d = c.name.trim().toLowerCase();
                if( d === 'all') {
                    d = name + '_all';
                }
                ret[d] = {
                    name: d,
                    code: c.code,
                    county: name,
                    cc: cc
                }
            });
        }
        console.log("Total districts :" + (found+notFound) + ", not found : " + notFound);
        return ret;
    } catch (e) {
        console.log(e);
        return undefined;
    }
}

let baseUrl = 'http://tax1.co.monmouth.nj.us/cgi-bin/inf.cgi?&ms_user=monm&passwd=data&srch_type=1&adv=1&out_type=1&ms_ln=1000';

// const file = './data/nj_county.yml';
// const counties = parseConfig(file);
const zipFile = './data/finalZ.json';
const zips = parseZipConfig(zipFile);
const distFile = './data/finalC.json';
const districts = parseCountyConfig(distFile);
//console.log( districts );
//console.log (zips);

if(undefined === zips || 0 === zips.length ) {
    console.error("Error in parsing file '" + zipFile.name + "'");
}
if(undefined === districts || 0 === districts.length) {
    console.error("Error in parsing districts from file : '" + distFile.name + "'");
}


function getJson(url) {
    return new Promise(function (resolve, reject) {
        tableToJSON.convertUrl(
            url,
            { useFirstRowForHeadings: true },
            function(tablesAsJson) {
                let table = tablesAsJson[0];
                let values = [];
                for( const row in table) {
                    if(table[row]['0'] === "") {
                        continue;
                    }
                    let data = table[row];
                    // 5th column is Address
                    // 6th column is Owner
                    values.push( {
                        address: data['5'],
                        name: data['6']
                    });
                }
                resolve(values);
            }
        );
    })
}

function districtLookup(zip, deepLookup) {
    let zipMatch = zips[zip];
    if( undefined === zipMatch ) {
        return undefined;
    }
    let distMatch = districts[ zipMatch.district ];
    if( undefined === distMatch ) {
        if( deepLookup ) {
            distMatch = districts[ zipMatch.county + "_all" ];
            return distMatch;
        } else {
            return undefined;
        }
    }
    return distMatch;
}

let total=0;
let notFound=0;
for(let key in zips) {
    let dist = districtLookup(key);
    if(undefined === dist) {
        notFound++;
    }
    total++;
}
console.log("Total zip lookup : " + total + ", no district found for : " + notFound + " zips");


function getZipResult(zip, streets) {
    return new Promise(function (resolve, reject) {
        if( zip === undefined || streets === undefined) {
            reject({ error: "Missing arguments"});
            return;
        }

        // let zipMatch = zips[zip];
        // if( undefined === zipMatch ) {
        //     reject({error: "No match found for zip '" + zip + "'"});
        //     return;
        // }
        // let distMatch = districts[ zipMatch.district ];
        // if( undefined === distMatch ) {
        //     console.log('District exact match not found for zip ' + zip + ", trying through county");
        //     distMatch = districts[ zipMatch.county + "_all" ];
        //     if( undefined === distMatch ) {
        //         reject({error: "No district found for zip '" + zipMatch.zip + "'"});
        //         return;
        //     }
        // }
        let distMatch = districtLookup(zip);
        if( undefined === distMatch) {
            reject({error: "No district found for zip '" + zip +"'"});
            return;
        }
        // console.log("Found district = " + distMatch.name);

        if( streets.constructor === String) {
            let url = baseUrl + '&district=' + distMatch.code + '&select_cc=' + distMatch.cc + '&p_loc=' + streets;
            getJson(url).then((val) => { resolve(val); }).catch((err) => { reject(err); });
        } else if ( streets.constructor === Array ) {
            let values = [];
            let promises = [];
            for(let s in streets) {
                let url = baseUrl + '&district=' + distMatch.code + '&select_cc=' + distMatch.cc + '&p_loc=' + streets[s];
                promises.push( getJson(url).then((val) => {values.push(val)}).catch() );
            }
            Promise.all(promises).then(function() {
                resolve(values);
            }).catch(function (err) {
                console.log("Some error '" + err.toString() + "'" );
                reject(err);
            });
        }
    })
}

// function getResult(county, zip, streets) {
//     return new Promise(function (resolve, reject) {
//         if( zip === undefined || county === undefined || streets === undefined) {
//             reject({ error: "Missing arguments"});
//             return;
//         }
//
//         let countyMatch = undefined;
//         let match = county.toLowerCase();
//         for(let c in counties) {
//             if ( match === counties[c].name.toLowerCase() ) {
//                 countyMatch = counties[c];
//                 break;
//             }
//         }
//         if( undefined === countyMatch ) {
//             reject({error: "County not found '" + county + "'"});
//             return;
//         }
//         // console.log("Found county = " + countyMatch.name);
//
//         let zipMatch = undefined;
//         match = zip.toLowerCase();
//         for(let z in countyMatch.zips) {
//             if( match === countyMatch.zips[z].code.toLowerCase()) {
//                 zipMatch = countyMatch.zips[z];
//                 break;
//             }
//         }
//         if( undefined === zipMatch ) {
//             reject({error: "No match found for zip '" + zip + "'"});
//             return;
//         }
//         let distMatch = undefined;
//         match = zipMatch.district.toLowerCase();
//         for(let d in countyMatch.districts) {
//             if( match === countyMatch.districts[d].name.toLowerCase()) {
//                 distMatch = countyMatch.districts[d];
//                 break;
//             }
//         }
//         console.log("Found district = " + distMatch.name);
//
//         if( streets.constructor === String) {
//             let url = baseUrl + '&district=' + distMatch.code + '&select_cc=' + countyMatch.code + '&p_loc=' + streets;
//             // console.log(url);
//             getJson(url).then((val) => { resolve(val); }).catch((err) => { reject(err); });
//         } else if ( streets.constructor === Array ) {
//             let values = [];
//             let promises = [];
//             for(let s in streets) {
//                 let url = baseUrl + '&district=' + distMatch.code + '&select_cc=' + countyMatch.code + '&p_loc=' + streets[s];
//                 // console.log(url);
//                 promises.push( getJson(url).then((val) => {values.push(val)}).catch() );
//             }
//             Promise.all(promises).then(function() {
//                 // console.log(values);
//                 resolve(values);
//             }).catch(function (err) {
//                 console.log("Some error '" + err.toString() + "'" );
//                 reject(err);
//             });
//         }
//     })
// }
//
// function getResultWithDistrict(county, district, streets) {
//     return new Promise(function (resolve, reject) {
//         if( district === undefined || county === undefined || streets === undefined) {
//             reject({ error: "Missing arguments"});
//             return;
//         }
//
//         let countyMatch = undefined;
//         for(let c in counties) {
//             if ( county.toLowerCase() === counties[c].name.toLowerCase() ) {
//                 countyMatch = counties[c];
//                 break;
//             }
//         }
//         if( undefined === countyMatch ) {
//             reject({error: "County not found '" + county + "'"});
//             return;
//         }
//         // console.log("Found county = " + countyMatch.name);
//
//         let distMatch = undefined;
//         for(let d in countyMatch.districts ) {
//             if(district.toLowerCase() === countyMatch.districts[d].name.toLowerCase() ) {
//                 distMatch = countyMatch.districts[d];
//                 break;
//             }
//         }
//         if( undefined === distMatch ) {
//             reject({error: "District not found '" + district + "'"});
//             return;
//         }
//         // console.log("Found district = " + distMatch.name);
//
//         if( streets.constructor === String) {
//             url += '&district=' + distMatch.code + '&select_cc=' + countyMatch.code + '&p_loc=' + streets;
//             getJson(url).then((val) => { resolve(val); }).catch((err) => { reject(err); });
//         } else if ( streets.constructor === Array ) {
//             let values = [];
//             let promises = [];
//             for(let s in streets) {
//                 url += '&district=' + distMatch.code + '&select_cc=' + countyMatch.code + '&p_loc=' + streets[s];
//                 // console.log(url);
//                 promises.push( getJson(url).then((val) => {values.push(val)}).catch() );
//             }
//             Promise.all(promises).then(function() {
//                 // console.log(values);
//                 resolve(values);
//             }).catch(function (err) {
//                 console.log("Some error '" + err.toString() + "'" );
//                 reject(err);
//             });
//         }
//     })
// }

router.get('/', function(req, res, next){
    const zip = req.query.zip;
    const street = req.query.street;
    // const district = req.query.district;
    // const county = req.query.county;
    let streets = [];
    streets.push(street);
    getZipResult(zip, streets)
        .then( (val) => { res.send(val); })
        .catch( (error) => {    res.send(error);    });
    // getResult(county, zip, streets)
    //     .then( (val) => { res.send(val); })
    //     .catch( (error) => {    res.send(error);    });
    // console.log("Done !!");
});

module.exports = router;
