// earthquake_helper.js
import api from 'usgs-earthquake-api'

// Define your helper functions here
const fetchEarthquakeData = async (lat, long) => {
    const earthquakes = await api.query.earthquakes({ limit: 1, maxdepth: 5 });
    return earthquakes
}

const processEarthquakeData = (data) => {
    return null
}

// Export the helper functions
module.exports = {
    fetchEarthquakeData,
    processEarthquakeData
};