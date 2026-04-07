/**
 * Weather App for Digital Signage
 * Powered by Open-Meteo (No API Key Required)
 */

const CONFIG = {
    UPDATE_INTERVAL: 15 * 60 * 1000, // Update every 15 minutes
    CLOCK_INTERVAL: 1000,           // Update clock every second
    DEFAULT_LOCATION: {
        lat: 51.5074,
        lon: -0.1278,
        name: 'London, UK'
    },
    BACKGROUNDS: {
        sunny: 'https://skoop-dev-code-agent.s3.us-east-1.amazonaws.com/n8n-continue%2Faigen-1775552415081%2Fassets%2Fweather_background_sunny-1775552479446.png',
        // Fallbacks for other states if needed
        cloudy: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?q=80&w=1920&h=1080&fit=crop',
        rainy: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=1920&h=1080&fit=crop',
        snowy: 'https://images.unsplash.com/photo-1478265409131-1f65c88f965c?q=80&w=1920&h=1080&fit=crop'
    }
};

// Weather Code Mapping (WMO Code)
const WEATHER_CODES = {
    0: { label: 'Clear Sky', bg: 'sunny' },
    1: { label: 'Mainly Clear', bg: 'sunny' },
    2: { label: 'Partly Cloudy', bg: 'cloudy' },
    3: { label: 'Overcast', bg: 'cloudy' },
    45: { label: 'Fog', bg: 'cloudy' },
    48: { label: 'Depositing Rime Fog', bg: 'cloudy' },
    51: { label: 'Light Drizzle', bg: 'rainy' },
    53: { label: 'Moderate Drizzle', bg: 'rainy' },
    55: { label: 'Dense Drizzle', bg: 'rainy' },
    61: { label: 'Slight Rain', bg: 'rainy' },
    63: { label: 'Moderate Rain', bg: 'rainy' },
    65: { label: 'Heavy Rain', bg: 'rainy' },
    71: { label: 'Slight Snow Fall', bg: 'snowy' },
    73: { label: 'Moderate Snow Fall', bg: 'snowy' },
    75: { label: 'Heavy Snow Fall', bg: 'snowy' },
    80: { label: 'Slight Rain Showers', bg: 'rainy' },
    81: { label: 'Moderate Rain Showers', bg: 'rainy' },
    82: { label: 'Violent Rain Showers', bg: 'rainy' },
    95: { label: 'Thunderstorm', bg: 'rainy' }
};

class WeatherApp {
    constructor() {
        this.elements = {
            clockTime: document.getElementById('clockTime'),
            clockDate: document.getElementById('clockDate'),
            locationName: document.getElementById('locationName'),
            currentTemp: document.getElementById('currentTemp'),
            weatherCondition: document.getElementById('weatherCondition'),
            humidity: document.getElementById('humidityValue'),
            wind: document.getElementById('windValue'),
            precip: document.getElementById('precipValue'),
            feelsLike: document.getElementById('feelsLikeValue'),
            forecastList: document.getElementById('forecastList'),
            bgImage: document.getElementById('bgImage'),
            loadingScreen: document.getElementById('loadingScreen')
        };

        this.init();
    }

    init() {
        this.updateClock();
        setInterval(() => this.updateClock(), CONFIG.CLOCK_INTERVAL);

        this.fetchWeatherData();
        setInterval(() => this.fetchWeatherData(), CONFIG.UPDATE_INTERVAL);

        // Try to get user location
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.updateLocation(position.coords.latitude, position.coords.longitude);
                },
                () => {
                    console.log("Using default location");
                    this.updateLocation(CONFIG.DEFAULT_LOCATION.lat, CONFIG.DEFAULT_LOCATION.lon, CONFIG.DEFAULT_LOCATION.name);
                }
            );
        } else {
            this.updateLocation(CONFIG.DEFAULT_LOCATION.lat, CONFIG.DEFAULT_LOCATION.lon, CONFIG.DEFAULT_LOCATION.name);
        }
    }

    updateClock() {
        const now = new Date();

        // Time
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        this.elements.clockTime.textContent = `${hours}:${minutes}`;

        // Date
        const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
        this.elements.clockDate.textContent = now.toLocaleDateString('en-US', options);
    }

    async updateLocation(lat, lon, name = null) {
        this.currentLocation = { lat, lon };

        if (!name) {
            try {
                // Reverse geocoding (OpenStreetMap Nominatim - Free, no key)
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, {
                    headers: { 'User-Agent': 'WeatherSignageApp/1.0' }
                });
                const data = await response.json();
                const city = data.address.city || data.address.town || data.address.village || data.address.suburb || 'Current Location';
                const country = data.address.country;
                this.elements.locationName.textContent = `${city}, ${country}`;
            } catch (e) {
                this.elements.locationName.textContent = name || 'Current Location';
            }
        } else {
            this.elements.locationName.textContent = name;
        }

        this.fetchWeatherData();
    }

    async fetchWeatherData() {
        if (!this.currentLocation) return;

        const { lat, lon } = this.currentLocation;
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;

        try {
            const response = await fetch(url, { cache: 'no-store' });
            const data = await response.json();
            this.updateUI(data);

            // Hide loading screen on first success
            setTimeout(() => {
                this.elements.loadingScreen.classList.add('hidden');
            }, 500);
        } catch (error) {
            console.error('Error fetching weather:', error);
        }
    }

    updateUI(data) {
        const current = data.current;
        const weatherInfo = WEATHER_CODES[current.weather_code] || { label: 'Unknown', bg: 'sunny' };

        // Current Weather
        this.elements.currentTemp.textContent = Math.round(current.temperature_2m);
        this.elements.weatherCondition.textContent = weatherInfo.label;
        this.elements.humidity.textContent = `${Math.round(current.relative_humidity_2m)}%`;
        this.elements.wind.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
        this.elements.precip.textContent = `${current.precipitation} mm`;
        this.elements.feelsLike.textContent = `${Math.round(current.apparent_temperature)}°C`;

        // Update Background
        const bgUrl = CONFIG.BACKGROUNDS[weatherInfo.bg] || CONFIG.BACKGROUNDS.sunny;
        this.elements.bgImage.style.backgroundImage = `url('${bgUrl}')`;

        // Forecast
        this.updateForecast(data.daily);
    }

    updateForecast(daily) {
        this.elements.forecastList.innerHTML = '';

        // Next 5 days
        for (let i = 1; i < 6; i++) {
            const date = new Date(daily.time[i]);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            const weatherInfo = WEATHER_CODES[daily.weather_code[i]] || { label: 'Unknown' };
            const maxTemp = Math.round(daily.temperature_2m_max[i]);
            const minTemp = Math.round(daily.temperature_2m_min[i]);

            const forecastItem = document.createElement('div');
            forecastItem.className = 'forecast-item';
            forecastItem.innerHTML = `
                <span class="forecast-day">${dayName}</span>
                <span class="forecast-temp">${maxTemp}° / ${minTemp}°</span>
                <span class="forecast-condition">${weatherInfo.label}</span>
            `;
            this.elements.forecastList.appendChild(forecastItem);
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new WeatherApp();
});
