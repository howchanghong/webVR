/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

 var tileZoom = 14;
 var presetsFile = "presets.json";
 var centerPos;
 var map, tiles, items;
 var baseTileID, baseTileSize, centerOffset;
 var tilesFromCenter = 8;
 
 // Mapnik is the default world-wide OpenStreetMap style.
 var tileServer = "https://tilecache.kairo.at/mapnik/";
 // Basemap offers hires tiles for Austria.
 //var tileServer = "https://tilecache.kairo.at/basemaphires/";
 // Standard Overpass API Server
 var overpassURL = "https://overpass-api.de/api/interpreter";
 
 window.onload = function() {

   // Close intro dialog when entering VR mode.
   document.querySelector('a-scene').addEventListener('enter-vr', event => {
     document.querySelector("#introDialogCloseButton").click();
   });
 
   // Load location presets and subdialog.
   fetch(presetsFile)
   .then((response) => {
     if (response.ok) {
       return response.json();
     }
     else {
       throw "HTTP Error " + response.status;
     }
   })
   .then(() => {
     // Load objects into scene.
     loadScene();
   })
   .catch((reason) => { console.log(reason); });
 
   // Hook up menu button iside the VR.
   let leftHand = document.querySelector("#left-hand");
   let rightHand = document.querySelector("#right-hand");
   // Vive controllers, Windows Motion controllers
   leftHand.addEventListener("menudown", toggleMenu, false);
   rightHand.addEventListener("menudown", toggleMenu, false);
   // Oculus controllers (guessing on the button)
   leftHand.addEventListener("surfacedown", toggleMenu, false);
   rightHand.addEventListener("surfacedown", toggleMenu, false);
   // Daydream and GearVR controllers - we need to filter as Vive and Windows Motion have the same event.
   var toggleMenuOnStandalone = function(event) {
     if (event.target.components["daydream-controls"].controllerPresent ||
         event.target.components["gearvr-controls"].controllerPresent) {
       toggleMenu(event);
     }
   }
   leftHand.addEventListener("trackpaddown", toggleMenuOnStandalone, false);
   rightHand.addEventListener("trackpaddown", toggleMenuOnStandalone, false);
   // Keyboard press
   document.querySelector("body").addEventListener("keydown", event => {
     if (event.key == "m") { toggleMenu(event); }
   });
 
   // Set variables for base objects.
   map = document.querySelector("#map");
   tiles = document.querySelector("#tiles");
   items = document.querySelector("#items");
 }
 
 function toggleMenu(event) {
   console.log("menu pressed!");
   let menu = document.querySelector("#menu");
   if (menu.getAttribute("visible") == false) {
     menu.setAttribute("visible", true);
     document.querySelector("#left-hand").setAttribute("mixin", "handcursor");
     document.querySelector("#right-hand").setAttribute("mixin", "handcursor");
   }
   else {
     menu.setAttribute("visible", false);
     document.querySelector("#left-hand").setAttribute("mixin", "teleport");
     document.querySelector("#right-hand").setAttribute("mixin", "teleport");
   }
 }
 
 function loadScene() {
   while (tiles.firstChild) { tiles.removeChild(tiles.firstChild); }
   while (items.firstChild) { items.removeChild(items.firstChild); }
   //loadGroundTiles();
   //loadTrees();
   //loadBuildings();
 }
 
 function getTagsForXMLFeature(xmlFeature) {
   var tags = {};
   for (tag of xmlFeature.children) {
     if (tag.nodeName == "tag") {
       tags[tag.attributes['k'].value] = tag.attributes['v'].value;
     }
   }
   return tags;
 }
 
 function getBoundingBoxString() {
   var startPos = latlonFromTileID({x: baseTileID.x - tilesFromCenter,
                                    y: baseTileID.y + tilesFromCenter + 1});
   var endPos = latlonFromTileID({x: baseTileID.x + tilesFromCenter + 1,
                                  y: baseTileID.y - tilesFromCenter});
   return startPos.latitude + "," + startPos.longitude + "," +
          endPos.latitude + "," + endPos.longitude;
 }
 
 function fetchFromOverpass(opQuery) {
   return new Promise((resolve, reject) => {
     fetch(overpassURL + "?data=" + encodeURIComponent(opQuery))
     .then((response) => {
       if (response.ok) {
         return response.text();
       }
       else {
         throw "HTTP Error " + response.status;
       }
     })
     .then((response) => {
       var parser = new DOMParser();
       var itemData = parser.parseFromString(response, "application/xml");
       var itemJSON = osmtogeojson(itemData);
       resolve(itemJSON);
     })
     .catch((reason) => { reject(reason); });
   });
 }
 