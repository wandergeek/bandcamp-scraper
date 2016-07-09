var request     = require('request'),
    cheerio     = require('cheerio'),
    url         = require('url'),
    utils       = require('./utils'),
    async       = require('async');

// Search for artist, track or track
var search = function(query, callback) {
  var url = "https://bandcamp.com/search?";
  var params = {}

  // required
  if (typeof query.query === "undefined") {
    throw new Error("Your query must have a defined property 'query'");
  }

  params.q    = query.query;
  params.page = query.page || 1;

  url = url + Object.keys(params).map(function(key) {
    return key + "=" + encodeURIComponent(params[key]);
  }).join("&");

  request(url, function(error, response, body) {
    if (error || response.statusCode != 200) {
      callback(error, null);
    } else {
      var results = utils.parseSearchResults(body);
      results = utils.scrubResultsForTarget(results);
      if(results.length == 0){
        console.log("nothing good coming from bandcamp, sending empty result:", results)
        callback(null,results);
      } else {
        getSoundIdsForCollection(results, function(err,res) {
          if(err) {
            console.log("Error getSoundIdsForCollection:", error)
            callback(error,null);
          } else {
            callback(null, res);
          }
        });
      }


    }
  });
}

var getSoundIdsForCollection = function(collection, callback) {
  async.mapLimit(collection, 2 /* max number of threads */, getSoundID, function(err, results) {
    if(err) {
      callback(err, null);
    } else {
      callback(null, results);
    }
  });
};

var getSoundID = function(entry, callback) {
  if(!entry['link']) {
    return;
  }
  request(entry['link'], function(error, response, body) {
    if (!error && response.statusCode == 200) {
      var soundID = utils.parseSoundID(body, entry['link']);
      entry['soundID'] = soundID;
      callback(null, entry);
    } else {
      callback(error, null);
    }
  });
}

// Get the artist's albums URL
var getArtistAlbumURLs = function(artistURL, callback) {
  artistURL = url.resolve(artistURL, '/music');
  request(artistURL, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      var albumURLs = utils.findAlbumURLs(body, artistURL);
      callback(null, albumURLs);
    } else {
      callback(error, null);
    }
  });
}



// Get the artist's album info
var getAlbumProducts = function(albumURL, callback) {
  request(albumURL, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      var products = utils.parseAlbumProducts(body, albumURL);
      callback(null, products);
    } else {
      callback(error, null);
    }
  });
}

var getAlbumInfo = function(albumURL, callback) {
  request(albumURL, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      var albumInfo = utils.parseAlbumInfo(body, albumURL);
      callback(null, albumInfo);
    } else {
      callback(error, null);
    }
  });
}

module.exports.search = search;
module.exports.getArtistAlbumURLs = getArtistAlbumURLs;
module.exports.getAlbumProducts = getAlbumProducts;
module.exports.getAlbumInfo = getAlbumInfo;
module.exports.getSoundID = getSoundID;
