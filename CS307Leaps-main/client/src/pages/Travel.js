import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Travel.css";
import { findSimilarItems, isBetterDeal, calculateSavings } from "../utils/comparisonUtils";
import { isAuthenticated, isGuest } from "../services/authService"; 
import AuthPrompt from "../components/AuthPrompt";

const Travel = () => {
    const [travelItems, setTravelItems] = useState([]);
    const [travelOptions, setTravelOptions] = useState([]);
    const [trips, setTrips] = useState([]);
    const [selectedTravel, setSelectedTravel] = useState(null);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
    const [similarOptions, setSimilarOptions] = useState([]);
    const [selectedTripId, setSelectedTripId] = useState(null);
    const [departureFilter, setDepartureFilter] = useState("");
    const [destinationFilter, setDestinationFilter] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [isDrivingModalOpen, setIsDrivingModalOpen] = useState(false);
    const [departureLocation, setDepartureLocation] = useState('');
    const [destination, setDestination] = useState('');
    const [departureDate, setDepartureDate] = useState('');
    const [arrivalDate, setArrivalDate] = useState('');
    const [newDriving, setNewDriving] = useState({
        type: 'Driving',
        departure_location: '',
        arrival_location: '',
        departure: new Date().toISOString().split('T')[0] + 'T08:00',
        arrival: new Date().toISOString().split('T')[0] + 'T10:00',
        price: 0,
        notes: 'Personal vehicle'
    });
    const token = localStorage.getItem('token');
    const [showAuthPrompt, setShowAuthPrompt] = useState(false);
    const navigate = useNavigate();

    // Fetch travel options and trips
    useEffect(() => {
        const fetchTravelOptions = async () => {
            try {
                const response = await fetch('https://leaps-ohwd.onrender.com/api/travel', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) throw new Error('Failed to fetch travel options');

                const data = await response.json();
                setTravelOptions(data);
            } catch (err) {
                console.error('Error fetching travel options:', err);
                setError('Failed to load travel options');
            } finally {
                setIsLoading(false);
            }
        };

        const fetchTrips = async () => {
            if (token) {
                try {
                    const response = await fetch('https://leaps-ohwd.onrender.com/api/trips', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        setTrips(Array.isArray(data) ? data : []);
                    }
                } catch (err) {
                    console.error('Error fetching trips:', err);
                }
            }
        };

        fetchTravelOptions();
        fetchTrips();
    }, [token]);

    const handleAddToTrip = (travel) => {
        setSelectedTravel(travel);
        setIsModalOpen(true);
    }
    const handleOpenDrivingModal = () => {
        if (!isAuthenticated()) {
            setShowAuthPrompt(true);
        } else {
            setIsDrivingModalOpen(true);
        }
    };

    const handleDrivingInputChange = (e) => {
        const { name, value } = e.target;
        setNewDriving({
            ...newDriving,
            [name]: value
        });
    };

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getDistanceFromAPI = async (from, to) => {
  // 1. Geocode origin
  const originRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(from)}&format=json&limit=1`, {
    headers: {
      'User-Agent': 'LeapsApp/1.0'
    }
  });
  const originData = await originRes.json();
  await delay(1000); // respect rate limit

  // 2. Geocode destination
  const destRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(to)}&format=json&limit=1`, {
    headers: {
      'User-Agent': 'LeapsApp/1.0'
    }
  });
  const destData = await destRes.json();
  await delay(1000); // respect rate limit

  if (!originData.length || !destData.length) throw new Error("Location not found");

  const originCoord = `${originData[0].lon},${originData[0].lat}`;
  const destCoord = `${destData[0].lon},${destData[0].lat}`;

  // 3. Get driving distance from OSRM
  const routeRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${originCoord};${destCoord}?overview=false`);
  const routeData = await routeRes.json();

  if (routeData.code !== 'Ok' || !routeData.routes.length) {
    throw new Error("Routing failed");
  }

  const distanceInMiles = routeData.routes[0].distance / 1609.34;
  return parseFloat(distanceInMiles.toFixed(1));
};

const calculateDrivingCost = ({ distance, fuelPrice = 3.5, fuelEfficiency = 25, tolls = 0 }) => {
  const gallonsNeeded = distance / fuelEfficiency;
  const fuelCost = gallonsNeeded * fuelPrice;
  const total = fuelCost + tolls;
  return {
    fuelCost: fuelCost.toFixed(2),
    tollCost: tolls.toFixed(2),
    totalCost: total.toFixed(2),
    distance: distance.toFixed(1)
  };
};

    const handleCreateDriving = async () => {
        if (!newDriving.departure_location || !newDriving.arrival_location) {
            alert('Please enter both departure and arrival locations');
            return;
        }

        try {
            const distance = await getDistanceFromAPI(
                newDriving.departure_location,
                newDriving.arrival_location
            );

            const costEstimate = calculateDrivingCost({
                distance,
                fuelPrice: 3.5,
                fuelEfficiency: 25,
                tolls: 0
            });

            const drivingData = {
                ...newDriving,
                price: parseFloat(costEstimate.totalCost),
                notes: `${newDriving.notes} (Est. distance: ${costEstimate.distance} mi)`
            };

            const response = await fetch('https://leaps-ohwd.onrender.com/api/travel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(drivingData)
            });
            if (!response.ok) {
                throw new Error('Failed to create driving option');
            }

            const createdDriving = await response.json();
            setTravelOptions((prev) => [createdDriving, ...prev]);

            setIsDrivingModalOpen(false);
            setNewDriving({
                type: 'Driving',
                departure_location: '',
                arrival_location: '',
                departure: new Date().toISOString().split('T')[0] + 'T08:00',
                arrival: new Date().toISOString().split('T')[0] + 'T10:00',
                price: 0,
                notes: 'Personal vehicle'
            });

            alert('Driving route added successfully!');
        } catch (err) {
            console.error('Error creating driving option:', err);
            setError('Failed to create driving option. Please try again.');
        }
    };

    const handleAddToTripClick = (travel) => {
        if (!isAuthenticated()) {
            setShowAuthPrompt(true);
        } else {
            setSelectedTravel(travel);
            setIsModalOpen(true);
        }
    };

    const confirmAddToTrip = async (tripId) => {
        try {
            const response = await fetch('https://leaps-ohwd.onrender.com/api/trips/add-item', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ tripId, itemType: 'travel', itemId: selectedTravel.id, price: selectedTravel.price })
            });

            if (!response.ok) throw new Error('Failed to add travel to trip');

            setSelectedTripId(tripId);
            setIsModalOpen(false);
            alert("Travel added to trip!");
        } catch (err) {
            setError("Failed to add travel to trip");
        }
    };

    const handleCompare = (travel) => {
        setSelectedTravel(travel);

        const similar = findSimilarItems(travelOptions, travel);

        const sorted = [...similar].sort((a, b) => a.price - b.price);

        setSimilarOptions(sorted);
        setIsCompareModalOpen(true);
    };

    const handleSwap = async (newTravel) => {
        if (!selectedTripId) {
            alert("Please add your original selection to a trip first");
            setIsCompareModalOpen(false);
            return;
        }

        try {
            const removeResponse = await fetch(`https://leaps-ohwd.onrender.com/api/trips/items/${selectedTripId}/travel/${selectedTravel.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const addResponse = await fetch('https://leaps-ohwd.onrender.com/api/trips/add-item', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ tripId: selectedTripId, itemType: 'travel', itemId: newTravel.id })
            });

            alert(`Swapped ${selectedTravel.type} with ${newTravel.type}`);
            setIsCompareModalOpen(false);
        } catch (err) {
            setError("Failed to swap travel option");
        }
    };

    const formatDateTime = (dateTimeStr) => {
        const date = new Date(dateTimeStr);
        return date.toLocaleString();
    };

    const filteredTravelOptions = travelOptions.filter(travel => {
        const matchesDeparture = departureFilter
            ? travel.departure_location.toLowerCase().includes(departureFilter.toLowerCase())
            : true;
        const matchesDestination = destinationFilter
            ? travel.arrival_location.toLowerCase().includes(destinationFilter.toLowerCase())
            : true;
        const matchesType = typeFilter
            ? travel.type === typeFilter
            : true;

        return matchesDeparture && matchesDestination && matchesType;
    });

    const viewDrivingDetails = (travel) => {
        navigate(`/viewdriving/${travel.id}`);
    };

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="travel-page">
            {isGuest() && (
                <div className="guest-banner">
                    <p>You're browsing as a guest. <a href="/login">Log in</a> or <a href="/signup">sign up</a> to add travel to trips.</p>
                </div>
            )}
            <h1>All Travel Items</h1>
            <div className="add-driving-section">
                <p>Plan a road trip or calculate driving costs for your trip</p>
                <button className="add-driving-btn" onClick={handleOpenDrivingModal}>
                    + Add Driving Route
                </button>
            </div>
            <div className="filter">
                <h2 style={{ color: 'black' }}>Enter flight details:</h2>
                <div className="filter-row">
                    <label>
                        Departure Location:
                        <input
                            type="text"
                            value={departureLocation}
                            onChange={(e) => setDepartureLocation(e.target.value)}
                            placeholder="Enter departure location"
                        />
                    </label>
                    <label>
                        Destination:
                        <input
                            type="text"
                            value={destination}
                            onChange={(e) => setDestination(e.target.value)}
                            placeholder="Enter destination"
                        />
                    </label>
                </div>
                <div className="filter-row">
                    <label>
                        Departure:
                        <input
                            type="date"
                            value={departureDate}
                            onChange={(e) => setDepartureDate(e.target.value)}
                            placeholder="Enter departure date"
                        />
                    </label>
                    <label>
                        Arrival:
                        <input
                            type="date"
                            value={arrivalDate}
                            onChange={(e) => setArrivalDate(e.target.value)}
                            placeholder="Enter arrival date"
                        />
                    </label>
                </div>
            </div>

            <div className="travel-list">
                {filteredTravelOptions.map(travel => (
                    <div key={travel.id} className="travel-item">
                        <div className="travel-header">
                            <h3 className="travel-type">{travel.type}</h3>
                            <p className="travel-price">${travel.price}</p>
                        </div>

                        <div className="travel-details">
                            <div className="travel-route">
                                <p className="from-label">From:</p>
                                <p className="from-value">{travel.departure_location}</p>
                                <p className="to-label">To:</p>
                                <p className="to-value">{travel.arrival_location}</p>
                            </div>

                            <div className="travel-times">
                                <p className="departure-label">Departure:</p>
                                <p className="departure-value">{formatDateTime(travel.departure)}</p>
                                <p className="arrival-label">Arrival:</p>
                                <p className="arrival-value">{formatDateTime(travel.arrival)}</p>
                            </div>

                            {travel.airline && (
                                <p className="travel-airline">Airline: {travel.airline}</p>
                            )}
                            {travel.train_company && (
                                <p className="travel-company">Company: {travel.train_company}</p>
                            )}
                            {travel.bus_company && (
                                <p className="travel-company">Company: {travel.bus_company}</p>
                            )}
                            {travel.duration && (
                                <p className="travel-duration">Duration: {travel.duration}</p>
                            )}
                        </div>

                        <div className="travel-buttons">
                            <button className="add-trip-btn" onClick={() => { handleAddToTripClick(travel); }}>
                                Add to Trip
                            </button>

                            {travel.type.toLowerCase() === 'driving' ? (
                                <button 
                                    className="view-details-btn"
                                    onClick={() => viewDrivingDetails(travel)}
                                >
                                    View & Calculate Costs
                                </button>
                            ) : (
                                <button className="compare-btn" onClick={() => window.open('https://www.booking.com', '_blank')}>
                                    Book Travel
                                </button>
                            )}
                            {/*<button 
                                className="compare-btn"
                                onClick={() => handleCompare(travel)}
                            >
                                Compare Similar
                            </button>*/}
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="modal">
                    <div className="modal-content">
                        <h2>Select a Trip</h2>
                        <div className="trips-list">
                            {trips.length > 0 ? (
                                trips.map(trip => (
                                    <div key={trip.id} className="trip-item">
                                        <p className="trip-name"><strong>{trip.name}</strong></p>
                                        <p className="trip-destination">{trip.destination}</p>
                                        <button 
                                            className="select-trip-btn"
                                            onClick={() => confirmAddToTrip(trip.id)}
                                        >
                                            Select
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <p className="no-trips-message">No trips found. Create a trip first.</p>
                            )}
                        </div>
                        <button 
                            className="close-modal-btn"
                            onClick={() => setIsModalOpen(false)}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {isCompareModalOpen && selectedTravel && (
                <div className="modal">
                    <div className="modal-content">
                        <h2>Similar Options</h2>
                        <p className="compare-route">
                            <strong>Route:</strong> {selectedTravel.departure_location} to {selectedTravel.arrival_location}
                        </p>

                        <div className="selected-travel">
                            <h3>Your Selection</h3>
                            <p className="selected-type-price"><strong>{selectedTravel.type}</strong> - ${selectedTravel.price}</p>
                            <p className="selected-departure">Departure: {formatDateTime(selectedTravel.departure)}</p>
                        </div>

                        <div className="similar-options">
                            {similarOptions.length > 0 ? (
                                similarOptions.map(option => {
                                    const betterDeal = isBetterDeal(option, selectedTravel);
                                    const savings = calculateSavings(option, selectedTravel);

                                    return (
                                        <div 
                                            key={option.id} 
                                            className={`similar-option ${betterDeal ? 'better-deal' : ''}`}
                                        >
                                            <div className="option-info">
                                                <p className="option-type-price"><strong>{option.type}</strong> - ${option.price}</p>
                                                <p className="option-departure">Departure: {formatDateTime(option.departure)}</p>
                                                {betterDeal && (
                                                    <p className="savings">{savings}</p>
                                                )}
                                            </div>
                                            <button 
                                                className="swap-btn"
                                                onClick={() => handleSwap(option)}
                                            >
                                                Swap Selection
                                            </button>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="no-options-message">No similar options found</p>
                            )}
                        </div>

                        <button 
                            className="close-modal-btn"
                            onClick={() => setIsCompareModalOpen(false)}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {isDrivingModalOpen && (
                <div className="modal">
                    <div className="modal-content driving-form">
                        <h3>Add Driving Route</h3>
                        <form onSubmit={(e) => { e.preventDefault(); handleCreateDriving(); }}>
                            <div className="form-group">
                                <label>Departure Location:</label>
                                <input
                                    type="text"
                                    name="departure_location"
                                    value={newDriving.departure_location}
                                    onChange={handleDrivingInputChange}
                                    placeholder="e.g., New York, NY"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Arrival Location:</label>
                                <input
                                    type="text"
                                    name="arrival_location"
                                    value={newDriving.arrival_location}
                                    onChange={handleDrivingInputChange}
                                    placeholder="e.g., Boston, MA"
                                    required
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Departure Date/Time:</label>
                                    <input
                                        type="datetime-local"
                                        name="departure"
                                        value={newDriving.departure}
                                        onChange={handleDrivingInputChange}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Arrival Date/Time:</label>
                                    <input
                                        type="datetime-local"
                                        name="arrival"
                                        value={newDriving.arrival}
                                        onChange={handleDrivingInputChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Notes:</label>
                                <textarea
                                    name="notes"
                                    value={newDriving.notes}
                                    onChange={handleDrivingInputChange}
                                    placeholder="Any additional information about this driving route"
                                ></textarea>
                            </div>

                            <div className="form-actions">
                                <button type="submit" className="submit-btn">Add Driving Route</button>
                                <button 
                                    type="button" 
                                    className="cancel-btn"
                                    onClick={() => setIsDrivingModalOpen(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showAuthPrompt && (
                <AuthPrompt 
                    message="Please log in or create an account to add travel to trips."
                    onClose={() => setShowAuthPrompt(false)}
                />
            )}
        </div>
    );
};

export default Travel;