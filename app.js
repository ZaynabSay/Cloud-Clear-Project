// Cloud & Clear — Worldwide Weather App
// My first web development project!
// Built using: HTML, CSS & JavaScript only
// API key you paste it once, it stays private in browser

const OW_API_KEY = localStorage.getItem("OW_API_KEY") || prompt("Paste OpenWeatherMap API key (free at OpenWeatherMap.org)");

// Save key if user entered something valid
if (OW_API_KEY && OW_API_KEY.length > 10 && !OW_API_KEY.includes(" ")) {
    localStorage.setItem("OW_API_KEY", OW_API_KEY);
} else {
    alert("You need a valid API key from OpenWeatherMap.org for the app to work.");
}

// Map overlay links like clouds, rain, temperature
const OW_TILES = {
    clouds:   "https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png",
    rain:     "https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png",
    temp:     "https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png",
    wind:     "https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png",
    pressure: "https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png"
};

// Where get weather data from
const WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";
const FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast";
const GEO_URL     = "https://api.openweathermap.org/geo/1.0/direct";

// All HTML elements we need to update
const cityInput     = document.getElementById("cityInput");
const searchBtn     = document.getElementById("searchBtn");
const cityName      = document.getElementById("cityName");
const temperature   = document.getElementById("temperature");
const description   = document.getElementById("description");
const humidity      = document.getElementById("humidity");
const wind          = document.getElementById("wind");
const coordsLat     = document.getElementById("coordsLat");
const coordsLon     = document.getElementById("coordsLon");
const lastUpdate    = document.getElementById("lastUpdate");
const clockDisplay  = document.getElementById("utcClock");
const syncStatus    = document.getElementById("syncStatus");
const weatherCard   = document.getElementById("weatherCard");
const loading       = document.getElementById("loading");
const errorBox      = document.getElementById("error");
const errorText     = document.getElementById("error-text");
const forecastGrid  = document.getElementById("forecastGrid");

// Overlay toggle buttons
const layerClouds   = document.getElementById("layer-clouds");
const layerRain     = document.getElementById("layer-rain");
const layerTemp     = document.getElementById("layer-temp");
const layerWind     = document.getElementById("layer-wind");
const layerPressure = document.getElementById("layer-pressure");

// Variables
let map;
let cityMarker;
let isSpinning = true;

// Weather icons for forecast
function getWeatherIcon(code) {
    if (code >= 200 && code < 300) return "⛈️";
    if (code >= 300 && code < 600) return "🌧️";
    if (code >= 600 && code < 700) return "❄️";
    if (code >= 700 && code < 800) return "🌫️";
    if (code === 800) return "☀️";
    if (code === 801) return "🌤️";
    if (code === 802) return "⛅";
    return "☁️";
}

// Update UK time clock
function updateClock() {
    const now = new Date();
    clockDisplay.textContent = now.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/London"
    }) + " UK";
}

// Set up globe when page loads
function initGlobe() {
    map = new maplibregl.Map({
        container: "globe",
        style: {
            version: 8,
            sources: {
                "satellite-base": {
                    type: "raster",
                    tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
                    tileSize: 256
                }
            },
            layers: [{ id: "satellite-layer", type: "raster", source: "satellite-base" }]
        },
        projection: "globe",
        zoom: 1.3,
        center: [0, 15]
    });

    map.on("load", () => {
        console.log("Globe loaded! Search any city, state or country.");
        spinGlobe();
        bindLayerToggles();
        updateClock();
        setInterval(updateClock, 1000);
    });

    // Stop spinning if user interacts with globe
    map.on("mousedown", () => { isSpinning = false; });
}

// Turn map overlays on/off
function addOverlay(layerId, tileTemplate, visible) {
    const srcId = layerId + "-source";
    const tileUrl = tileTemplate + "?appid=" + OW_API_KEY;

    if (map.getLayer(layerId))  map.removeLayer(layerId);
    if (map.getSource(srcId))    map.removeSource(srcId);

    if (visible) {
        map.addSource(srcId, {
            type: "raster",
            tiles: [tileUrl],
            tileSize: 256
        });
        map.addLayer({
            id: layerId,
            type: "raster",
            source: srcId,
            paint: { "raster-opacity": 0.65 }
        });
    }
}

function bindLayerToggles() {
    layerClouds.addEventListener("change",   e => addOverlay("clouds",   OW_TILES.clouds,   e.target.checked));
    layerRain.addEventListener("change",     e => addOverlay("rain",     OW_TILES.rain,     e.target.checked));
    layerTemp.addEventListener("change",     e => addOverlay("temp",     OW_TILES.temp,     e.target.checked));
    layerWind.addEventListener("change",     e => addOverlay("wind",     OW_TILES.wind,     e.target.checked));
    layerPressure.addEventListener("change", e => addOverlay("pressure", OW_TILES.pressure, e.target.checked));
}

// Get 3 day forecast
async function loadForecast(lat, lon) {
    try {
        const res = await fetch(`${FORECAST_URL}?lat=${lat}&lon=${lon}&appid=${OW_API_KEY}&units=metric`);
        if (!res.ok) return;
        const data = await res.json();

        const daily = {};
        data.list.forEach(entry => {
            const date = entry.dt_txt.split(" ")[0];
            const hour = parseInt(entry.dt_txt.split(" ")[1]);
            if (!daily[date] || Math.abs(hour - 12) < Math.abs(parseInt(daily[date].hour) - 12)) {
                daily[date] = { temp: entry.main.temp, hour: hour, code: entry.weather[0].id };
            }
        });

        const days = Object.keys(daily).slice(0, 3);
        const dayNames = ["Today", "Tomorrow", "Next Day"];
        forecastGrid.innerHTML = "";
        days.forEach((d, i) => {
            const info = daily[d];
            forecastGrid.innerHTML += `
                <div class="forecast-card">
                    <div class="forecast-day">${dayNames[i]}</div>
                    <div class="forecast-icon">${getWeatherIcon(info.code)}</div>
                    <div class="forecast-temp">${Math.round(info.temp)}°C</div>
                </div>
            `;
        });
    } catch (err) {
        console.log("Forecast error:", err);
    }
}

// Get current weather data
async function loadWeather(lat, lon, displayName) {
    try {
        syncStatus.textContent = "SYNCING...";
        syncStatus.style.color = "#f59e0b";

        const url = `${WEATHER_URL}?lat=${lat}&lon=${lon}&appid=${OW_API_KEY}&units=metric`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Weather data unavailable");
        const data = await res.json();

        cityName.textContent    = displayName;
        temperature.textContent = Math.round(data.main.temp) + "°C";
        description.textContent = data.weather[0].description.toUpperCase();
        humidity.textContent    = data.main.humidity + "%";
        wind.textContent        = (data.wind.speed * 3.6).toFixed(1) + " km/h";

        const now = new Date();
        lastUpdate.textContent = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

        syncStatus.textContent = "✓ SYNCED";
        syncStatus.style.color = "#22c55e";
        weatherCard.classList.remove("hidden");

        loadForecast(lat, lon);
    } catch (err) {
        syncStatus.textContent = "⚠ ERROR";
        syncStatus.style.color = "#ef4444";
        throw err;
    }
}

// Search ANY city state or country worldwide
async function findLocation(query) {
    const q = query.trim();

    let res = await fetch(`${GEO_URL}?q=${encodeURIComponent(q)}&limit=10&appid=${OW_API_KEY}`);
    let locations = await res.json();

    // Common country shortcuts
    if (!locations || locations.length === 0) {
        const countryToCapital = {
            "uk": "London", "united kingdom": "London", "britain": "London",
            "usa": "Washington", "united states": "Washington", "america": "Washington",
            "france": "Paris", "spain": "Madrid", "germany": "Berlin",
            "italy": "Rome", "japan": "Tokyo", "china": "Beijing",
            "india": "New Delhi", "brazil": "Brasilia", "australia": "Canberra",
            "canada": "Ottawa", "russia": "Moscow", "mexico": "Mexico City",
            "south korea": "Seoul", "turkey": "Ankara", "egypt": "Cairo"
        };
        const better = countryToCapital[q.toLowerCase()];
        if (better) {
            res = await fetch(`${GEO_URL}?q=${encodeURIComponent(better)}&limit=5&appid=${OW_API_KEY}`);
            locations = await res.json();
        }
    }

    return locations || [];
}

// Main search function
searchBtn.addEventListener("click", runSearch);
cityInput.addEventListener("keypress", e => { if (e.key === "Enter") runSearch(); });

async function runSearch() {
    const query = cityInput.value.trim();
    if (!query) return;

    loading.classList.remove("hidden");
    weatherCard.classList.add("hidden");
    errorBox.classList.add("hidden");
    if (cityMarker) cityMarker.remove();

    try {
        const locations = await findLocation(query);

        if (!locations || locations.length === 0) {
            throw new Error(`Could not find "${query}" — try city, state or country`);
        }

        // Pick most populated match
        let match = locations[0];
        for (const loc of locations) {
            if ((loc.population || 0) > (match.population || 0)) {
                match = loc;
            }
        }

        const { lat, lon, name, country, state } = match;

        // Format country names 
        const countryNames = {
            "GB": "United Kingdom", "US": "United States", "ES": "Spain",
            "FR": "France", "DE": "Germany", "IT": "Italy", "JP": "Japan",
            "CN": "China", "IN": "India", "BR": "Brazil", "AU": "Australia",
            "CA": "Canada", "RU": "Russia", "MX": "Mexico", "KR": "South Korea",
            "TR": "Turkey", "EG": "Egypt"
        };
        const countryLabel = countryNames[country] || country;

        let displayName = name;
        if (state) displayName += `, ${state}`;
        displayName += `, ${countryLabel}`;

        // Fly globe to location
        map.flyTo({ center: [lon, lat], zoom: 8, duration: 3000 });

        coordsLat.textContent = `${lat.toFixed(2)}°${lat >= 0 ? "N" : "S"}`;
        coordsLon.textContent = `${Math.abs(lon).toFixed(2)}°${lon >= 0 ? "E" : "W"}`;

        setTimeout(() => {
            cityMarker = new maplibregl.Marker().setLngLat([lon, lat]).addTo(map);
        }, 3000);

        await loadWeather(lat, lon, displayName);

    } catch (err) {
        errorText.textContent = err.message;
        errorBox.classList.remove("hidden");
    } finally {
        setTimeout(() => loading.classList.add("hidden"), 3000);
    }
}

// Auto-spin globe when idle
function spinGlobe() {
    if (!isSpinning || !map) return;
    const center = map.getCenter();
    center.lng += 0.05;
    map.setCenter(center);
    requestAnimationFrame(spinGlobe);
}

// Start everything when page loads
document.addEventListener("DOMContentLoaded", () => {
    if (!OW_API_KEY || OW_API_KEY.length < 10) {
        alert("Get your free API key from OpenWeatherMap.org and paste it when prompted!");
    }
    initGlobe();
    updateClock();
});
