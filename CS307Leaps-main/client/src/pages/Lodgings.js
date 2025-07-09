import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Lodgings.css";
import { findSimilarItems, isBetterDeal, calculateSavings } from "../utils/comparisonUtils";
import AuthPrompt from "../components/AuthPrompt"
import { isAuthenticated, isGuest } from "../services/authService"; 

const Lodgings = () => {
    const [lodgings, setLodgings] = useState([]);
    const [trips, setTrips] = useState([]);
    const [selectedLodging, setSelectedLodging] = useState(null);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
    const [similarOptions, setSimilarOptions] = useState([]);
    const [selectedTripId, setSelectedTripId] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedType, setSelectedType] = useState("");
    const [priceOrder, setPriceOrder] = useState("price-asc");
    const [showAuthPrompt, setShowAuthPrompt] = useState(false);
    
    const token = localStorage.getItem('token');
    const navigate = useNavigate();

    // Fetch Lodging on enter
    const fetchLodgings = async () => {
        try {
          setIsLoading(true);
          setError(null);
      
          const url = new URL('https://leaps-ohwd.onrender.com/api/lodgings');
          if (searchQuery) url.searchParams.append('location', searchQuery);
      
          const response = await fetch(url.toString(), {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
      
          if (!response.ok) throw new Error('Failed to fetch lodgings');
      
          const data = await response.json();
          console.log('Fetched lodgings:', data);
          setLodgings(data);
        } catch (err) {
          console.error('Error fetching lodgings:', err);
          setError('Failed to load lodgings');
        } finally {
          setIsLoading(false);
        }
      };
      

    // Fetch lodgings and trips
    useEffect(() => {
        /*const fetchLodgings = async () => {
            try {
                const response = await fetch('https://leaps-ohwd.onrender.com/api/lodgings', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) throw new Error('Failed to fetch lodgings');

                const data = await response.json();
                console.log('Fetched lodgings:', data);
                setLodgings(data);
            } catch (err) {
                console.error('Error fetching lodgings:', err);
                setError('Failed to load lodgings');
            } finally {
                setIsLoading(false);
            }
        };*/

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
        
        fetchLodgings();
        fetchTrips();
    }, [token]);

    const handleAddToTrip = (lodging) => {
        if (!isAuthenticated()) {
                    setShowAuthPrompt(true);
                } else {
                    setSelectedLodging(lodging);
                    setIsModalOpen(true);
                }

    };

    const confirmAddToTrip = async (tripId) => {
        try {
            // Add to trip API call
            const response = await fetch('https://leaps-ohwd.onrender.com/api/trips/add-item', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ tripId, itemType: 'lodging', itemId: selectedLodging.id, price: selectedLodging.price_per_night})
            });

            if (!response.ok) throw new Error('Failed to add lodging to trip');
            
            setSelectedTripId(tripId);
            setIsModalOpen(false);
            alert("Lodging added to trip!");
        } catch (err) {
            setError("Failed to add lodging to trip");
        }
    };

    const handleCompare = (lodging) => {
        setSelectedLodging(lodging);
        
        // Find similar lodgings in the same area
        const similar = findSimilarItems(lodgings, lodging);
        
        // Sort by price
        const sorted = [...similar].sort((a, b) => a.price_per_night - b.price_per_night);
        
        setSimilarOptions(sorted);
        setIsCompareModalOpen(true);
    };

    const handleSwap = async (newLodging) => {
        if (!selectedTripId) {
            alert("Please add your original selection to a trip first");
            setIsCompareModalOpen(false);
            return;
        }
        
        try {
            // First remove the old lodging
            const removeResponse = await fetch(`https://leaps-ohwd.onrender.com/api/trips/items/${selectedTripId}/lodging/${selectedLodging.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            // Then add the new lodging
            const addResponse = await fetch('https://leaps-ohwd.onrender.com/api/trips/add-item', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ tripId: selectedTripId, itemType: 'lodging', itemId: newLodging.id })
            });
            
            alert(`Swapped ${selectedLodging.name} with ${newLodging.name}`);
            setIsCompareModalOpen(false);
        } catch (err) {
            setError("Failed to swap lodging");
        }
    };

    // Filter and sort lodgings based on user filters
    const filteredLodgings = lodgings.filter(lodging => {
        const matchesSearch = searchQuery 
            ? lodging.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
              lodging.location.toLowerCase().includes(searchQuery.toLowerCase())
            : true;
        const matchesType = selectedType 
            ? lodging.type === selectedType 
            : true;
            
        return matchesSearch && matchesType;
    }).sort((a, b) => {
        if (priceOrder === "price-asc") {
            return a.price_per_night - b.price_per_night;
        } else if (priceOrder === "price-desc") {
            return b.price_per_night - a.price_per_night;
        } else {
            return b.rating - a.rating; // For "rating-desc"
        }
    });

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="lodgings-page">
            <h1>Lodgings</h1>
            
            {/* Filter controls */}
            <div className="filters">
                <input 
                    type="text" 
                    placeholder="Search by name or location" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          fetchLodgings();
                        }
                      }}
                />
                <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                >
                    <option value="">All Types</option>
                    <option value="Hotel">Hotel</option>
                    <option value="Apartment">Apartment</option>
                </select>
                <select
                    value={priceOrder}
                    onChange={(e) => setPriceOrder(e.target.value)}
                >
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="rating-desc">Highest Rated</option>
                </select>
            </div>
            
            {/* Lodging List */}
            <div className="lodgings-list">
                {filteredLodgings.map(lodging => (
                    <div key={lodging.id} className="lodging-item">
                        <div className="lodging-header">
                            <h3 className="lodging-name">{lodging.name}</h3>
                            <span className="lodging-type">{lodging.type}</span>
                        </div>
                        
                        <div className="lodging-details">
                            <p className="lodging-location"><strong>Location:</strong> {lodging.location}</p>
                            <p className="lodging-price"><strong>Price:</strong> ${lodging.price} per night</p>
                            <p className="lodging-rating"><strong>Rating:</strong> {lodging.rating}/5</p>
                            {/*<p className="lodging-dates">
                                <strong>Available:</strong> {new Date(lodging.check_in_date).toLocaleDateString()} to {new Date(lodging.check_out_date).toLocaleDateString()}
                            </p> */}
                            <p className="lodging-description">{lodging.description}</p>
                            
                            {/*lodging.amenities && (
                                <div className="lodging-amenities">
                                    <strong>Amenities:</strong>
                                    <div className="amenities-list">
                                        {lodging.amenities.map((amenity, idx) => (
                                            <span key={idx} className="amenity-tag">{amenity}</span>
                                        ))}
                                    </div>
                                </div>
                            )*/}
                        </div>
                        
                        <div className="lodging-buttons">
                            <button 
                                className="add-trip-btn"
                                onClick={() => handleAddToTrip(lodging)}
                            >
                                Add to Trip
                            </button>
                            <button 
                                className="compare-btn"
                                onClick={() => handleCompare(lodging)}
                            >
                                Compare Similar
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            
            {/* Add to Trip Modal */}
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
            
            {/* Comparison Modal */}
            {isCompareModalOpen && selectedLodging && (
                <div className="modal">
                    <div className="modal-content">
                        <h2>Similar Lodgings in {selectedLodging.location.split(',')[0]}</h2>
                        
                        <div className="selected-lodging">
                            <h3>Your Selection</h3>
                            <p className="selected-name"><strong>{selectedLodging.name}</strong> ({selectedLodging.type})</p>
                            <p className="selected-price">${selectedLodging.price_per_night} per night</p>
                            <p className="selected-rating">Rating: {selectedLodging.rating}/5</p>
                        </div>
                        
                        <div className="similar-options">
                            {similarOptions.length > 0 ? (
                                similarOptions.map(option => {
                                    const betterDeal = isBetterDeal(option, selectedLodging);
                                    const savings = calculateSavings(option, selectedLodging);
                                    
                                    return (
                                        <div 
                                            key={option.id} 
                                            className={`similar-option ${betterDeal ? 'better-deal' : ''}`}
                                        >
                                            <div className="option-info">
                                                <p className="option-name"><strong>{option.name}</strong> ({option.type})</p>
                                                <p className="option-price">${option.price_per_night} per night</p>
                                                <p className="option-rating">Rating: {option.rating}/5</p>
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
              {showAuthPrompt && (
                <AuthPrompt 
                    message="Please log in or create an account to add travel to trips."
                    onClose={() => setShowAuthPrompt(false)}
                />
            )}
        </div>
    );
};

export default Lodgings;