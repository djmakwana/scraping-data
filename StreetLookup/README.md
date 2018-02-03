# Street Lookup utilities and simple web app

## How to run
- To run the web app `npm start`
- To just use the modules, you need to load them. There are two modules of importance 
  - `scrape` (in `routes/scrape.js`) 
  - `njp` (in `routes/njp.js`)

## To use the modules
The modules have `getZipResult(zip, streets)` function which returns a `Promise`. The arguments are: 
- `zip`: This is the zip code as a string
- `streets`: This can be a simple string or an array of strings. 
The function returns an array of objects with name of the owner and address. 

Here's a typical usage 
```javascript
getZipResult(zip, streets)
        .then( (val) => { res.send(val); })
        .catch( (error) => {    res.send(error);    });
```
