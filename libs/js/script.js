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


// ---------------------------------------------------------
// GLOBAL DECLARATIONS
// ---------------------------------------------------------

var map;

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
  radioLocation: null
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


function showError(error) {
  $("#errorTitle").html(error.message || error.statusText || "Error")
  $("#errorText").html(error.description || error.responseText || "Network Error")
  errorModal.show()
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


// wrapper for ajax caller to give error messages. need to fix + improve

const markerLayer = (obj, target, icon) => {
  
  target.clearLayers()
  for (const [key, value] of Object.entries(obj)) {
    let name = value["name"];
    let lat = value["lat"];
    let lng = value["lng"];
   
    L.marker([lat, lng], {icon : icon}).bindTooltip(name).addTo(target);
  }
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


function playRadio(stationArray) {
  // filter out stations that force download and don't stream well in iframe
  let filteredArray = stationArray.filter(station => !station.url.includes("m3u"))
  let x = Math.floor(Math.random() * filteredArray.length)
  let streamingUrl = filteredArray[x]['url'];
  let radioName = filteredArray[x]['name']
  
  $("#radioFrame").attr("src", streamingUrl)
  $("#radioInfo").html(`Listen to ${radioName} from ${appState.selectedCountry.name}`)
  $("#radioPlayer").removeClass("d-none")
  appState.radioPlaying = true;
  
}

function stopRadio () {
  $("#radioFrame")[0].pause()
  $("#radioPlayer").addClass("d-none")
  appState.radioPlaying = false;
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
 
});
 
var homeBtn = L.easyButton( "fa-home", function (btn, map) {
  $("#countrySelect").val(appState.myCountry.countryCode).change()
});



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
$(window).on('load', function () { 
  if ($('#preloader').length) {
    $('#preloader').delay(1000).fadeOut('slow', function () { $(this).remove();}); 
  }
  });

$(document).ready( async function () {
  
  map = L.map("map", {
    layers: [satellite],
    worldCopyJump: true
  })

  

   // initialise myCountry, selectedCountry and countrySelect based on location
  navigator.geolocation.getCurrentPosition( async (pos) => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
  
    let countryFromCoords= await ajaxCaller("libs/php/getCountryFromCoords.php", {lat: lat, lng: lng})
    if (!countryFromCoords) return;
    
    

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
    let radios = await ajaxCaller("libs/php/getRadio.php", {name: appState.selectedCountry.countryCode})
  
    if (!radios) return;

    appState.selectedCountry.radio = radios["data"]

  // this will help later to see if user has changed country
    appState.radioLocation = appState.selectedCountry.countryCode;
    playRadio(appState.selectedCountry.radio)
    
  })

  let layerControl = L.control.layers(basemaps).addTo(map);
 	
  homeBtn.addTo(map);
  radioBtn.addTo(map)


  errorModal = new bootstrap.Modal(document.getElementById('errorModal'))

  // populate country select
  let rawCountries = await ajaxCaller("libs/php/populateCountrySelect.php", {})
  let countries = rawCountries["data"]

  		for (let key in countries) {
        $('#countrySelect').append('<option value="' + countries[key] + '">' + key + '</option>')
      }  
  
  

  $("#scanBtn").on("click", async () => {
    if (appState.radioLocation !== appState.selectedCountry.countryCode) {
      let result = await ajaxCaller("libs/php/getRadio.php", {name: appState.selectedCountry.countryCode})
      if (!result) return;
      appState.selectedCountry.radio = result["data"]
    }
    playRadio(appState.selectedCountry.radio)
     $("#radioFrame")[0].play()
  })
  
  $('audio').on('error', () => {
    // scan on error
    playRadio(appState.selectedCountry.radio)
  }) 

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




