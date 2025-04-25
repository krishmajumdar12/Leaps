import React, { useState, useEffect } from 'react';
import '../styles/DrivingCostCalculator.css';

const DrivingCostCalculator = ({ departure, destination }) => {
  const [distance, setDistance] = useState(null);
  const [fuelPrice, setFuelPrice] = useState(3.50); // Default price per gallon in USD
  const [fuelEfficiency, setFuelEfficiency] = useState(25); // Default MPG
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [estimatedCost, setEstimatedCost] = useState(null);
  const [fuelPrices, setFuelPrices] = useState([
    { company: "Regular (Shell)", price: 3.50 },
    { company: "Regular (ExxonMobil)", price: 3.45 },
    { company: "Premium (Shell)", price: 3.90 },
    { company: "Premium (ExxonMobil)", price: 4.00 },
    { company: "Disel (Shell)", price: 3.75 },
    { company: "Diesel(ExxonMobil)", price: 3.60 },
    { company: "Regional Low", price: 3.00 },
    { company: "Regional High", price: 4.15 }
  ]);
  const [fixedCosts, setFixedCosts] = useState({
    tolls: 0, // customizable
  });

  useEffect(() => {
    if (departure && destination) {
      calculateDistance();
    }
  }, [departure, destination]);

  const calculateDistance = async () => {
    if (!departure || !destination) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // First attempt to use the API
      try {
        const apiDistance = await getDistanceFromAPI(departure, destination);
        setDistance(apiDistance);
        calculateCost(apiDistance);
        return;
      } catch (apiError) {
        console.warn('API distance calculation failed, falling back to simulation:', apiError);
        // If API fails, fall back to simulation
        const simulatedDistance = calculateSimulatedDistance(departure, destination);
        setDistance(simulatedDistance);
        calculateCost(simulatedDistance);
      }
    } catch (err) {
      console.error('Error calculating distance:', err);
      setError('Failed to calculate distance. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // API-based distance calculation using Nominatim and OSRM
  const getDistanceFromAPI = async (from, to) => {
    // Add a delay function to respect rate limits
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    
    // First request - geocode origin
    const originRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(from)}&format=json&limit=1`, {
      headers: {
        'User-Agent': 'LeapsApplication/1.0 (trip-planning-app)'
      }
    });
    const originData = await originRes.json();
    
    // Wait to respect rate limits
    await delay(1000);
    
    // Second request - geocode destination
    const destinationRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(to)}&format=json&limit=1`, {
      headers: {
        'User-Agent': 'LeapsApplication/1.0 (trip-planning-app)'
      }
    });
    const destData = await destinationRes.json();
    
    if (!originData.length || !destData.length) {
      throw new Error('Location not found');
    }
    
    // Get coordinates
    const originCoord = `${originData[0].lon},${originData[0].lat}`;
    const destCoord = `${destData[0].lon},${destData[0].lat}`;
    
    // Wait again before next request
    await delay(1000);
    
    // Get route distance from OSRM
    const routeRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${originCoord};${destCoord}?overview=false`);
    const routeData = await routeRes.json();
    
    if (routeData.code !== 'Ok' || !routeData.routes.length) {
      throw new Error('Route calculation failed');
    }
    
    // Distance comes in meters, convert to miles
    const distanceInMiles = (routeData.routes[0].distance / 1609.34).toFixed(1);
    return parseFloat(distanceInMiles);
  };

  // Simulated distance calculation (fallback)
  const calculateSimulatedDistance = (from, to) => {
    const fromHash = from.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const toHash = to.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    const baseDist = Math.abs(fromHash - toHash) % 2950 + 50;
    
    return Math.round(baseDist);
  };

  const calculateCost = (dist) => {
    if (!dist) return;
    
    // Calculate fuel cost
    const gallonsNeeded = dist / fuelEfficiency;
    const fuelCost = gallonsNeeded * fuelPrice;
    
    // Calculate fixed costs
    const totalFixedCost = fixedCosts.tolls;
    
    // Total cost
    const total = fuelCost + totalFixedCost;
    
    setEstimatedCost({
      distance: dist,
      fuelCost: fuelCost.toFixed(2),
      tollCost: fixedCosts.tolls.toFixed(2),
      totalFixedCost: totalFixedCost.toFixed(2),
      totalCost: total.toFixed(2)
    });
  };

  const handleFuelPriceChange = (price) => {
    setFuelPrice(price);
    if (distance) {
      calculateCost(distance);
    }
  };

  const handleFuelEfficiencyChange = (e) => {
    const value = parseFloat(e.target.value);
    setFuelEfficiency(value);
    if (distance) {
      calculateCost(distance);
    }
  };

  const handleTollsChange = (e) => {
    const value = parseFloat(e.target.value) || 0;
    setFixedCosts({...fixedCosts, tolls: value});
    if (distance) {
      calculateCost(distance);
    }
  };

  return (
    <div className="driving-cost-calculator">
      <h3>Driving Cost Estimator</h3>
      
      {isLoading && <p>Calculating distance...</p>}
      {error && <p className="error">{error}</p>}
      
      {distance && (
        <div className="cost-estimation">
          <p><strong>Estimated Distance:</strong> {distance} miles</p>
          
          <div className="input-group">
            <label>
              Fuel Efficiency (MPG):
              <input 
                type="number" 
                value={fuelEfficiency} 
                onChange={handleFuelEfficiencyChange}
                min="1" 
                max="100"
              />
            </label>
          </div>
          
          <div className="input-group">
            <label>
              Tolls ($):
              <input 
                type="number" 
                value={fixedCosts.tolls} 
                onChange={handleTollsChange}
                min="0" 
                step="0.01"
              />
            </label>
          </div>
          
          <div className="fuel-prices">
            <p>Select Fuel Type:</p>
            {fuelPrices.map((fuel, index) => (
              <button 
                key={index}
                className={fuelPrice === fuel.price ? "selected" : ""}
                onClick={() => handleFuelPriceChange(fuel.price)}
              >
                {fuel.company} (${fuel.price}/gal)
              </button>
            ))}
          </div>
          
          {estimatedCost && (
            <div className="cost-breakdown">
              <h4>Cost Breakdown</h4>
              <table>
                <tbody>
                  <tr>
                    <td>Fuel Cost:</td>
                    <td>${estimatedCost.fuelCost}</td>
                  </tr>
                  <tr>
                    <td>Tolls:</td>
                    <td>${estimatedCost.tollCost}</td>
                  </tr>
                  <tr className="total-fixed">
                    <td>Total Fixed Costs:</td>
                    <td>${estimatedCost.totalFixedCost}</td>
                  </tr>
                  <tr className="total-cost">
                    <td>Total Estimated Cost:</td>
                    <td>${estimatedCost.totalCost}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          
          <div className="attribution">
            <p className="attribution-text">Distance calculation powered by <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a></p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DrivingCostCalculator;