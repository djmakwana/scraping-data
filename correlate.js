var request = require('request');
var cheerio = require('cheerio');
var tableToJSON = require('tabletojson'); 
var fs = require('fs');
const MongoClient = require('mongodb').MongoClient;

// Connection URL
const url = 'mongodb://localhost:27017';

// Database Name
const dbName = 'folderData';

MongoClient.connect(url, function(err, client) {
	console.log("Connected successfully to server");

	const db = client.db(dbName);
	const counties = db.collection("counties"); 
	const zips = db.collection("zips"); 

	findZipRecords( db, "08554", function( docs ) {
		var zipRec = docs[0]; 
		console.log( zipRec.zip ); 
		getDistrictForZip( zipRec.zip ).then( function( distName ) {
			console.log( "Success found ", distName, "for", zipRec.zip ); 
			// zips.update({zip:zipRec.zip}, {$set: {"district": distName }}, function( err, res ) {
			// 	if ( !err ) {
			// 		console.log( "Updated" ); 
			// 	}
			// })
		});
	});



	client.close();
});

// const lookupDistrict = function( db, zips, callback ) {
// 	const counties = db.collection("counties");
// 	for ( var i = 0; i < zips.length; i++ ) {
// 		var zipRec = zips[i]; 
// 		var cName = zipRec.county.toUpperCase(); 
// 		console.log( "Checking " , cName ); 
// 		counties.find({"_id": cName}).toArray( function( err, doc) {
// 				callback( doc ); 
// 		})
// 	}
// }

const findZipRecords = function(db, z, callback) {
  // Get the documents collection
  const collection = db.collection('zips');
  // Find some documents
  collection.find({'zip': z}).toArray(function(err, docs) {
    callback(docs);
  });
};

const schoolDistURL = 'https://nces.ed.gov/ccd/districtsearch/district_list.asp?Search=1&details=1&InstName=&DistrictID=&Address=&City=&State=&Zip=$ZIPCODE$&Miles=&County=&PhoneAreaCode=&Phone=&DistrictType=1&DistrictType=2&DistrictType=3&DistrictType=4&DistrictType=5&DistrictType=6&DistrictType=7&DistrictType=8&NumOfStudents=&NumOfStudentsRange=more&NumOfSchools=&NumOfSchoolsRange=more'

function getDistrictForZip( zip ) {
	return new Promise( function( resolve, reject ) {	
		var u = schoolDistURL.replace('$ZIPCODE$', zip ); 
		console.log( u );
		request( u, function( error, resp, html ) {
			if ( error ) {
				reject( error ); 
			}
			var $ = cheerio.load( html ); 
			$('div.sfsContent > table:nth-child(4) > tbody > tr:nth-child(2) > td > table > tbody > tr > td:nth-child(2) > font > a > strong').filter( function() {
				var dist = $(this).text();
				dist = dist.replace(/school district$/i, "" ); 
				dist = dist.replace(/public/i, "").trim(); 
				//console.log( "Found", dist, "for zip ", zip );
				resolve( dist ); 
			});
		})
	});
};

// for (var z in zips) {
//     // check if the property/key is defined in the object itself, not in parent
//     if (zips.hasOwnProperty(z)) {           
//         //console.log(z, zips[z]);
//         getDistrictForZip( z ).then( function( zipData ) {
//         	console.log( "Data for " + z, zipData ); 
//         }); 
//     }
// }
// getDistrictForZip( "08554" ).then( function( distName ) {
// 	console.log( "Success", distName ); 
// });
