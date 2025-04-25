import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../styles/Events.css";
import AddToTripDialog from '../components/AddToTripDialog';
import '../styles/ViewEvent.css'; 

function CustomEvents() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [successMessage, setSuccessMessage] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const navigate = useNavigate();
    const token = localStorage.getItem("token");

    useEffect(() => {
        const fetchEvents = async () => {
            setLoading(true);
            try {
                const response = await fetch("/api/events", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await response.json();

                if (response.ok) {
                    setEvents(Array.isArray(data) ? data : []);
                } else {
                    setError(data.message);
                }
            } catch (err) {
                setError("Failed to load events.");
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
    }, [token]);

    // Add custom event to trip
    const handleAddToTrip = (customEvent) => {
        setDialogOpen(true);
        setSelectedEvent(customEvent)
    };

    const openDeleteModal = (customEvent) => {
        setSelectedEvent(customEvent);
        setShowModal(true);
    };

    const closeDeleteModal = () => {
        setShowModal(false);
        setSelectedEvent(null);
    };

    // Delete custom event
    const handleDeleteEvent = async () => {
        if (!selectedEvent) return;

        try {
            const response = await fetch(`/api/events/${selectedEvent.id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                setEvents(events.filter(customEvent => customEvent.id !== selectedEvent.id));
                setSuccessMessage("Event deleted successfully!");
                setTimeout(() => setSuccessMessage(""), 3000);
            } else {
                const data = await response.json();
                alert(data.message || "Failed to delete event.");
            }
        } catch (err) {
            alert("Error deleting event.");
        } finally {
            closeDeleteModal();
        }
    };

    return (
        <div className="events-container">
            <h2>Custom Events</h2>
            <p className="description">
                Create and manage your own custom events easily
            </p>

            <div className="button-container">
                <Link to="/create-event" className="create-event-btn">
                    Create a Custom Event
                </Link>
            </div>

            {loading && <p>Loading events...</p>}
            {error && <p className="error">{error}</p>}

            <div className="events-grid">
                {events.length > 0 ? (
                    events.map((customEvent) => (
                        <div key={customEvent.id} className="event-card">
                            <h3>{customEvent.name}</h3>
                            <p><strong>Location:</strong> {customEvent.location}</p>
                            <p><strong>Date:</strong> {new Date(customEvent.start_time).toLocaleDateString()}</p>
                            <p><strong>Time:</strong> {new Date(customEvent.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
                            <p><strong>Price:</strong> {customEvent.price === "N/A" ? "Free" : `$${customEvent.price}`}</p>
                            <div className="event-card-description">{customEvent.description} </div>

                            <div className="event-buttons">
                                <button onClick={() => handleAddToTrip(customEvent)} className="add-to-trip-btn">
                                    Add to Trip
                                </button>
                                <button onClick={() => openDeleteModal(customEvent)} className="delete-event-btn">
                                    Delete Event
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    !loading && <p>No events found.</p>
                )}
            </div>

            {/* Add to Trip Dialog */}
            <AddToTripDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                item={{ ...selectedEvent, type: 'custom-event', id: selectedEvent?.id }}
            />

            {showModal && (
                <div className="modal">
                    <div className="modal-content">
                        <h3>Confirm Deletion</h3>
                        <p>Are you sure you want to delete <strong>{selectedEvent?.name}</strong>?</p>
                        <div className="modal-buttons">
                            <button onClick={handleDeleteEvent} className="confirm-btn">Yes, Delete</button>
                            <button onClick={closeDeleteModal} className="cancel-btn">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
       </div>        
    );
}

export default CustomEvents;