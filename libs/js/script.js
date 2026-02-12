// ---------------------------------------------------------
// GLOBAL DECLARATIONS
// ---------------------------------------------------------

var map;

class Preset {
  constructor (country, station, url, code) {
    this.country = country,
    this.station = station,
    this.url = url,
    this.code = code
  }
}

const appState = {
  
  selectedCountry: {
    name: null,
    countryCode: null,
    geoJSON: null,
    radio: null
  },
  myCountry: {
    name: null,
    countryCode: null,
    
  },

  radioPlaying: false,
  radioName: null,
  radioLocation: null,
  streamingUrl: null,
  radioLat: null,
  radioLng: null,
  radioCode: null,
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

function strugglingToLocate() {
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
}

async function randomCountry() {
  let rawCountries = await ajaxCaller("libs/php/populateCountrySelect.php", {})
  let countries = rawCountries["data"]
  let countryCodes = Object.values(countries)
  let countryCode = countryCodes[Math.floor(Math.random() * countryCodes.length)]
   appState.myCountry.countryCode = countryCode;
  $("#countrySelect").val(countryCode).change()
}

let saveBtnAccess;
let trashBtnAccess;

let audio = document.getElementById("radioFrame")

async function stationPicker(){

  if (!appState.selectedCountry.radio || appState.radioLocation !== appState.selectedCountry.name) {
    let radios = await ajaxCaller("libs/php/getRadio.php", {name: appState.selectedCountry.countryCode})
    if (!radios) {
      showError({responseText: "No stations available for this country right now, please select another country"})
      return
    };
    appState.selectedCountry.radio = radios["data"]
  }


  if (appState.selectedCountry.radio.length !== 0) {
  let x = Math.floor(Math.random() * appState.selectedCountry.radio.length)
  appState.streamingUrl = appState.selectedCountry.radio[x]['url'];
  appState.radioName = appState.selectedCountry.radio[x]['name'];
  appState.radioLat = appState.selectedCountry.radio[x]['geo_lat']
  appState.radioLng = appState.selectedCountry.radio[x]['geo_long']
  appState.radioCode = appState.selectedCountry.radio[x]["countrycode"]
  appState.radioLocation = appState.selectedCountry.radio[x]["country"]
  } else {
    showError({responseText: "No stations available for this country right now, please select another country"})
  }
  }


const canPlay = (streamingUrl) => {
  return new Promise((resolve, reject)=> {
    // security to guard against race conditions
    let settled = false;
    audio.pause()
    audio.src = ""
    audio.load()
    
    audio.src = streamingUrl;
    audio.load()

    const timer = setTimeout(() => {
      reject()
    }, 1500)

    const cleanUp = () => {
      clearTimeout(timer)
      audio.removeEventListener('canplay', onSuccess)
      
      audio.removeEventListener('playing', onSuccess)
      audio.removeEventListener('stalled', onFailure)
      audio.removeEventListener('suspend', onFailure)

      audio.removeEventListener('error', onFailure)
    }

    const onSuccess = () => {
      if (settled) return;
      settled = true;
        cleanUp()
        resolve();
    }

    const onFailure = () => {
      if (settled) return;
      settled = true;
      cleanUp()
      reject()
    }

    audio.addEventListener("canplay", onSuccess, { once: true })
    audio.addEventListener("playing", onSuccess, { once: true })
    audio.addEventListener("error", onFailure, { once: true })
    audio.addEventListener("stalled", onFailure, { once: true })
    audio.addEventListener("suspend", onFailure, { once: true })

  })
}

async function stationPlayer(attempts=20) {

  for (let i = 0; i < attempts; i++) {
    try {
      await canPlay(appState.streamingUrl)
      await audio.play()
      return true;
    } catch {
      
      await stationPicker() 
    }
  }
    showError({responseText: "No stations available for this country right now, please select another country"})
    return false;
}


function placeStation() {
  
  
  if (appState.radioLat && appState.radioLng) {   
    L.popup()
    .setLatLng([appState.radioLat, appState.radioLng])
    .setContent(appState.radioName)
    .openOn(map);
     
  }
}


function playPreset(preset) {
  let {country, station, url, code} = preset;
  $("#radioFrame").attr("src", url)
  $("#radioInfo").html(`Listen to ${station} from ${country}`)
  $("#radioPlayer").removeClass("d-none")
  appState.radioLocation = country;
  appState.radioName = station;
  appState.streamingUrl = url;
  appState.radioCode = code;
  appState.radioPlaying = true;
  $("#radioFrame")[0].play()
  console.log(appState)
  if (appState.radioCode) {
     $("#countrySelect").val(appState.radioCode).change()
  }
 
  
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
  hidePreloader()
  
 
});

var instructionsBtn = L.easyButton({
  position: "topright",
  states: [{
    icon: "fa-info",
    onClick: () => instructionsModal.show()
  }]
});

var randomBtn = L.easyButton({
  position: "topright",
  states: [{
    icon: "fa-shuffle",
    onClick: async () => {
      await randomCountry()
      await stationPicker()
      const playing = await stationPlayer()
    if (playing) {
      $("#radioInfo").html(`Listen to ${appState.radioName} from ${appState.radioLocation}`)
      appState.radioPlaying = true;
    }
    // placeStation()

    }
  }]
});

 
var homeBtn = L.easyButton( "fa-home", function (btn, map) {
  $("#countrySelect").val(appState.myCountry.countryCode).change()
});


var saveBtn = L.easyButton("fa-floppy-disk", function (btn) {
  saveBtnAccess = btn.button
  appState.saving = !appState.saving
  appState.saving ? saveBtnAccess.classList.add("active") : saveBtnAccess.classList.remove("active") 
})


var trashBtn = L.easyButton("fa-trash", function (btn){
  trashBtnAccess = btn.button
  appState.deleting = !appState.deleting
  appState.deleting ? trashBtnAccess.classList.add("active") : trashBtnAccess.classList.remove("active") 
})

function makePresetButton({icon, name}) {
  const btn = L.easyButton(icon, (btn) => {
    if (appState.saving) {
      let preset = new Preset(appState.radioLocation, appState.radioName, appState.streamingUrl, appState.radioCode)
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
    name: appState.radioName,
    code: appState.radioCode,
  }
  let shareableParams = new URLSearchParams(params)
  let link= `${window.location.origin}${window.location.pathname}?${shareableParams}`
  $("#shareText").val(`Listen to ${appState.radioName} from ${appState.radioLocation} on the World Radio Tuner: ${link}`)
  shareModal.show()
})


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

  // populate country select
  $('#countrySelect').empty();
  let rawCountries = await ajaxCaller("libs/php/populateCountrySelect.php", {})
  let countries = rawCountries["data"]

  		for (let key in countries) {
        $('#countrySelect').append('<option value="' + countries[key] + '">' + key + '</option>')
      }  
  


   // initialise myCountry, selectedCountry and countrySelect based on location
  navigator.geolocation.getCurrentPosition( async (pos) => {
   
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
  
    let countryFromCoords= await ajaxCaller("libs/php/getCountryFromCoords.php", {lat: lat, lng: lng})
    if (!countryFromCoords || !countryFromCoords["data"] ){
      randomCountry()
      strugglingToLocate()
      appState.myCountry.countryCode = appState.selectedCountry.countryCode;
      appState.myCountry.name = appState.selectedCountry.name;
    
      hidePreloader()
      return;
  } 
    

    appState.myCountry.countryCode = countryFromCoords['data']["country_code"].toUpperCase();
    appState.myCountry.name = countryFromCoords['data']["name"];  
    
    // when ajax call complete copy myCountry into selectedCountry to initialise it if it's empty
    
    appState.selectedCountry.name = appState.myCountry.name;
    appState.selectedCountry.countryCode = appState.myCountry.countryCode;
    
  
    $("#countrySelect").val(appState.myCountry.countryCode).change();
    
    // first check if preset is shared in url , if so play that
    const params = new URLSearchParams(window.location.search);
    
    if(params.toString()) {
      
      appState.radioLocation = params.get("country");
      appState.streamingUrl = params.get("url");
      appState.radioName = params.get("name");
      appState.radioCode = params.get("code");
      let thisPreset = new Preset(appState.radioLocation, appState.radioName, appState.streamingUrl, appState.radioCode)
      playPreset(thisPreset)
     
      return
      } 
    
   
      
  }, (error) => {
    randomCountry()
    strugglingToLocate()
    appState.myCountry.countryCode = appState.selectedCountry.countryCode;
    appState.myCountry.name = appState.selectedCountry.name;
    hidePreloader()
    return;
  }, {
  enableHighAccuracy: false,
  timeout: 3000,
  maximumAge: 60000
})

  let layerControl = L.control.layers(basemaps).addTo(map);
 	
  instructionsBtn.addTo(map)
  homeBtn.addTo(map)
  randomBtn.addTo(map)
 

  makePresetButton({icon:"fa-1", name: "preset1"})
  makePresetButton({icon:"fa-2", name: "preset2"})
  makePresetButton({icon:"fa-3", name: "preset3"})
  saveBtn.addTo(map)
  trashBtn.addTo(map)
  shareBtn.addTo(map)
  

  errorModal = new bootstrap.Modal(document.getElementById('errorModal'))
  shareModal = new bootstrap.Modal(document.getElementById("shareModal"))
  instructionsModal = new bootstrap.Modal(document.getElementById("instructionsModal"))

  

  $("#scanBtn").on("click", async () => {

    if ($("#scanBtn").prop("disabled")) return;

    $("#scanBtn").prop("disabled", true).html('<i class="fa fa-spinner fa-spin"></i>');
    
    await stationPicker()
    const playing = await stationPlayer()

    if (playing) {
    
    $("#radioInfo").html(`Listen to ${appState.radioName} from ${appState.radioLocation}`)
    appState.radioPlaying = true;
    }
   
    
    $("#scanBtn").prop("disabled", false).html("Scan");

  
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
   
  
 
Toastify({
  text: "Welcome to the World Radio Tuner",
  duration: 3000,
  newWindow: true,
  close: true,
  gravity: "top", 
  position: "left", 
  stopOnFocus: false, 
  style: {
    background: 'grey'
  } 
}).showToast();
})




