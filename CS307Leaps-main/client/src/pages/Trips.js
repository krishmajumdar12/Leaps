import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import LeapsLogo from "../assets/Leapspng.png";
import "../styles/Trips.css";
import "../components/DeleteTripConfirmation.css"
import ConfirmDelete from "../components/DeleteTripConfirmation";

const Trips = () => {
    const [refresh, setRefresh] = useState(false);
    const [trips, setTrips] = useState([]);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('list');
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const statusFromURL = queryParams.get("status");
    const [selectedStatus, setSelectedStatus] = useState(statusFromURL || "All");
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    const toggleViewMode = () => {
        setViewMode(prevMode => (prevMode === 'list' ? 'grid' : 'list'));
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    };

    const handleComplete = async (trip) => {
        try {
            const response = await fetch(`/api/trips/complete/${trip.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(trip)
            });

            if (!response.ok) throw new Error('Failed to complete trip');

            await response.json();
            setRefresh(prev => !prev);
        } catch (err) {
            console.error('Error completing trip:', err);
            setError('Error completing trip. Please try again later.');
        }
    };

    const handleRestore = async (trip) => {
        try {
            const response = await fetch(`/api/trips/${trip.id}/restore`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to restore trip');

            await response.json();
            setRefresh(prev => !prev);
        } catch (err) {
            console.error('Error restoring trip:', err);
            setError('Error restoring trip. Please try again later.');
        }
    };

    const handleMarkAsCurrent = async (trip) => {
        try {
            const response = await fetch(`/api/trips/mark-as-current/${trip.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to mark trip as current');

            await response.json();
            setRefresh(prev => !prev);
        } catch (err) {
            console.error('Error marking trip as current:', err);
            setError('Error marking trip as current. Please try again later.');
        }
    };

    useEffect(() => {
        const fetchTrips = async () => {
            setIsLoading(true);
            try {
                const response = await fetch("/api/trips", {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) throw new Error('Failed to fetch trips');

                const data = await response.json();
                setTrips(Array.isArray(data) ? data : []);
            } catch (err) {
                setError('Error loading trips. Please try again later.');
                console.error('Error fetching trips:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTrips();
    }, [token, refresh]);

    const filteredTrips = selectedStatus === "all" 
        ? trips 
        : trips.filter(trip => trip.status === selectedStatus);

    const renderTrips = (status) => {
        const filtered = status === "All" ? trips : trips.filter(trip => trip.status === status);
        if (trips.length === 0) {
            return <p>No trips found.</p>;
        }
        if (filtered.length === 0) {
            return <p>No {status.toLowerCase()} trips found.</p>;
        }
    
        return viewMode === "grid" ? renderGridView(filtered) : renderListView(filtered);
    };

    const renderGridView = (tripsArray) => (
        <div className="trips-grid">
            {tripsArray.map(trip => (
                <div key={trip.id} className="trip-item grid">
                    <div>
                        <Link to={`/trips/${trip.id}`}>
                            <h3>{trip.name}</h3>
                        </Link>
                        <p>{trip.description}</p>
                        <p className="trip-destination"><strong>Destination:</strong> {trip.destination}</p>
                        <div className="trip-date">
                            {formatDate(trip.start_date)} to {formatDate(trip.end_date)}
                        </div>
                    </div>

                    <div className="button-group">
                        {trip.status === "Current" && (
                            <button onClick={() => handleComplete(trip)} className="complete-btn">
                                Complete
                            </button>
                        )}
                        {trip.status === "Upcoming" && (
                            <button onClick={() => handleMarkAsCurrent(trip)} className="mark-current-btn">
                                Mark as Current
                            </button>
                        )}
                        {trip.status === "Cancelled" && (
                            <button onClick={() => handleRestore(trip)} className="restore-trip-btn">
                                Restore
                            </button>
                        )}
                        <div className="delete-btn">
                            <ConfirmDelete id={trip.id} token={token} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderListView = (tripsArray) => (
        <div className="trips-list">
            {tripsArray.map(trip => (
                <div key={trip.id} className="trip-item list">
                    <div className="trip-date">
                        {formatDate(trip.start_date)} to {formatDate(trip.end_date)}
                    </div>

                    <div className="trip-info">
                        <Link to={`/trips/${trip.id}`}>
                            <h3>{trip.name}</h3>
                        </Link>
                        <p>{trip.description}</p>
                        <p className="trip-destination"><strong>Destination:</strong> {trip.destination}</p>
                    </div>

                    <div className="trip-actions">
                        {trip.status === "Current" && (
                            <button onClick={() => handleComplete(trip)} className="complete-btn">
                                Complete
                            </button>
                        )}
                        {trip.status === "Upcoming" && (
                            <button onClick={() => handleMarkAsCurrent(trip)} className="mark-current-btn">
                                Mark as Current
                            </button>
                        )}
                        {trip.status === "Cancelled" && (
                            <button onClick={() => handleRestore(trip)} className="restore-trip-btn">
                                Restore
                            </button>
                        )}
                        <div className="delete-btn">
                            <ConfirmDelete id={trip.id} token={token} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    if (!token) {
        return <div className="text-container">Please login to view your trips.</div>;
    }
    
    return (
        <div className="trips-container">
            <img src={LeapsLogo} alt="Leaps Logo" className="logo" />
            <h1>My Trips</h1>

            {error && <div className="error">{error}</div>}

            {isLoading ? (
                <div className="loading">Loading your trips...</div>
            ) : (
                <div>
                    <div className="trips-header">
                        <button onClick={toggleViewMode} className="toggle-view-btn" data-view={viewMode}>
                            Switch to {viewMode === 'list' ? 'Grid' : 'List'} View
                        </button>

                        <select 
                            className="filter-dropdown"
                            value={selectedStatus} 
                            onChange={(e) => setSelectedStatus(e.target.value)}
                        >
                            <option value="All">All Trips</option>
                            <option value="Upcoming">Upcoming</option>
                            <option value="Current">Current</option>
                            <option value="Past">Past</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    </div>

                    {selectedStatus === "All" ? (
                        <div>
                            <h2>All Trips</h2>
                            {renderTrips("All")}
                        </div>
                    ) : (
                        <div>
                            <h2>{selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)} Trips</h2>
                            {renderTrips(selectedStatus)}
                        </div>
                    )}
                </div>
            )}

            <button onClick={() => navigate("/createtrip")} className="create-trip-btn">
                Create New Trip
            </button>
        </div>
    );
};

export default Trips;
