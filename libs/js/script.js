// ---------------------------------------------------------
// TO DO
// ---------------------------------------------------------
// 
// pre loader
// currency API - rate limit
// check UI on large screens 
// north korea wiki
// weather modal overspill 

//inconsistent function styles a problem?
// can i split this into separate js files 
// remove old php files

// fix error handling 
// improve styling and consistency of modals / cards in index html

// event listener bug on markers
// add onclick to bring up menu "show wiki etc"

// another API
// more layers , more info

// bugs
// n cyprus n korea  bosnia n herz
// scan can cause error modal


// ---------------------------------------------------------
// GLOBAL DECLARATIONS
// ---------------------------------------------------------

var map;

class Preset {
  constructor (country, station, url) {
    this.country = country,
    this.station = station,
    this.url = url
  }
}

const appState = {
  
  selectedCountry: {
    name: null,
    countryCode: null,
    currencyCode: null,
    population: null,
    capital: null,
    area: null,
    geoJSON: null,
    radio: null
  },
  myCountry: {
    name: null,
    countryCode: null,
    currencyCode: null
  },

  currencyExchange: {
    currencyCodeFrom: null,
    currencyCodeTo: null,
    swapped: false,
    exchangeRates: null,
  },
  radioPlaying: false,
  radioName: null,
  radioLocation: null,
  streamingUrl: null,
  presets: {
    preset1: null,
    preset2: null,
    preset3: null,
  },
  saving: false,
  deleting: false,
  presetButtons: {}
}



const geojsonStyling = {
    fillColor: "#fff",
    color: "#000000",
    weight: 3,
    opacity: 1,
    fillOpacity: 0,
  }



//modals

let errorModal;

function hidePreloader() {
   if ($('#preloader').length) {
        $('#preloader').fadeOut('slow')
        $("#preloader").remove()
  }
}

function showError(error) {

  let errorText = error.status.description || error.responseText || "Network Error";

  Toastify({
  text: `Error: ${errorText}`,
  duration: 2000,
  newWindow: true,
  close: true,
  gravity: "top", 
  position: "left", 
  stopOnFocus: false, 
  style: {
    background: 'grey'
  } 
}).showToast();
}

//Async ajax function to keep things in order when awaiting api responses.
async function ajaxCaller(url, args) {
    let result;
  
    try {
    result = await $.ajax({
      url: url,
      type: 'POST',
      dataType: "json",
      data: args
    });
    // console.log(result);
     if (result.status.name !== "ok" ) {
      showError(result)
      return null;
     }
    return result; 
   
  } catch (error) {
      showError(error)
      return null
  }  
}

function copy() {
  let copyText = document.querySelector("#shareText");
  copyText.select();
  document.execCommand("copy");
}

async function randomCountry() {
  Toastify({
  text: "Struggling to locate you. Picking a random country.",
  duration: 3000,
  newWindow: true,
  close: true,
  gravity: "bottom", 
  position: "left", 
  stopOnFocus: false, 
  style: {
    background: 'grey'
  } 
}).showToast();

  let rawCountries = await ajaxCaller("libs/php/populateCountrySelect.php", {})
  let countries = rawCountries["data"]
  let countryCodes = Object.values(countries)
  let countryCode = countryCodes[Math.floor(Math.random() * countryCodes.length)]
   appState.myCountry.countryCode = countryCode;
  
  $("#countrySelect").val(countryCode).change()
}

const countryInfo = async (countryCode = appState.selectedCountry.countryCode, target = appState.selectedCountry) => {
  let result = await ajaxCaller("libs/php/getCountryInfo.php", { name: countryCode})
	// populate the country info in appState. Handle edge cases first.
  if (!result) return false
  if (!result["data"]) {
    target.population = null;
    target.capital = null;
    target.area = null;
    target.currencyCode = null; 
    } else {
    target.population = result['data'][0]['population']
    target.capital = result['data'][0]['capital']
    target.area = result['data'][0]['areaInSqKm']
    target.currencyCode = result["data"][0]["currencyCode"]
    return true
    }
  }

const audio = document.getElementById("radioFrame")

function stationPicker(stationArray){
  let x = Math.floor(Math.random() * stationArray.length)
  appState.streamingUrl = stationArray[x]['url'];
  appState.radioName = stationArray[x]['name']
  }


  
async function audioPlayer(attempts = 0){
  if (appState.selectedCountry.radio.length === 0) {
    return
  }

  if (attempts > 6){
    return
  }
  audio.src = appState.streamingUrl
  audio.load()
  audio.play().catch(() => {})
  setTimeout(()=> {
    if (audio.readyState < 3)
      {
        stationPicker(appState.selectedCountry.radio)
        audioPlayer(attempts + 1)
      }
  }, 500)
  
}


async function playRadio(stationArray) {
  // filter out stations that force download and don't stream well in iframe
  let filteredArray = stationArray.filter(station => !station.url.includes("m3u"))
  let x = Math.floor(Math.random() * filteredArray.length)
  
  appState.streamingUrl = filteredArray[x]['url'];
  appState.radioName = filteredArray[x]['name']
  await audioPlayer()
  // $("#radioFrame").attr("src", appState.streamingUrl)
  $("#radioInfo").html(`Listen to ${appState.radioName} from ${appState.selectedCountry.name}`)
  $("#radioPlayer").removeClass("d-none")
  appState.radioPlaying = true;
}

function stopRadio () {
  $("#radioFrame")[0].pause()
  $("#radioPlayer").addClass("d-none")
  appState.radioPlaying = false;
}

function playPreset(preset) {
  let {country, station, url} = preset;
  $("#radioFrame").attr("src", url)
  $("#radioInfo").html(`Listen to ${station} from ${country}`)
  $("#radioPlayer").removeClass("d-none")
  appState.radioLocation = country;
  appState.radioName = station;
  appState.streamingUrl = url;
  appState.radioPlaying = true;
  $("#radioFrame")[0].play()
  
}

// tile layers
var streets = L.tileLayer('//tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: "Tiles &copy; OpenStreetMap openstreetmap.org/copyright"
  }
);

var satellite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
  }
);


var basemaps = {
  
  "Satellite": satellite,
  "Streets": streets,
  
};


//country select listener
$('#countrySelect').on('change', async function() {
	appState.selectedCountry.name = $("#countrySelect option:selected").text();
  appState.selectedCountry.countryCode = this.value;
 
  // handle edge cases with no ISO code, swap out code for name
  let countryId = appState.selectedCountry.countryCode == "-99" ? appState.selectedCountry.name : appState.selectedCountry.countryCode;
  
  //ajax call to return GeoJSON object when given country code, draw on map and centre to it
	let rawGeoJSON = await ajaxCaller("libs/php/getCountryBounds.php", { id: countryId  })
  if (!rawGeoJSON) return
  let myGeoJSON = rawGeoJSON["data"]
		
    // remove any existing country outlines
  if(appState.selectedCountry.geoJSON){
    appState.selectedCountry.geoJSON.clearLayers()
  }

  

  appState.selectedCountry.geoJSON = L.geoJSON(myGeoJSON, {style: geojsonStyling})
  appState.selectedCountry.geoJSON.addTo(map);
  map.fitBounds(appState.selectedCountry.geoJSON.getBounds(), {
  maxZoom: 5,
  padding: [50,50],
});
  await countryInfo(countryId)
  hidePreloader()
  
 
});

 
var homeBtn = L.easyButton( "fa-home", function (btn, map) {
  $("#countrySelect").val(appState.myCountry.countryCode).change()
});

let saveBtnAccess;

var saveBtn = L.easyButton("fa-floppy-disk", function (btn) {
  saveBtnAccess = btn.button
  appState.saving = !appState.saving
  appState.saving ? saveBtnAccess.classList.add("active") : saveBtnAccess.classList.remove("active") 
})

let trashBtnAccess;

var trashBtn = L.easyButton("fa-trash", function (btn){
  trashBtnAccess = btn.button
  appState.deleting = !appState.deleting
  appState.deleting ? trashBtnAccess.classList.add("active") : trashBtnAccess.classList.remove("active") 
})

function makePresetButton({icon, name}) {
  const btn = L.easyButton(icon, (btn) => {
    if (appState.saving) {
      let preset = new Preset(appState.radioLocation, appState.radioName, appState.streamingUrl)
      preset = JSON.stringify(preset)
      localStorage.setItem(name, preset);
      appState.saving = false
      saveBtnAccess.classList.remove("active")
      btn.button.classList.add("full")
      appState.presets[name] = preset;
      return
    } 

    if (appState.deleting) {
      localStorage.removeItem(name)
      appState.deleting = false
      trashBtnAccess.classList.remove("active")
      btn.button.classList.remove("full")
    }

    if (localStorage.getItem(name)) {

    let preset = localStorage.getItem(name)
    preset = JSON.parse(preset)
    playPreset(preset)
    }
  })
  
  btn.addTo(map)
  appState.presetButtons[name] = btn
  return btn
}


var shareBtn = L.easyButton("fa-share-nodes", (btn) => {
  let params = {
    url: appState.streamingUrl,
    country: appState.radioLocation,
    name: appState.radioName
  }
  let shareableParams = new URLSearchParams(params)
  let link= `${window.location.origin}${window.location.pathname}?${shareableParams}`
  $("#shareText").val(`Listen to ${appState.radioName} from ${appState.radioLocation} on the World Radio Tuner: ${link}`)
  shareModal.show()
})



var radioBtn = L.easyButton( "fa-radio", async function (btn, map) {
  if (appState.radioPlaying){
    stopRadio()
    return;
  }
  
  playRadio(appState.selectedCountry.radio)
  
});


// ---------------------------------------------------------
// EVENT HANDLERS
// ---------------------------------------------------------

// initialise and add controls once DOM is ready

$(document).ready( async function () {
  
  map = L.map("map", {
    layers: [satellite],
    maxBounds: [[-90, -180], [90, 180]], 
    maxBoundsViscosity: 1.0, 
    minZoom: 2, 
    worldCopyJump: true 
  }).setView([20, 0], 2);

  

   // initialise myCountry, selectedCountry and countrySelect based on location
  navigator.geolocation.getCurrentPosition( async (pos) => {
   
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
  
    let countryFromCoords= await ajaxCaller("libs/php/getCountryFromCoords.php", {lat: lat, lng: lng})
    if (!countryFromCoords || !countryFromCoords["data"] ){
      randomCountry()
      appState.myCountry.countryCode = appState.selectedCountry.countryCode;
      appState.myCountry.name = appState.selectedCountry.name;
      await countryInfo(appState.myCountry.countryCode, appState.myCountry)
      hidePreloader()
      return;
    } 
    
    

    appState.myCountry.countryCode = countryFromCoords['data']["country_code"].toUpperCase();
    appState.myCountry.name = countryFromCoords['data']["name"];

    await countryInfo(appState.myCountry.countryCode, appState.myCountry)
    
    
    // when ajax call complete copy myCountry into selectedCountry to initialise it if it's empty
    if (!appState.selectedCountry.name) {
      appState.selectedCountry.name = appState.myCountry.name;
      appState.selectedCountry.countryCode = appState.myCountry.countryCode;
      appState.selectedCountry.currencyCode = appState.myCountry.currencyCode
    }
  
    $("#countrySelect").val(appState.myCountry.countryCode).change();
    
    // first check if preset is shared in url , if so play that
    const params = new URLSearchParams(window.location.search);

    
    if(params.toString()) {
      
      appState.radioLocation = params.get("country");
      appState.streamingUrl = params.get("url");
      appState.radioName = params.get("name")
      let thisPreset = new Preset(appState.radioLocation, appState.radioName, appState.streamingUrl)
      playPreset(thisPreset)
     
      return
      } 
    
    let radios = await ajaxCaller("libs/php/getRadio.php", {name: appState.selectedCountry.countryCode})
  
    if (!radios) return;
    appState.selectedCountry.radio = radios["data"]
    appState.radioLocation = appState.selectedCountry.name;
    playRadio(appState.selectedCountry.radio)
    
  
  }, (error) => {
    randomCountry()
      appState.myCountry.countryCode = appState.selectedCountry.countryCode;
      appState.myCountry.name = appState.selectedCountry.name;
      countryInfo(appState.myCountry.countryCode, appState.myCountry)
      hidePreloader()
      return;
  }, {
  enableHighAccuracy: false,
  timeout: 3000,
  maximumAge: 60000
})

  let layerControl = L.control.layers(basemaps).addTo(map);
 	
  homeBtn.addTo(map)
  radioBtn.addTo(map)

  makePresetButton({icon:"fa-1", name: "preset1"})
  makePresetButton({icon:"fa-2", name: "preset2"})
  makePresetButton({icon:"fa-3", name: "preset3"})
  saveBtn.addTo(map)
  trashBtn.addTo(map)
  shareBtn.addTo(map)

  errorModal = new bootstrap.Modal(document.getElementById('errorModal'))
  shareModal = new bootstrap.Modal(document.getElementById("shareModal"))

  // populate country select
  let rawCountries = await ajaxCaller("libs/php/populateCountrySelect.php", {})
  let countries = rawCountries["data"]

  		for (let key in countries) {
        $('#countrySelect').append('<option value="' + countries[key] + '">' + key + '</option>')
      }  
  

  $("#scanBtn").on("click", async () => {
    if (appState.radioLocation !== appState.selectedCountry.name || !appState.selectedCountry.radio) {
      let result = await ajaxCaller("libs/php/getRadio.php", {name: appState.selectedCountry.countryCode})
      if (!result) return;
      appState.selectedCountry.radio = result["data"]
      appState.radioLocation = appState.selectedCountry.name;
    }
    playRadio(appState.selectedCountry.radio)
     $("#radioFrame")[0].play()
  })
  
  $('audio').on('error', () => {
    // scan on error
    playRadio(appState.selectedCountry.radio)
  }) 

  document.querySelector("#copyText").addEventListener("click", copy);

     for (const [key, value] of Object.entries(appState.presets)){
      if (localStorage.getItem(key)){
        appState.presets[key] = localStorage.getItem(key)
        appState.presetButtons[key].button.classList.add("full")
      }
     }

  map.on('click', async function(e) {        
       
      
        let lat = e.latlng.lat
        let lng = e.latlng.lng
      
      try {
        let country =  await $.ajax({
          url: "libs/php/getCountryFromCoords.php",
          type: 'POST',
          dataType: "json",
          data: {lat: lat, lng: lng}
        });
        if ((!country) || !country["data"]) return
        
        let newCountry = country["data"]["country_code"].toUpperCase()
       

        $("#countrySelect").val(newCountry).change()


      } catch (error) {
          return
      }

      
  
       
    });
   
  
 
// Toastify({
//   text: "",
//   duration: 3000,
//   newWindow: true,
//   close: true,
//   gravity: "top", 
//   position: "left", 
//   stopOnFocus: false, 
//   style: {
//     background: 'grey'
//   } 
// }).showToast();
})




