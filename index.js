'use strict';

const libQ = require('kew');
const fs = require('fs-extra');
const config = new (require('v-conf'))();
const exec = require('child_process').exec;
const path = require('path');
const request = require('request');
const audioFormat = "mp3";
var metadataUrl;
var uri;

module.exports = ControllerLautFM;

function ControllerLautFM(context) {
  var self = this;
  self.context = context;
  self.commandRouter = self.context.coreCommand;
  self.logger = this.context.logger;
  self.logger.transports[0].level = 'debug';
  self.configManager = self.context.configManager;
  self.state = {}; 
  self.stateMachine = self.commandRouter.stateMachine; 
  self.logger.info("[Laut.fm] ControllerLautFM::constructor");
  return self;
}

ControllerLautFM.prototype.onVolumioStart = function() {
  var self = this;
  var configFile = this.commandRouter.pluginManager.getConfigurationFile(this.context, 'config.json');
  self.config = new (require('v-conf'))();
  self.config.loadFile(configFile);

  return libQ.resolve();
};

ControllerLautFM.prototype.getConfigurationFiles = function() {
   
  return ['config.json'];
};

ControllerLautFM.prototype.onStart = function() {
  var self = this;
  var defer = libQ.defer();
  self.serviceName = "lautfm";
  self.addToBrowseSources();

  self.mpdPlugin = self.commandRouter.pluginManager.getPlugin('music_service', 'mpd');

  self.loadI18n();
    
  // Once the plugin has been started, resolve the promise
  defer.resolve();

  return defer.promise;
};

ControllerLautFM.prototype.onStop = function() {
  var self = this;
  var defer = libQ.defer();

  self.removeFromBrowseSources();
  
  // Once the plugin has been stopped, resolve the promise
  defer.resolve();
  
  return defer.promise;
};

ControllerLautFM.prototype.onRestart = function() {
  var self = this;
  // Optional, use if you need it
};

// Configuration Methods -----------------------------------------------------------------------------
ControllerLautFM.prototype.getUIConfig = function() {
  var defer = libQ.defer();
  var self = this;
  var lang_code = this.commandRouter.sharedVars.get('language_code');

  self.getConf(this.configFile);

  self.commandRouter.i18nJson(__dirname + '/i18n/strings_' + lang_code + '.json',
    __dirname + '/i18n/strings_en.json',
    __dirname + '/UIConfig.json')
    .then(function(uiconf) {
      defer.resolve(uiconf);
    })
    .fail(function() {
      defer.reject(new Error());
    });

  return defer.promise;
};

ControllerLautFM.prototype.setUIConfig = function(data) {
  var self = this;
  // Perform any UI configuration updates here
};

ControllerLautFM.prototype.getConf = function(varName) {
  var self = this;
  // Retrieve configuration values here
  return self.config.get(varName);
};

ControllerLautFM.prototype.setConf = function(varName, varValue) {
  var self = this;
  // Store configuration values here
  self.config.set(varName, varValue);
};

// Localization Methods -----------------------------------------------------------------------------
ControllerLautFM.prototype.loadI18n = function() {
  var self = this;
  self.i18n = fs.readJsonSync(__dirname + '/i18n/strings_en.json');
  self.i18nDefaults = fs.readJsonSync(__dirname + '/i18n/strings_en.json');
};

ControllerLautFM.prototype.getI18n = function(key) {
  var self = this;
  
  if (self.i18n[key] !== undefined) {

    return self.i18n[key];
  } else {
    return self.i18nDefaults[key];
  }
};

// Browse Methods ----------------------------------------------------------------------------------
ControllerLautFM.prototype.addToBrowseSources = function() {
  var self = this;
  
  var data = {
    name: 'laut.fm',
    uri: 'lautfm',
    plugin_type: 'music_service',
    plugin_name: 'lautfm',
    icon: 'fa fa-guitar',
    albumart: '/albumart?sourceicon=music_service/lautfm/images/Laut.de_Logo_white.svg'
  };
      
  self.commandRouter.volumioAddToBrowseSources(data);
};

ControllerLautFM.prototype.removeFromBrowseSources = function() {
  var self = this;
  
  self.commandRouter.volumioRemoveToBrowseSources('lautfm');
};

ControllerLautFM.prototype.handleBrowseUri = function(curUri) {
  var self = this;
  var response;
  self.logger.info('[Laut.fm] browse url: ' + curUri); 
    
  if (curUri.startsWith('lautfm')) {
    if (curUri === 'lautfm') {
      response = self.getMainCategories();
    } else if (curUri === 'lautfm/stations') {
      response = self.getStations();
    } else if (curUri === 'lautfm/genres') {
      response = self.getGenres();
    } else if (curUri.startsWith('lautfm/genre/')) {
      var genreName = curUri.split('/').pop();
      response = self.getStationsByGenre(genreName);
    } else if (curUri.startsWith('lautfm/station/')) {
      var stationName = curUri.split('/').pop();
      response = self.getStationInfo(stationName);
    } else if (curUri === 'lautfm/atoz') {
      response = self.getAtoZ();
    } else if (curUri.startsWith('lautfm/letter/')) {
      var letter = curUri.split('/').pop();
      response = self.getStationsByLetter(letter);     
    } else if (curUri.startsWith('lautfm/search')) {
      response = self.getStationsBySearch('flr');     
    }


    
    return response;
  }
};

ControllerLautFM.prototype.getMainCategories = function() {
  var self = this;
  var defer = libQ.defer();
  
  var response = {
    navigation: {
      lists: [
        {
          title: self.getI18n('LAUTFM_CATEGORIES'),
          icon: 'fa fa-file-audio',
          availableListViews: ['list'],
          items: [
            {
              service: 'lautfm',
              type: 'folder',
              title: self.getI18n('LAUTFM_STATIONS'),
              icon: 'fa fa-bookmark',
              uri: 'lautfm/stations'
            },
            {
              service: 'lautfm',
              type: 'folder',
              title: self.getI18n('LAUTFM_GENRES'),
              icon: 'fa fa-tags',
              uri: 'lautfm/genres'
            },
            {
              service: 'lautfm',
              type: 'folder',
              title: self.getI18n('LAUTFM_ATOZ'),
              icon: 'fa fa-h-square',
              uri: 'lautfm/atoz'
            },
            {
              service: 'lautfm',
              type: 'folder',
              title: self.getI18n('LAUTFM_SEARCH'),
              icon: 'fa fa-binoculars',
              uri: 'lautfm/search'
            }

          ]
        }
      ]
    }
  };
  
  defer.resolve(response);
  return defer.promise;
};

ControllerLautFM.prototype.getStations = function() {
  var self = this;
  var defer = libQ.defer();
  
  var apiUrl = 'https://api.laut.fm/stations';
  self.logger.info('[Laut.fm] url: ' + apiUrl);  
  request(apiUrl, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var stations = JSON.parse(body);
      var response = {
        navigation: {
          lists: [
            {
              title: self.getI18n('LAUTFM_STATIONS'),
              icon: 'fa fa-microphone',
              availableListViews: ['list', 'grid'],
              items: []
            }
          ]
        }
      };
      
      stations.forEach(function(station) {
        var imageUrl = station.images ? station.images.station_80x80 || '' : '';
        response.navigation.lists[0].items.push({
          service: 'lautfm',
          type: 'lautfm-station',
          title: station.display_name || station.name,
          artist: station.description || self.getI18n('LAUTFM_NO_DESCRIPTION'),
          album: '',
          icon: 'fa fa-music',
          uri: 'lautfm/station/' + station.name,
          albumart: imageUrl
        });
      });
      
      defer.resolve(response);
    } else {
      self.logger.error('[Laut.fm] Error fetching laut.fm stations: ' + error);
      defer.resolve({
        navigation: {
          lists: [
            {
              title: self.getI18n('LAUTFM_ERROR'),
              icon: 'fa fa-exclamation-triangle',
              availableListViews: ['list'],
              items: []
            }
          ]
        }
      });
    }
  });
  
  return defer.promise;
};

ControllerLautFM.prototype.getGenres = function() {
  var self = this;
  var defer = libQ.defer();
  
  var apiUrl = 'https://api.laut.fm/genres';
  self.logger.info('[Laut.fm] genres url: ' + apiUrl);
  
  request(apiUrl, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var genres = JSON.parse(body);
      var response = {
        navigation: {
          lists: [
            {
              title: self.getI18n('LAUTFM_GENRES'),
              icon: 'fa fa-tags',
              availableListViews: ['list'],
              items: []
            }
          ]
        }
      };
      
      genres.forEach(function(genre) {
        response.navigation.lists[0].items.push({
          service: 'lautfm',
          type: 'folder',
          title: genre.name,
          icon: 'fa fa-folder-open',
          uri: 'lautfm/genre/' + genre.name
        });
      });
      
      defer.resolve(response);
    } else {
      self.logger.error('[Laut.fm] Error fetching laut.fm genres: ' + error);
      defer.resolve({
        navigation: {
          lists: [
            {
              title: self.getI18n('LAUTFM_ERROR'),
              icon: 'fa fa-exclamation-triangle',
              availableListViews: ['list'],
              items: []
            }
          ]
        }
      });
    }
  });
  
  return defer.promise;
};

ControllerLautFM.prototype.getAtoZ = function() {
  var self = this;
  var defer = libQ.defer();
  
  var alphabet = "abcdefghijklmnopqrstuvwxyz".split("");
  
     var response = {
        navigation: {
          lists: [
            {
              title: self.getI18n('LAUTFM_ATOZ'),
              icon: 'fa fa-tags',
              availableListViews: ['list'],
              items: []
            }
          ]
        }
      };
      
      
      //genres.forEach(function(genre) {
      alphabet.forEach(function(letter) {

        response.navigation.lists[0].items.push({
          service: 'lautfm',
          type: 'folder',
          title: letter.toUpperCase(),
          icon: 'fa fa-folder-open',
          uri: 'lautfm/letter/' + letter.toUpperCase()
        });
      });
      
      defer.resolve(response);
    
  return defer.promise;
};

ControllerLautFM.prototype.getStationsByLetter = function(letter) {
  var self = this;
  var defer = libQ.defer();
  var apiUrl = 'https://api.laut.fm/stations/letter/' + encodeURIComponent(letter).toLowerCase();
  self.logger.info('[Laut.fm] getStationsByLetter url: ' + apiUrl);
  request(apiUrl, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var stations = JSON.parse(body);
      var response = {
        navigation: {
          lists: [
            {
              title: letter,
              icon: 'fa fa-microphone',
              availableListViews: ['list', 'grid'],
              items: []
            }
          ]
        }
      };
      
      stations.forEach(function(station) {
        var imageUrl = station.images ? station.images.station_80x80 || '' : '';
        response.navigation.lists[0].items.push({
          service: 'lautfm',
          type: 'lautfm-station',
          title: station.display_name || station.name,
          artist: station.description || self.getI18n('LAUTFM_NO_DESCRIPTION'),
          album: '',
          icon: 'fa fa-music',
          uri: 'lautfm/station/' + station.name,
          albumart: imageUrl
        });
      });
      
      defer.resolve(response);
    } else {
      self.logger.error('[Laut.fm] Error fetching laut.fm stations by letter: ' + error);
      defer.resolve({
        navigation: {
          lists: [
            {
              title: self.getI18n('LAUTFM_ERROR'),
              icon: 'fa fa-exclamation-triangle',
              availableListViews: ['list'],
              items: []
            }
          ]
        }
      });
    }
  });
  
  return defer.promise;
};

ControllerLautFM.prototype.getStationsByGenre = function(genreName) {
  var self = this;
  var defer = libQ.defer();
  
  var apiUrl = 'https://api.laut.fm/stations/genre/' + encodeURIComponent(genreName);
  self.logger.info('[Laut.fm] getStationsByGenre url: ' + apiUrl);
  request(apiUrl, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var stations = JSON.parse(body);
      var response = {
        navigation: {
          lists: [
            {
              title: genreName,
              icon: 'fa fa-microphone',
              availableListViews: ['list', 'grid'],
              items: []
            }
          ]
        }
      };
      
      stations.forEach(function(station) {
        var imageUrl = station.images ? station.images.station_80x80 || '' : '';
        response.navigation.lists[0].items.push({
          service: 'lautfm',
          type: 'lautfm-station',
          title: station.display_name || station.name,
          artist: station.description || self.getI18n('LAUTFM_NO_DESCRIPTION'),
          album: '',
          icon: 'fa fa-music',
          uri: 'lautfm/station/' + station.name,
          albumart: imageUrl
        });
      });
      
      defer.resolve(response);
    } else {
      self.logger.error('[Laut.fm] Error fetching laut.fm stations by genre: ' + error);
      defer.resolve({
        navigation: {
          lists: [
            {
              title: self.getI18n('LAUTFM_ERROR'),
              icon: 'fa fa-exclamation-triangle',
              availableListViews: ['list'],
              items: []
            }
          ]
        }
      });
    }
  });
  
  return defer.promise;
};


ControllerLautFM.prototype.getStationInfo = function(stationName) {
  var self = this;
  var defer = libQ.defer();
  
  var apiUrl = 'https://api.laut.fm/station/' + encodeURIComponent(stationName);
  self.logger.info('[Laut.fm] getStationsInfo url: ' + apiUrl);

  request(apiUrl, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var station = JSON.parse(body);
      
      self.playStation(station)
        .then(function() {
          defer.resolve();
        })
        .fail(function(error) {
          defer.reject(error);
        });
    } else {
      self.logger.error('[Laut.fm] Error fetching laut.fm station info: ' + error);
      defer.reject(error);
    }
  });
  
  return defer.promise;
};

// Playback Methods -------------------------------------------------------------------------------
ControllerLautFM.prototype.playStation = function(station) {
  var self = this;
  self.logger.info('[Laut.fm] play selected station: ' + station.name);
  metadataUrl=station.api_urls.current_song;
  var defer = libQ.defer();

  uri = station.stream_url;
  self.logger.info('[Laut.fm] selected station uri: ' + uri);
  self.mpdPlugin.sendMpdCommand('stop', [])
    .then(function() {
      return self.mpdPlugin.sendMpdCommand('clear', []);
    })
    .then(function() {
      self.logger.info('[Laut.fm] add to ply queue: ' + 'add "' + uri + '"');
      return self.mpdPlugin.sendMpdCommand('add "' + uri + '"', []);
    })
    .then(function() {
      //self.commandRouter.pushToastMessage('info','Laut.fm', self.getI18n('LAUTFM_WAITING') + station.name);
      return self.mpdPlugin.sendMpdCommand('play', []);
    })
    .then(function() {
      self.setMetadata(metadataUrl);    
    })
    .then(function() {
      self.commandRouter.pushToastMessage('success', self.getI18n('LAUTFM_PLAYING'), station.display_name || station.name);
      return self.mpdPlugin.getState();
      defer.resolve();
    })    
    .fail(function(error) {
      self.logger.error('[Laut.fm] Error playing laut.fm station: ' + error);
      defer.reject(error);
    });
  
  return defer.promise;
};

ControllerLautFM.prototype.stop = function() {
  var self = this;
  self.commandRouter.pushToastMessage('info', self.getI18n('LAUTFM'), self.getI18n('LAUTFM_STOP'));
  
  return self.mpdPlugin.sendMpdCommand.stop();
};

ControllerLautFM.prototype.pause = function() {
  var self = this;
  self.commandRouter.pushToastMessage('info', self.getI18n('LAUTFM'), self.getI18n('LAUTFM_PAUSE'));
  
  return self.mpdPlugin.sendMpdCommand.pause();
};

ControllerLautFM.prototype.resume = function() {
  var self = this;
  self.commandRouter.pushToastMessage('info', self.getI18n('LAUTFM'), self.getI18n('LAUTFM_RESUME'));
  
  return self.mpdPlugin.sendMpdCommand.resume();
};

ControllerLautFM.prototype.seek = function(position) {
  var self = this;
  return self.mpdPlugin.seek(position);};

ControllerLautFM.prototype.getMetadata = function (url) {
    var self = this;
    self.logger.info('[Laut.fm] get metadata url: ' + url);    
    var defer = libQ.defer();
    request(url, function(error, response, body){
      if (error || !(response.statusCode === 200)) {
            self.logger.error('[Laut.fm] failed to query metadata api, status code: ' + resp.statusCode);
            defer.resolve(null)
      } else {
        var metadata = JSON.parse(body);
        //self.logger.info('[Laut.fm] metadata received: ' + JSON.stringify(metadata));
        defer.resolve(metadata);
      }
    });  
    return defer.promise;
}


ControllerLautFM.prototype.setMetadata = function (metadataUrl) {
    var self = this;
    self.logger.info('[Laut.fm] set metadata url: ' + metadataUrl);

    return self.getMetadata(metadataUrl)
    .then(function (eventResponse) {

        if (eventResponse !== null) {
            return eventResponse ;
       }
    }).then(function(metadata) {
        return libQ.resolve(self.pushSongState(metadata));
    });
};

ControllerLautFM.prototype.pushSongState = function (metadata) {
    var self = this;
    self.logger.info('[Laut.fm] push song state ');   

    var lautfmState = {
        status: 'play',
        service: self.serviceName,
        type: 'lautfm',
        trackType: audioFormat,
        radioType: 'lautfm',
        albumart: metadata.artist.image,
        uri: uri,
        name: metadata.title,
        title: metadata.title,
        artist: metadata.artist.name,
        album: metadata.album,
	streaming: true,
        disableUiControls: true,
        bitdepth: '24 bit',
        channels: 2
    };
    self.state = lautfmState;
    
    //workaround to allow state to be pushed when not in a volatile state
    var vState = self.commandRouter.stateMachine.getState();
    var queueItem = self.commandRouter.stateMachine.playQueue.arrayQueue[vState.position];

    queueItem.name =  metadata.title;
    queueItem.artist =  metadata.artist.name;
    queueItem.album = metadata.album;
    queueItem.albumart = metadata.artist.image;
    queueItem.duration = metadata.ends_at;
//  queueItem.samplerate = '96 KHz';
//  queueItem.bitdepth = '24 bit';
    queueItem.channels = 2;

    //volumio push state
    self.commandRouter.servicePushState(lautfmState, self.serviceName);
};

ControllerLautFM.prototype.explodeUri = function(uri) {
  var self = this;
  var defer = libQ.defer();
  self.logger.info('[Laut.fm] explodeUri uri: ' + JSON.stringify(uri));

  if (uri.startsWith('lautfm/station/')) {
    var stationName = uri.split('/').pop();
    var apiUrl = 'https://api.laut.fm/station/' + encodeURIComponent(stationName);
    
    request(apiUrl, function(error, response, body) {
      if (!error && response.statusCode === 200) {
        var station = JSON.parse(body);
        var streamUrl = 'https://stream.laut.fm/' + station.name + '.mp3';
        
        var track = {
          name: station.display_name || station.name,
          title: station.display_name || station.name,
          uri: streamUrl,
          service: 'lautfm',
          type: 'lautfm',
          trackType: 'lautfm',
          albumart: station.images ? station.images.station_120x120 || '' : '',
          duration: 0,
          samplerate: '',
          bitdepth: '',
          channels: 2
        };
        
        defer.resolve({
          uri: uri,
          service: 'lautfm',
          name: station.display_name || station.name,
          type: 'track',
          trackType: 'lautfm',
          tracks: [track]
        });
      } else {
        self.logger.error('[Laut.fm] Error exploding laut.fm URI: ' + error);
        defer.reject(error);
      }
    });
  } else {
    defer.reject('Invalid URI');
  }
  
  return defer.promise;
};


ControllerLautFM.prototype.getStationsBySearch = function(query) {
  var self = this;
  self.logger.info('############################################[Laut.fm] getStationsBySearch  query: ' + query);

  var defer = libQ.defer();
  var apiUrl = 'https://api.laut.fm/station/' + encodeURIComponent(query);
  
  request(apiUrl, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var station = JSON.parse(body);
      var imageUrl = station.images ? station.images.station_80x80 || '' : '';
      var result = {
        navigation: {
          lists: [
            {
              title: self.getI18n('LAUTFM_SEARCH_RESULTS'),
              icon: 'fa fa-search',
              availableListViews: ['list', 'grid'],
              items: [
                {
                service: 'lautfm',
                type: 'lautfm-station',
                title: station.display_name || station.name,
                artist: station.description || self.getI18n('LAUTFM_NO_DESCRIPTION'),
                album: '',
                icon: 'fa fa-music',
                uri: 'lautfm/station/' + station.name,
                albumart: imageUrl
                }
            ]
            }
          ]
        }
      };
      self.logger.info('############################[Laut.fm] getStationsBySearch  station: ' + JSON.stringify(station));
      self.logger.info('############################[Laut.fm] getStationsBySearch  result: ' + JSON.stringify(result));


      defer.resolve(result);
    } else {
      self.logger.error('[Laut.fm] Error searching laut.fm stations: ' + error);
      defer.resolve({
        navigation: {
          lists: [
            {
              title: self.getI18n('LAUTFM_ERROR'),
              icon: 'fa fa-exclamation-triangle',
              availableListViews: ['list'],
              items: []
            }
          ]
        }
      });
    }
  });
  
  return defer.promise;
};
