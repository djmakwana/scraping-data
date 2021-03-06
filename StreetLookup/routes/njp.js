const express = require('express');
const router = express.Router();
const request = require('request');
const cheerio = require('cheerio');
const yaml = require('js-yaml');
const fs = require('fs');
var utils = require('../lib/utils'); 
// for dumping objects
//const util = require('util')

const baseurl = "https://njparcels.com/search/address/?s=$STREET$&s_co=$COUNTY$"

// values for "s_co" parameter 
const njp_countyCodes = {
	"ALL_NJ": 		"##",
	"ATLANTIC": 	"01",
	"BERGEN": 		"02",
	"BURLINGTON": 	"03",
	"CAMDEN": 		"04",
	"CAPE MAY": 	"05",
	"CUMBERLAND": 	"06",
	"ESSEX": 		"07",
	"GLOUCESTER": 	"08",
	"HUDSON": 		"09",
	"HUNTERDON": 	"10",
	"MERCER": 		"11",
	"MIDDLESEX": 	"12",
	"MONMOUTH": 	"13",
	"MORRIS": 		"14",
	// OCEAN is missing in monmouth tax db
	"OCEAN": 		"15",
	"PASSAIC": 		"16",
	"SALEM": 		"17",
	"SOMERSET": 	"18",
	"SUSSEX": 		"19",
	"UNION": 		"20",
	"WARREN": 		"21"
}

//function countyLookup( zip ) {
//	let zipMatch = utils.zips[zip]; 
//    console.log( "DJ:countyLookup", zip, zipMatch ); 
//	if ( undefined === zipMatch ) {
//		return undefined; 
//	}
//	let countyMatch = zipMatch.county;
//	return countyMatch; 
//}

function getOwners( url ) {
	console.log( url );
	return new Promise( function( resolve, reject ) {
		request( url, function( error, resp, html ) {
			if ( error ) {
				reject( error ); 
				return; 
			}
			if ( undefined === html ) {
				reject({error: "No response received and no error code. Timeout?" });
				return; 
			}
			console.log( "Got back: ", resp && resp.statusCode ); 
			var $ = cheerio.load( html );
			var owners = []; 
			$('#main > div:nth-child(1) > div.col-md-8 > table > tbody > tr').filter( function() {
				var owner = $(this).find('td:nth-child(3) > a').text();
				//console.log( owner ); 
				var address = $(this).find('td:nth-child(2) > a').text();
				$(this).find('td:nth-child(2) > div.listing_sub > br').replaceWith(' ');
				var a2 = $(this).find('td:nth-child(2) > div.listing_sub').text();
				address += " " + a2; 
				//console.log( address );
				owners.push({
					address: address,
					name: owner
				});
			})
			resolve( owners ); 
		})
	});
}

function getZipResult(zip, streets) {
    //console.log( "DJ: in getZipResult", zip, streets ); 
	return new Promise( function( resolve, reject) {
	    //console.log( "DJ: inside Promise", zip, streets ); 
        if( zip === undefined || streets === undefined) {
            reject({ error: "Missing arguments"});
            return;
        }
        
        let countyMatch = utils.countyLookup( zip ); 
        if ( undefined === countyMatch ) {
        	reject({error: "No county found for zip '" + zip + "'"});
        	return; 
        }
	    //console.log( "DJ: found county", countyMatch ); 
        
        countyMatch = countyMatch.toUpperCase();
        let countyCode = njp_countyCodes[countyMatch]; 
        if ( undefined === countyCode ) {
        	reject({error: "No mapping country code found for '" + countyMatch + "'"});
        	return; 
        }
	    //console.log( "DJ: my function2 ", zip, streets, countyCode ); 
        if ( streets.constructor === String ) {
        	let url = baseurl.replace('$STREET$', streets ).replace('$COUNTY$', countyCode );
        	getOwners( url )
        		.then( (val) => { resolve(val); })
        		.catch( (err) => { reject(err); }); 
        }
        else if ( streets.constructor === Array ) {
        	let values = [];
        	let promises = [];
        	for (i=0,l=streets.length; i<l; i++) {
        		var s = streets[i]; 
            	let url = baseurl.replace('$STREET$', s ).replace('$COUNTY$', countyCode );
        		console.log( "DJ: street", s, "url", url );
        		promises.push( getOwners( url )
        							.then( (val) => { values.push(val)})
        							.catch( (err) => { reject(err); })
        		)
        	}
        	Promise.all( promises )
        		.then( function() {
        			resolve( values ); 
        		})
        		.catch( function(err) {
        			console.error( "Some error", err ); 
        			reject( err ); 
        		});
        }
        else {
        	console.log( "Got streets", streets.constructor ); 
        }
	})
}

//function parseZipConfig(file) {
//    try {
//        const config = yaml.safeLoad(fs.readFileSync(file));
//        const counties = config.counties;
//        let found = 0;
//        let notFound = 0;
//        if (undefined === counties) {
//            console.log('zip data file has no counties');
//            return undefined;
//        }
//        const ret = {};
//        for (const c in counties) {
//            const entry = counties[c];
//            const zip = entry.zip;
//            const district = entry.district;
//            if ( undefined === district ) {
//                // console.log("District not found for zip " + zip);
//                notFound++;
//                continue;
//            }
//            found++;
//            ret[zip] = {zip : zip, district:
//                        district.trim().toLowerCase(),
//                        city: entry.city.trim().toLowerCase(),
//                        county : entry.county.trim().toLowerCase()
//            };
//        }
//        console.log("Total zips :" + (found+notFound) + ", not found : " + notFound);
//        return ret;
//    } catch (e) {
//        console.log(e);
//        return undefined;
//    }
//}


//var utils = require('./lib/utils'); 
//const zipFile = './data/finalZ.json';
//const zips = parseZipConfig(zipFile);

//getZipResult('08648', 'vaccaro')
//	.then( (val) => { 
//		//console.log( util.inspect(val, false, null));
//	})
//	.catch( (error) => {    console.error(error);    });


router.get('/', function(req, res, next){
    const zip = req.query.zip;
    const street = req.query.street;
    let streets = [];
    streets.push(street);
    getZipResult(zip, streets)
        .then( (val) => { res.send(val); })
        .catch( (error) => {    res.send(error);    });
    console.log("DJ Done !!");
});

module.exports = router;

