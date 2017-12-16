var request = require('request');
var cheerio = require('cheerio');
var tableToJSON = require('tabletojson'); 
var fs = require('fs');
async = require('async'); 

var counties = {
	'ATLANTIC' : { 'code': '0101', 'name': 'ATLANTIC', 'districts':[] },
	'BERGEN' : { 'code': '0201', 'name': 'BERGEN', 'districts':[] },
	'BURLINGTON' : { 'code': '0301', 'name': 'BURLINGTON', 'districts':[] },
	'CAMDEN' : { 'code': '0401', 'name': 'CAMDEN', 'districts':[] },
	'CAPE MAY' : { 'code': '0501', 'name': 'CAPE MAY', 'districts':[] },
	'CUMBERLAND' : { 'code': '0601', 'name': 'CUMBERLAND', 'districts':[] },
	'ESSEX' : { 'code': '0701', 'name': 'ESSEX', 'districts':[] },
	'GLOUCESTER' : { 'code': '0801', 'name': 'GLOUCESTER', 'districts':[] },
	'HUDSON' : { 'code': '0901', 'name': 'HUDSON', 'districts':[] },
	'HUNTERDON' : { 'code': '1001', 'name': 'HUNTERDON', 'districts':[] },
	'MERCER' : { 'code': '1101', 'name': 'MERCER', 'districts':[] },
	'MIDDLESEX' : { 'code': '1201', 'name': 'MIDDLESEX', 'districts':[] },
	'MONMOUTH' : { 'code': '1301', 'name': 'MONMOUTH', 'districts':[] },
	'MORRIS' : { 'code': '1401', 'name': 'MORRIS', 'districts':[] },
	'PASSAIC' : { 'code': '1601', 'name': 'PASSAIC', 'districts':[] },
	'SALEM' : { 'code': '1701', 'name': 'SALEM', 'districts':[] },
	'SOMERSET' : { 'code': '1801', 'name': 'SOMERSET', 'districts':[] },
	'SUSSEX' : { 'code': '1901', 'name': 'SUSSEX', 'districts':[] },
	'UNION' : { 'code': '2001', 'name': 'UNION', 'districts':[] },
	'WARREN' : { 'code': '2101', 'name': 'WARREN', 'districts':[] }
}; 
var zips = JSON.parse( fs.readFileSync('zips1.json', 'utf8' )); 
var fullData = {
	'counties': counties,
	'zips': zips
}

const url = 'http://tax1.co.monmouth.nj.us/cgi-bin/prc6.cgi?&ms_user=monm&passwd=data&srch_type=1&adv=1&out_type=1&district=';

for ( var c in counties ) {
	getCounties2( url, counties[c] ).then( function( cc ) {
		console.log( cc ); 
	})
}

// function getDistricts() {
// 	return new Promise( function( resolve, reject ) {
// 		for (var c in counties) {
// 		    // check if the property/key is defined in the object itself, not in parent
// 		    if (counties.hasOwnProperty(c)) {           
// 				getCounties2( url, counties[c]).then( function( cc ) {
// 					console.log( cc ); 
// 				}); 
// 		    }
// 		}

// 	})
// }



function getCounties2( url, ddObj ) {
	return new Promise( function( resolve, reject ) {	
		var u = url + ddObj.code + ''; 
		request( u, function( error, resp, html ) {
			if ( error ) {
				reject( error ); 
			}
			var $ = cheerio.load( html ); 
			$('#normdiv > form > table:nth-child(4) > tbody > tr:nth-child(4) > td:nth-child(2) > select').filter( function() {
				var data = $(this); 
				data.children().each( function() {
					var dd = $(this).val() + ''; 
					//console.log( dd.toString(), $(this).text() ); 
					var ddn = counties[ ddObj.name ]; 
					ddn.districts.push({"code": dd.toString(), "name": $(this).text() }); 
					resolve( ddn ); 
				})
			})
		})
	})
}

//const zURL = 'http://www.zipcodestogo.com/New%20Jersey'; 

// **** Need to get the ZIP.html file downloaded from above 'zURL'

// function getZips() {
// 	var file = fs.readFileSync('ZIP.html', "utf8");
// 	//console.log(file);	
// 	var $ = cheerio.load( file ); 
// 	var zips = {};
// 	$('.inner_table tr').filter( function() {
// 		//console.log( $(this) ); 
// 		var trs = $(this);
// 		var ix = 0;  
// 		trs.each( function(i, row) {
// 			var zip = $(row).find('td:first-child a').text(); 
// 			var city = $(row).find('td:nth-child(2)').text(); 
// 			var county = $(row).find('td:nth-child(3) a').text(); 
// 			if ( zip.startsWith('0')) {
// 				//console.log( zip, city, dist ); 
// 				zips[zip] = {'zip': zip, 'city': city, 'county': county }; 
// 			}
// 		});
// 	})
// 	console.log( zips ); 

// }
// getZips(); 

const schoolDistURL = 'https://nces.ed.gov/ccd/districtsearch/district_list.asp?Search=1&details=1&InstName=&DistrictID=&Address=&City=&State=&Zip=$ZIPCODE$&Miles=&County=&PhoneAreaCode=&Phone=&DistrictType=1&DistrictType=2&DistrictType=3&DistrictType=4&DistrictType=5&DistrictType=6&DistrictType=7&DistrictType=8&NumOfStudents=&NumOfStudentsRange=more&NumOfSchools=&NumOfSchoolsRange=more'
//'body > div:nth-child(7) > div.sfsContent > table:nth-child(4) > tbody > tr:nth-child(2) > td > table > tbody > tr > td:nth-child(2) > font > a > strong'

function getDistrictForZip( zip ) {
	return new Promise( function( resolve, reject ) {	
		var u = schoolDistURL.replace('$ZIPCODE$', zip ); 
		//console.log( u );
		request( u, function( error, resp, html ) {
			if ( error ) {
				reject( error ); 
			}
			var $ = cheerio.load( html ); 
			$('div.sfsContent > table:nth-child(4) > tbody > tr:nth-child(2) > td > table > tbody > tr > td:nth-child(2) > font > a > strong').filter( function() {
				var dist = $(this).text();
				dist = dist.replace(/school district$/i, "" ); 
				zips[zip].district = dist; 
				resolve( zips[zip] ); 
			});
		})
	});
}

// for (var z in zips) {
//     // check if the property/key is defined in the object itself, not in parent
//     if (zips.hasOwnProperty(z)) {           
//         //console.log(z, zips[z]);
//         getDistrictForZip( z ).then( function( zipData ) {
//         	console.log( "Data for " + z, zipData ); 
//         }); 
//     }
// }
