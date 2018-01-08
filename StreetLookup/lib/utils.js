const fs = require('fs');
const yaml = require('js-yaml');

//function parseConfig(file) {
//try {
//  const config = yaml.safeLoad(fs.readFileSync(file));
//  const counties = config.counties;
//  if (undefined === counties) {
//      return undefined;
//  }
//  const ret = [];
//  for (const c in counties) {
//      let dists = [];
//      // console.log("c = " + counties[c].name);
//      const county = counties[c];
//      county.districts.forEach(d => dists.push(d));
//      let zips = [];
//      county.zips.forEach(z => zips.push(z));
//      ret.push({name : county.name,
//                  code : county.code,
//                  districts : dists,
//                  zips : zips});
//  }
//  return ret;
//} catch (e) {
//  console.log(e);
//  return undefined;
//}
//}

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

var zips = [];
var districts = [];

module.exports.loadMapping = function() {
		// load our lookup maps
		const zipFile = './data/finalZ.json';
		zips = parseZipConfig(zipFile);
		const distFile = './data/finalC.json';
		districts = parseCountyConfig(distFile);
		if(undefined === zips || 0 === zips.length ) {
		    console.error("Error in parsing file '" + zipFile.name + "'");
		}
		if(undefined === districts || 0 === districts.length) {
		    console.error("Error in parsing districts from file : '" + distFile.name + "'");
		}
}

module.exports.districtLookup = function(zip, deepLookup) {
    let zipMatch = zips[zip];
    if( undefined === zipMatch ) {
        //console.log( "In districtLookup", "missing match for", zip ); 
        return undefined;
    }
    let distMatch = districts[ zipMatch.district ];
    if( undefined === distMatch ) {
        //console.log( "In districtLookup", "missing match for district", zipMatch ); 
        if( deepLookup ) {
            distMatch = districts[ zipMatch.county + "_all" ];
            return distMatch;
        } else {
            return undefined;
        }
    }
    return distMatch;
}

module.exports.checkDistricts = function() {
	let total=0;
	let notFound=0;
	for(let key in zips) {
	    let dist = module.exports.districtLookup(key);
	    if(undefined === dist) {
	        notFound++;
	    }
	    total++;
	}
	console.log("Total zip lookup : " + total + ", no district found for : " + notFound + " zips");
}

module.exports.countyLookup = function( zip ) {
	let zipMatch = zips[zip]; 
    console.log( "DJ:countyLookup", zip, zipMatch ); 
	if ( undefined === zipMatch ) {
		return undefined; 
	}
	let countyMatch = zipMatch.county;
	return countyMatch; 
}
