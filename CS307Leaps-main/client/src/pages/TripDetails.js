import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ChatWindow from "../components/ChatWindow";
import "../styles/TripDetails.css";
import EventRecommendationsSearcher from '../components/EventRecommendationsSearcher';
import EventRecommendations from '../components/EventRecommendations';
import AddToTripDialog from '../components/AddToTripDialog';
import AddRecommendationDialog from "../components/AddRecommendationDialog";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import TripRSVP from '../components/TripRSVP';
import '../styles/TripRSVP.css';

const TripDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [friends, setFriends] = useState([]);
    const [selectedFriend, setSelectedFriend] = useState("");
    const [trip, setTrip] = useState(null);
    const [events, setEvents] = useState([]);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [tripMembers, setTripMembers] = useState([]);
    const [cancelVotes, setCancelVotes] = useState(0);
    const [hasVotedToCancel, setHasVotedToCancel] = useState(false);
    const [isTripCancelled, setIsTripCancelled] = useState(false);
    const token = localStorage.getItem('token');
    const userId = JSON.parse(atob(token.split('.')[1])).id;
    const [results, setResults] = useState({ events: [], travel: [], lodging: [] });
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [activeTab, setActiveTab] = useState("details");
    const [calendarEvents, setCalendarEvents] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [eventsForSelectedDate, setEventsForSelectedDate] = useState([]);
    const [costs, setCosts] = useState({
        totalCost: 0,
        perUser: [],
        yourCost: 0
    });
    const [isAdjusting, setIsAdjusting] = useState(false);
    const [ratios, setRatios] = useState({});
    const [priceOverrides, setPriceOverrides] = useState({});
    const [memberRsvps, setMemberRsvps] = useState([]);
    const [rsvpUpdated, setRsvpUpdated] = useState(false);
    const [success, setSuccess] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadMessage, setUploadMessage] = useState('');
    const [tripFiles, setTripFiles] = useState([]);


    const fetchCostSummary = async () => {
        try {
            const res = await fetch(`https://leaps-ohwd.onrender.com/api/trips/${id}/cost-summary`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('cost summary failed');
            const data = await res.json();
            setCosts(data);
            setRatios(
                data.perUser.reduce(
                    (acc, u) => ({ ...acc, [u.userId]: u.ratio }),
                    {}
                )
            );
        } catch (err) {
            console.error('Failed to fetch cost summary', err);
        }
    };

    const handleFileUpload = async () => {
        if (!selectedFile) return;

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const res = await fetch(`https://leaps-ohwd.onrender.com/api/trips/${id}/upload-file`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            if (!res.ok) throw new Error('Failed to upload');

            setUploadMessage('File uploaded successfully!');
            setSelectedFile(null);
            fetchTripFiles(); // Refresh file list
        } catch (err) {
            console.error('Upload error:', err);
            setUploadMessage('Failed to upload file.');
        }
    };

    const fetchTripFiles = async () => {
        try {
            const res = await fetch(`https://leaps-ohwd.onrender.com/api/trips/${id}/files`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) throw new Error('Failed to fetch files');

            const data = await res.json();
            setTripFiles(data);
        } catch (err) {
            console.error('Error fetching trip files:', err);
        }
    };


    const fetchTrip = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`https://leaps-ohwd.onrender.com/api/trips/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch trip');

            const data = await response.json();

            // Fetch vote counts for trip items
            const votesResponse = await fetch(`https://leaps-ohwd.onrender.com/api/trips/items/${id}/votes`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!votesResponse.ok) throw new Error('Failed to fetch vote counts');

            const votesData = await votesResponse.json();

            // Map vote counts to trip items
            const itemsWithVotes = data.items.map(item => {
                const vote = votesData.find(v => v.trip_item_id === item.id) || {};
                return {
                    ...item,
                    upVotes: vote.upvotes ?? 0,
                    downVotes: vote.downvotes ?? 0
                };
            });

            // Fetch additional trip members
            const membersResponse = await fetch(`https://leaps-ohwd.onrender.com/api/trips/${id}/members`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!membersResponse.ok) throw new Error("Failed to fetch trip members");

            const additionalMembers = await membersResponse.json();

            // Merge members from `data` and `fetchTripMembers`, preserving roles
            const mergedMembers = [...data.members, ...additionalMembers].reduce((acc, member) => {
                const existingMember = acc.find(m => m.id === member.id);
                if (existingMember) {
                    // Preserve the role from `data.members` if it exists
                    existingMember.role = existingMember.role || member.role;
                } else {
                    acc.push(member);
                }
                return acc;
            }, []);

            setTrip({
                ...data,
                items: itemsWithVotes,
                startDate: data.start_date ? new Date(data.start_date).toISOString().split('T')[0] : '',
                endDate: data.end_date ? new Date(data.end_date).toISOString().split('T')[0] : ''
            });
            setTripMembers(mergedMembers);
            setEvents(data.events || []);
            await fetchCostSummary();
        } catch (err) {
            setError('Error loading trip. Please try again later.');
            console.error('Error fetching trip:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchTripItemsWithDates = async () => {
        try {
            const response = await fetch(`https://leaps-ohwd.onrender.com/api/trips/${id}/items-with-dates`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch trip items with dates');

            const items = await response.json();

            const events = items.map((item) => ({
                title: item.name,
                startDate: item.start_date ? new Date(item.start_date) : null,
                endDate: item.end_date ? new Date(item.end_date) : null,
                price: item.price,
                description: item.description,
                type: item.item_type,
            }));

            setCalendarEvents(events);
        } catch (err) {
            console.error('Error fetching trip items with dates:', err);
        }
    };


    useEffect(() => {
        fetchCostSummary();
    }, [id, token]);



    const fetchRsvpStatuses = async () => {
        if (!token || !id) return;

        try {
            const response = await fetch(`https://leaps-ohwd.onrender.com/api/trip-rsvp/${id}/rsvp-status`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch RSVP statuses');

            const data = await response.json();
            setMemberRsvps(data);
        } catch (err) {
            console.error('Error fetching RSVP status:', err);
        }
    };

    useEffect(() => {
        fetchTrip();
        fetchTripItemsWithDates();
        fetchRsvpStatuses();
        fetchTripFiles();

        const fetchFriends = async () => {
            try {
                const response = await fetch(`https://leaps-ohwd.onrender.com/api/friends/list`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (!response.ok) throw new Error("Failed to fetch friends");

                const data = await response.json();
                setFriends(data);
            } catch (err) {
                console.error("Error fetching friends:", err);
            }
        };

        fetchFriends();
    }, [id, token, userId]);

    useEffect(() => {
        if (rsvpUpdated) {
            fetchRsvpStatuses();
            setRsvpUpdated(false);
        }
    }, [rsvpUpdated]);

    const handleRsvpUpdate = (userId, newStatus) => {
        // Update the memberRsvps state immediately
        setMemberRsvps(prev =>
            prev.map(member =>
                member.id === userId
                    ? { ...member, status: newStatus, response_date: new Date().toISOString() }
                    : member
            )
        );

        // Also trigger a full refresh of RSVP data
        setRsvpUpdated(true);
    };

    useEffect(() => {
        const fetchCancelVotes = async () => {
            if (tripMembers.length === 0) return; // Ensure tripMembers is loaded before fetching votes

            try {
                const response = await fetch(`https://leaps-ohwd.onrender.com/api/trips/${id}/cancellation-status`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) throw new Error('Failed to fetch cancellation votes');

                const data = await response.json();
                setCancelVotes(data.cancel_votes || 0);

                // Check if the user has already voted to cancel
                const userVoteResponse = await fetch(`https://leaps-ohwd.onrender.com/api/trips/${id}/user-vote`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!userVoteResponse.ok) throw new Error('Failed to fetch user vote status');

                const userVoteData = await userVoteResponse.json();
                setHasVotedToCancel(userVoteData.hasVoted);

                // Determine if the trip is cancelled
                const totalMembers = tripMembers.length;
                setIsTripCancelled(data.cancel_votes > totalMembers / 2);
            } catch (err) {
                console.error('Error fetching cancellation votes or user vote status:', err);
            }
        };

        fetchCancelVotes();
    }, [tripMembers]); // Run fetchCancelVotes only after tripMembers is updated

    const sendRsvpReminder = async (memberId) => {
        try {
            const response = await fetch(`https://leaps-ohwd.onrender.com/api/trip-rsvp/${id}/send-reminder/${memberId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to send reminder');

            const data = await response.json();

            // Show success message
            alert(data.message);

            // Update the memberRsvps state to show the reminder was sent
            // This is mostly to trigger a UI update
            setMemberRsvps(prev =>
                prev.map(member =>
                    member.id === memberId
                        ? { ...member, reminded: true }
                        : member
                )
            );
        } catch (err) {
            console.error('Error sending RSVP reminder:', err);
            setError('Error sending reminder');
        }
    };

    const fetchTripMembers = async () => {
        try {
            const response = await fetch(`https://leaps-ohwd.onrender.com/api/trips/${id}/members`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) throw new Error("Failed to fetch trip members");

            const data = await response.json();
            setTripMembers(data || []);
        } catch (err) {
            console.error("Error fetching trip members:", err);
        }
    };

    useEffect(() => {
        if (trip && trip.items) {
            fetchTripItemsWithDates();
        }
    }, [trip]);

    const handleRemoveMember = async (memberId) => {
        if (memberId === userId) {
            alert("You cannot remove yourself from the trip.");
            return;
        }
        try {
            const response = await fetch(`https://leaps-ohwd.onrender.com/api/trips/${id}/remove-member/${memberId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to remove member');
            }

            alert('Member removed successfully');
            setTripMembers(tripMembers.filter(member => member.id !== memberId));
        } catch (err) {
            console.error('Error removing member:', err);
            alert('Failed to remove member');
        }
    };

    const handleAddFriend = async () => {
        if (!selectedFriend) {
            console.error("No friend selected");
            return;
        }

        try {
            const friendToAdd = friends.find(f => f.id === selectedFriend);
            if (!friendToAdd) {
                console.error("Selected friend not found in friends list");
                return;
            }

            const response = await fetch(`https://leaps-ohwd.onrender.com/api/trips/${id}/add-friend`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ friendId: selectedFriend }),
            });

            const data = await response.json();
            console.log("Add Friend Response:", data);

            if (!response.ok) {
                throw new Error(data.message || "Failed to add friend");
            }

            const newMember = {
                id: friendToAdd.id,
                username: friendToAdd.username,
                profile_pic: friendToAdd.profile_pic,
                role: "view" // Default role for new members
            };

            // Add to tripMembers array
            setTripMembers(prevMembers => [...prevMembers, newMember]);

            // Add default RSVP status for the new member
            setMemberRsvps(prevRsvps => [
                ...prevRsvps,
                {
                    id: friendToAdd.id,
                    username: friendToAdd.username,
                    status: 'no_response',
                    response_date: new Date().toISOString()
                }
            ]);

            alert("Friend added successfully!");
            setFriends(friends.filter(friend => friend.id !== selectedFriend));

            // Fetch updated trip members after adding a new friend
            fetchTripMembers();

            // Reset selection
            setSelectedFriend("");
        } catch (err) {
            console.error("Error adding friend:", err);
            alert("Failed to add friend.");
        }
    };

    const handleAddEvent = () => {
        // TODO Logic to add a new event
        console.log('Add Event button clicked');
    };

    const handleEditTrip = () => {
        setIsEditing(true);
    };

    const handleSaveTrip = async () => {
        try {
            console.log(JSON.stringify(trip));
            const response = await fetch(`https://leaps-ohwd.onrender.com/api/trips/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(trip)
            });

            if (!response.ok) throw new Error('Failed to save trip');

            const data = await response.json();
            setTrip({
                ...data,
                startDate: data.start_date ? new Date(data.start_date).toISOString().split('T')[0] : '',
                endDate: data.end_date ? new Date(data.end_date).toISOString().split('T')[0] : ''
            }); setIsEditing(false);
        } catch (err) {
            console.error('Error saving trip:', err);
            setError('Error saving trip. Please try again later.');
        }
    };

    const handleRemoveEvent = (eventId) => {
        setEvents(events.filter(event => event.id !== eventId));
    };

    const handleDeleteTrip = async () => {
        const confirmed = window.confirm('Are you sure you want to delete this trip?');
        if (confirmed) {
            try {
                const response = await fetch(`https://leaps-ohwd.onrender.com/api/trips/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) throw new Error('Failed to delete trip');

                console.log('Trip deleted successfully');
                navigate('/trips');
            } catch (err) {
                console.error('Error deleting trip:', err);
                setError('Error deleting trip. Please try again later.');
            }
        }
    };

    const handleDeleteItem = async (tripId, itemType, itemId) => {
        if (window.confirm('Are you sure you want to remove this item from the trip?')) {
            try {
                console.log(`Attempting to delete: tripId=${tripId}, itemType=${itemType}, itemId=${itemId}`);

                const url = `https://leaps-ohwd.onrender.com/api/trips/items/${tripId}/${itemType}/${itemId}`;
                console.log('Delete request URL:', url);

                const response = await fetch(url, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    console.error('Server response:', response.status, errorData);
                    throw new Error(`Failed to delete item: ${response.status}`);
                }

                // Update local state to reflect the deletion
                setTrip(prevTrip => ({
                    ...prevTrip,
                    items: prevTrip.items.filter(item =>
                        !(item.trip_id === tripId && item.item_type === itemType && item.item_id === itemId)
                    )
                }));

            } catch (err) {
                console.error('Error deleting item:', err);
                setError('Failed to remove item from trip');
            }
        }
    };

    const handleVote = async (itemId, voteType) => {
        try {
            const response = await fetch(`https://leaps-ohwd.onrender.com/api/trips/items/${id}/vote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ itemId, vote: voteType === 'up' })
            });

            if (!response.ok) throw new Error('Failed to submit vote');

            // Refresh trip data to update vote counts
            await fetchTrip();
        } catch (err) {
            console.error('Error submitting vote:', err);
        }
    };

    const fetchItemDetails = async (type, id) => {
        console.log(`Fetching details for ${type} with ID: ${id}`);
        if (type === 'events' || type == 'custom-event') {
            try {
                navigate(`/viewevent/${id}`);
            } catch (err) {
                console.error('Error fetching event details:', err);
            }
        } else if (type === 'lodging') {
            try {
                // Navigate to lodging page if you have one
                navigate('/lodgings');
                //navigate(`/lodging/${id}`);
            } catch (err) {
                console.error('Error navigating to lodging:', err);
            }
        } else if (type === 'travel') {
            try {
                // Navigate to travel page if you have one
                navigate('/travel');
                //navigate(`/travel/${id}`);
            } catch (err) {
                console.error('Error navigating to travel:', err);
            }
        } else {
            console.log(`Item type ${type} not supported for viewing details`);
        }
    };

    const savePriceChange = async (eventId, price, eventName, tripName) => {
        try {
            const response = await fetch(
                `https://leaps-ohwd.onrender.com/api/trips/${trip.id}/items/${eventId}/price?eventName=${eventName}&tripName=${tripName}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ price: parseFloat(price) })
                }
            );
            if (!response.ok) throw new Error('Failed to update price');
            alert('Price updated!');
            // locally remember this override
            setPriceOverrides(prev => ({ ...prev, [eventId]: parseFloat(price) }));
            await fetchCostSummary();
        } catch (err) {
            console.error(err);
            alert('Error updating price');
        }
    };



    const ItemPreview = ({ type, id, overridePrice }) => {
        const [preview, setPreview] = useState(null);
        const [loading, setLoading] = useState(true);

        useEffect(() => {
            const fetchPreview = async () => {
                setLoading(true);
                try {
                    let endpoint;
                    if (type === 'events' || type === 'custom-event') {
                        endpoint = `https://leaps-ohwd.onrender.com/api/events/${id}?tripId=${trip.id}`;
                    } else if (type === 'lodging') {
                        endpoint = `https://leaps-ohwd.onrender.com/api/lodging/${id}`;
                    } else if (type === 'travel') {
                        endpoint = `https://leaps-ohwd.onrender.com/api/travel/${id}`;
                    }

                    if (endpoint) {
                        const response = await fetch(endpoint, {
                            headers: { 'Authorization': `Bearer ${token}` },
                        });

                        if (response.ok) {
                            const data = await response.json();
                            setPreview(data);
                        } else {

                        }
                    }
                } catch (err) {
                    console.error(`Error fetching ${type} preview:`, err);
                } finally {
                    setLoading(false);
                }
            };

            fetchPreview();
        }, [type, id]);

        const [priceInput, setPriceInput] = useState('');

        useEffect(() => {
            if (preview) {
                console.log(`Preview for ${type} with ID ${id}:`, preview);
                // prefer override (number), otherwise parse the preview.price
                const initial = overridePrice != null
                    ? overridePrice
                    : (typeof preview.price === 'string'
                        ? preview.price.match(/\d+(\.\d+)?/)?.[0] || ''
                        : preview.price);
                setPriceInput(initial);
            }
        }, [preview, overridePrice]);

        if (loading) return <p>Loading...</p>;

        if (!preview) return (
            <div className="preview-placeholder">
                <p>{type.charAt(0).toUpperCase() + type.slice(1)} item</p>
                <p className="preview-id">ID: {id.slice(0, 8)}...</p>
            </div>
        );

        // Render different previews based on item type
        if (type === 'events' || type === 'custom-event') {
            return (
                <div className="event-preview">
                    {preview.image && (
                        <img src={preview.image} alt={preview.name} className="preview-image" />
                    )}
                    <h5>{preview.name}</h5>
                    <p>{preview.date} | {preview.location}</p>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
                        <label htmlFor={`price-${id}`}>Price:</label>
                        <input
                            id={`price-${id}`}
                            type="number"
                            step="0.01"
                            min="0"
                            value={priceInput}
                            onChange={(e) => setPriceInput(e.target.value)}
                        />
                        <button
                            className="save-price-btn"
                            onClick={() => savePriceChange(id, priceInput)}
                        >
                            Save
                        </button>
                    </div>
                </div>
            );
        } else if (type === 'lodging') {
            return (
                <div className="lodging-preview">
                    <h5>{preview.name}</h5>
                    <p>{preview.location}</p>
                </div>
            );
        } else if (type === 'travel') {
            return (
                <div className="travel-preview">
                    <h5>{preview.type}</h5>
                    <p>{preview.departure_location} → {preview.arrival_location}</p>
                </div>
            );
        }

        return <p>Unknown item type</p>;
    };

    const [localPrices, setLocalPrices] = useState({});

    const renderTripItems = () => {
        if (!trip.items || trip.items.length === 0) {
            return <p>No items added to this trip yet.</p>;
        }

        const groupedItems = trip.items.reduce((acc, item) => {
            const type = item.item_type;
            if (!acc[type]) {
                acc[type] = [];
            }
            acc[type].push(item);
            return acc;
        }, {});

        return (
            <div className="trip-items">
                <h3>Trip Items</h3>
                {Object.entries(groupedItems).map(([type, items]) => (
                    <div key={type} className="item-type-section">
                        <h4>{type.charAt(0).toUpperCase() + type.slice(1)}</h4>
                        <div className="items-grid">
                            {items.map((item) => (
                                <div key={item.id} className="trip-item-card">
                                    <ItemPreview
                                        type={item.item_type}
                                        id={item.item_id}
                                        overridePrice={priceOverrides[item.item_id]}
                                    />
                                    <button
                                        onClick={() => fetchItemDetails(item.item_type, item.item_id)}
                                        className="view-details-btn"
                                    >
                                        View Details
                                    </button>
                                    {hasEditAccess() && (
                                        <button
                                            onClick={() => handleDeleteItem(trip.id, item.item_type, item.item_id)}
                                            className="delete-item-btn"
                                        >
                                            Remove
                                        </button>
                                    )}
                                    <div className="vote-buttons">
                                        <button onClick={() => handleVote(item.id, 'up')} className="thumbs-up-btn">
                                            👍 {item.upVotes || 0}
                                        </button>
                                        <button onClick={() => handleVote(item.id, 'down')} className="thumbs-down-btn">
                                            👎 {item.downVotes || 0}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const handleDateClick = (date) => {
        setSelectedDate(date);
        const eventsOnDate = calendarEvents.filter((event) => {
            const eventStartDate = event.startDate ? new Date(event.startDate).setHours(0, 0, 0, 0) : null;
            const eventEndDate = event.endDate ? new Date(event.endDate).setHours(23, 59, 59, 999) : null;
            const selectedDate = new Date(date).setHours(0, 0, 0, 0);
            return selectedDate >= eventStartDate && selectedDate <= eventEndDate;
        });
        setEventsForSelectedDate(eventsOnDate);
    };

    const renderCalendarView = () => (
        <div className="calendar-view">
            <Calendar
                onClickDay={handleDateClick} // Handle date selection
                tileContent={({ date }) => {
                    const eventsOnDate = calendarEvents.filter((event) => {
                        const eventStartDate = event.startDate ? new Date(event.startDate).setHours(0, 0, 0, 0) : null;
                        const eventEndDate = event.endDate ? new Date(event.endDate).setHours(23, 59, 59, 999) : null;
                        const tileDate = new Date(date).setHours(0, 0, 0, 0);
                        return tileDate >= eventStartDate && tileDate <= eventEndDate;
                    });
                    return eventsOnDate.map((event, index) => (
                        <div key={index} className="calendar-event">
                            {event.type}
                        </div>
                    ));
                }}
            />
            {selectedDate && (
                <div className="selected-date-events">
                    <h4>Events on {selectedDate.toDateString()}</h4>
                    {eventsForSelectedDate.length > 0 ? (
                        <ul>
                            {eventsForSelectedDate.map((event, index) => (
                                <li key={index}>
                                    <strong>{event.title}</strong>
                                    <ul>
                                        {event.price && <li>Price: ${event.price}</li>}
                                        {event.description && <li>Description: {event.description}</li>}
                                    </ul>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>No events on this day.</p>
                    )}
                </div>
            )}
        </div>
    );

    const voteToCancel = async () => {
        try {
            const response = await fetch(`https://leaps-ohwd.onrender.com/api/trips/${id}/vote-cancel`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to vote for cancellation');

            setCancelVotes(cancelVotes + 1);
            setHasVotedToCancel(true);
            window.location.reload(); // Force refresh
        } catch (err) {
            console.error('Error voting to cancel trip:', err);
        }
    };

    const handleResults = (data) => {
        console.log('Received results:', data);
        setResults(data);
    };

    const handleCancelTrip = async () => {
        try {
            const response = await fetch(`https://leaps-ohwd.onrender.com/api/trips/cancel/${trip.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to cancel trip');

            await response.json();
        } catch (err) {
            console.error('Error cancelling trip:', err);
            setError('Error cancelling trip. Please try again later.');
        }
    };

    useEffect(() => {
        if (isTripCancelled) {
            handleCancelTrip();
        }
    }, [isTripCancelled]);

    const openAddToTrip = (item) => {
        setSelectedItem(item);
        setDialogOpen(true);
    };

    const rescindVote = async () => {
        try {
            const response = await fetch(`https://leaps-ohwd.onrender.com/api/trips/${id}/rescind-vote`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to rescind vote');

            setCancelVotes(cancelVotes - 1);
            setHasVotedToCancel(false);
            window.location.reload(); // Force refresh
        } catch (err) {
            console.error('Error rescinding vote:', err);
        }
    };

    const restoreTrip = async () => {
        try {
            const response = await fetch(`https://leaps-ohwd.onrender.com/api/trips/${id}/restore`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to restore trip');

            setCancelVotes(0);
            setIsTripCancelled(false);
        } catch (err) {
            console.error('Error restoring trip:', err);
        }
    };

    const lastEdited = useRef(null);



    function handleRatioChange(userId, val) {
        lastEdited.current = userId;
        setRatios(prev => ({
            ...prev,
            [userId]: Math.max(0, Math.min(1, parseFloat(val) || 0))
        }));
    }
    async function saveRatios() {
        setIsAdjusting(true);
        try {
            const payload = {
                perUser: Object.entries(ratios).map(([userId, ratio]) => ({
                    userId, ratio
                }))
            };
            await fetch(`https://leaps-ohwd.onrender.com/api/trips/${id}/cost-ratios`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            await fetchCostSummary();
            // then re-fetch cost-summary as before…
        } catch (err) {
            console.error(err);
            alert('Failed to save percentages');
        } finally {
            setIsAdjusting(false);
        }
    }


    const navRecommendations = () => {
        navigate('./recommendation');
    }

    const handleUpdateRole = async (memberId, newRole) => {
        try {
            const response = await fetch(`https://leaps-ohwd.onrender.com/api/trips/${id}/members/${memberId}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ role: newRole })
            });

            if (!response.ok) throw new Error('Failed to update role');

            alert('Role updated successfully');
            window.location.reload();
        } catch (err) {
            console.error('Error updating role:', err);
            alert('Failed to update role');
        }
    };

    const downloadFile = async (fileId, filename) => {
        try {
            const res = await fetch(`https://leaps-ohwd.onrender.com/api/trips/${id}/files/${fileId}/download`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!res.ok) throw new Error('Failed to download file');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Download failed:', err);
            alert('Failed to download file');
        }
    };

    const hasEditAccess = () => {
        if (!trip || !tripMembers) return false;

        const me = tripMembers.find(m => m.id === userId);
        return (
            trip.creator_id === userId ||
            me?.role === 'edit' ||
            me?.role === 'co-creator'
        );
    };

    const handleDeleteFile = async (fileId) => {
        try {
            const res = await fetch(`https://leaps-ohwd.onrender.com/api/trips/${id}/files/${fileId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) throw new Error('Failed to delete file');

            // Refresh file list
            fetchTripFiles();
        } catch (err) {
            console.error('Error deleting file:', err);
            alert('Failed to delete file');
        }
    };

    const openFileInNewTab = async (fileId) => {
        try {
            const res = await fetch(`https://leaps-ohwd.onrender.com/api/trips/${id}/files/${fileId}/view`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) throw new Error('Failed to fetch file');

            const blob = await res.blob();

            const blobUrl = window.URL.createObjectURL(blob);

            window.open(blobUrl, '_blank', 'noopener,noreferrer');

            setTimeout(() => window.URL.revokeObjectURL(blobUrl), 10000);
        } catch (err) {
            console.error('Error opening file:', err);
            alert('Failed to open file');
        }
    };



    const handlePromoteToCreator = async (memberId) => {
        const confirmPromotion = window.confirm(
            "Are you sure you want to promote this user to Leader? You will lose your Leader status."
        );

        if (!confirmPromotion) return;

        try {
            const response = await fetch(`https://leaps-ohwd.onrender.com/api/trips/${id}/promote-to-creator`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ newCreatorId: memberId }),
            });

            if (!response.ok) throw new Error("Failed to promote user to Leader");

            alert("User promoted to Leader successfully!");
            window.location.reload();
        } catch (err) {
            console.error("Error promoting user to Leader:", err);
            alert("Failed to promote user to Leader.");
        }
    };

    const getAvailableFriends = () => {
        if (!friends || !tripMembers) return [];

        // Get the IDs of all trip members
        const memberIds = tripMembers.map(member => member.id);

        // Filter out friends who are already in the trip
        return friends.filter(friend => !memberIds.includes(friend.id));
    };

    const getFileIcon = (filename) => {
        const ext = filename.split('.').pop().toLowerCase();

        if (['pdf'].includes(ext)) return '📄';
        if (['doc', 'docx'].includes(ext)) return '📝';
        if (['xls', 'xlsx'].includes(ext)) return '📊';
        if (['png', 'jpg', 'jpeg', 'gif'].includes(ext)) return '🖼️';
        if (['zip', 'rar'].includes(ext)) return '🗜️';
        if (['txt', 'md'].includes(ext)) return '📃';
        return '📁'; // Default icon
    };

    if (isLoading) {
        return <div className="trip-details"><p className="loading">Loading trip details...</p></div>;
    }

    if (error) {
        return <div className="trip-details"><p className="error">{error}</p></div>;
    }

    return (
        <div className="trip-container">
            {/* Main two-column layout */}
            <div className="two-column-layout">
                {/* LEFT COLUMN: Calendar & Members */}
                <div className="left-column">
                    {/* Navigation Tabs */}
                    <div className="tabs">
                        <button
                            onClick={() => setActiveTab("details")}
                            className={activeTab === "details" ? "active" : ""}
                        >
                            Trip Details
                        </button>
                        <button
                            onClick={() => setActiveTab("calendar")}
                            className={activeTab === "calendar" ? "active" : ""}
                        >
                            Calendar View
                        </button>
                        <button onClick={() => navigate('/preferences')}>
                            Notification Preferences
                        </button>
                    </div>

                    {/* Calendar View */}
                    {activeTab === "calendar" && (
                        <div className="calendar-section">
                            {renderCalendarView()}
                        </div>
                    )}

                    {/* Members Section */}
                    <div className="members-section">
                        <h3>Trip Members</h3>
                        {success && <div className="success-message">{success}</div>}
                        {error && <div className="error-message">{error}</div>}

                        {trip?.current && (
                            <TripRSVP
                                tripId={id}
                                currentUserId={userId}
                                isCreator={trip.creator_id === userId || tripMembers.find(m => m.id === userId && m.role === "co-creator")}
                                onRsvpUpdate={handleRsvpUpdate}
                            />
                        )}

                        {/* Add Friend Form */}
                        {(trip?.creator_id === userId || tripMembers.find(m => m.id === userId && m.role === "co-creator")) && (
                            <div className="add-member-container">
                                <div className="add-member-form">
                                    <select
                                        value={selectedFriend}
                                        onChange={(e) => setSelectedFriend(e.target.value)}
                                        className="friend-select"
                                        disabled={getAvailableFriends().length === 0}
                                    >
                                        {getAvailableFriends().length === 0 ? (
                                            <option value="">No more friends to add</option>
                                        ) : (
                                            <>
                                                <option value="">Add a friend to this trip...</option>
                                                {getAvailableFriends().map((friend) => (
                                                    <option key={friend.id} value={friend.id}>
                                                        {friend.username}
                                                    </option>
                                                ))}
                                            </>
                                        )}
                                    </select>
                                    <button
                                        onClick={handleAddFriend}
                                        className="add-friend-btn"
                                        disabled={!selectedFriend || getAvailableFriends().length === 0}
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Members List */}
                        <div className="members-list-container">
                            <ul className="members-list">
                                {tripMembers.map(member => {
                                    const memberRsvp = memberRsvps.find(rsvp => rsvp.id === member.id);
                                    const rsvpStatus = memberRsvp?.status || 'no_response';

                                    return (
                                        <li key={member.id} className={`member-item ${member.id === userId ? "current-user" : ""}`}>
                                            <div className="member-info">
                                                <img
                                                    src={member.profile_pic}
                                                    className="profile-pic"
                                                    alt={member.username}
                                                />
                                                <div className="member-details">
                                                    <span className="member-name">
                                                        {member.username}
                                                        {member.id === userId && <span className="current-user-tag">(me)</span>}
                                                    </span>
                                                    <span className={`rsvp-status ${rsvpStatus ? `rsvp-${rsvpStatus}` : 'rsvp-no-response'}`}>
                                                        {rsvpStatus === 'attending' ? 'Going' :
                                                            rsvpStatus === 'not_attending' ? 'Not Going' :
                                                                rsvpStatus === 'maybe' ? 'Maybe' : 'No Response'}
                                                    </span>
                                                </div>
                                            </div>

                                            {trip?.creator_id === userId && member.id !== userId && (
                                                <div className="member-actions">
                                                    <button
                                                        className="remove-member-btn"
                                                        onClick={() => handleRemoveMember(member.id)}
                                                    >
                                                        Remove
                                                    </button>

                                                    {trip.current && (
                                                        rsvpStatus === 'no_response' ||
                                                        rsvpStatus === null ||
                                                        rsvpStatus === undefined
                                                    ) && (
                                                            <button
                                                                className="rsvp-reminder-btn"
                                                                onClick={() => sendRsvpReminder(member.id)}
                                                            >
                                                                RSVP Reminder
                                                            </button>
                                                        )}

                                                    <div className="action-dropdown">
                                                        <button className="action-btn">More ▾</button>
                                                        <div className="action-dropdown-content">
                                                            <button onClick={() => handlePromoteToCreator(member.id)}>
                                                                Promote to Leader
                                                            </button>
                                                            <div className="role-selector">
                                                                <span>Permissions:</span>
                                                                <select
                                                                    value={member.role || "view"}
                                                                    onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                                                                >
                                                                    <option value="view">View Only</option>
                                                                    <option value="edit">Edit</option>
                                                                    <option value="co-creator">Co-Leader</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Trip Info & Items */}
                <div className="right-column">
                    {/* Cost Summary */}
                    <div className="cost-summary-card">
                        <h3>Cost Summary</h3>
                        <p><strong>Total:</strong> ${costs.totalCost.toFixed(2)}</p>

                        <ul>
                            {costs.perUser.map(u => {
                                const isLeader = trip?.creator_id === userId;
                                const isMe = u.userId === userId;
                                const pct = (ratios[u.userId] * 100).toFixed(0);
                                const amt = isMe && !isLeader
                                    ? costs.yourCost.toFixed(2)
                                    : (costs.totalCost * ratios[u.userId]).toFixed(2);

                                return (
                                    <li key={u.userId} className={isMe ? 'you' : ''}>
                                        {u.username}:&nbsp;
                                        {isLeader ? (
                                            <>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    max="1"
                                                    value={ratios[u.userId]}
                                                    onChange={e => handleRatioChange(u.userId, e.target.value)}
                                                    style={{ width: '4rem', marginRight: '.5rem' }}
                                                />
                                                ({pct}%) — {isMe ? 'you' : u.username} pay ${amt}
                                            </>
                                        ) : isMe ? (
                                            <>you pay ${amt} ({pct}%)</>
                                        ) : (
                                            <>${amt} ({pct}%)</>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                        {trip?.creator_id === userId && (
                            <button onClick={saveRatios} disabled={isAdjusting}>
                                {isAdjusting ? 'Saving…' : 'Save Percentages'}
                            </button>
                        )}
                    </div>

                    {/* Trip Details Content */}
                    {activeTab === "details" && (
                        trip ? (
                            <div className="trip-details-content">
                                {isEditing ? (
                                    <div className="edit-trip-form">
                                        <input
                                            type="text"
                                            value={trip.name}
                                            onChange={(e) => setTrip({ ...trip, name: e.target.value })}
                                        />
                                        <textarea
                                            value={trip.description}
                                            onChange={(e) => setTrip({ ...trip, description: e.target.value })}
                                        />
                                        <input
                                            type="text"
                                            value={trip.destination}
                                            onChange={(e) => setTrip({ ...trip, destination: e.target.value })}
                                        />
                                        <input
                                            type="date"
                                            value={trip.startDate}
                                            onChange={(e) => setTrip({ ...trip, startDate: e.target.value })}
                                        />
                                        <input
                                            type="date"
                                            value={trip.endDate}
                                            onChange={(e) => setTrip({ ...trip, endDate: e.target.value })}
                                        />
                                        <button onClick={handleSaveTrip} className="save-trip-btn">Save Trip</button>
                                    </div>
                                ) : (
                                    <div className="trip-info">
                                        <h1>{trip.name}</h1>
                                        <p>{trip.description}</p>
                                        <p><strong>Destination:</strong> {trip.destination}</p>
                                        <p><strong>Dates:</strong> {trip.startDate} to {trip.endDate}</p>
                                        {trip.current && hasEditAccess() && (
                                            <button onClick={handleEditTrip} className="edit-trip-btn">Edit Trip</button>
                                        )}
                                    </div>
                                )}

                                {/* Trip Items */}
                                <div className="trip-items">
                                    {renderTripItems()}
                                </div>

                                {trip.current && hasEditAccess() && (
                                    <button onClick={handleAddEvent} className="add-event-btn">Add Event</button>
                                )}

                                <div className="event-recommendations">
                                    {trip.current && (
                                        <button onClick={navRecommendations}>
                                            View Recommendations
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <p className="error">Trip not found.</p>
                        )
                    )}
                </div>
            </div>

            {/* Bottom centered content */}
            <div className="bottom-content">
                {/* Cancellation Banner */}
                {isTripCancelled && (
                    <div className="cancelled-sidebar">
                        <h3>Trip Cancelled</h3>
                        <p>This trip has been cancelled as more than half of the members have voted to cancel.</p>
                        {trip?.creator_id === userId && (
                            <button onClick={restoreTrip} className="restore-trip-btn">
                                Restore Trip
                            </button>
                        )}
                    </div>
                )}

                {/* File Upload Section */}
                {hasEditAccess() && (
                    <div className="file-upload-section">
                        <h3>Upload a File</h3>
                        <input
                            type="file"
                            onChange={(e) => setSelectedFile(e.target.files[0])}
                            accept="*"
                        />
                        <button onClick={handleFileUpload} disabled={!selectedFile}>
                            Upload
                        </button>
                        {uploadMessage && <p>{uploadMessage}</p>}
                    </div>
                )}

                {/* Uploaded Files */}
                <div className="uploaded-files">
                    <h4>Uploaded Files</h4>
                    {tripFiles.length === 0 ? (
                        <p>No files uploaded yet.</p>
                    ) : (
                        <div className="trip-files-list">
                            {tripFiles.map((file) => (
                                <div key={file.id} className="file-row">
                                    <button
                                        className="file-name-btn"
                                        onClick={() => openFileInNewTab(file.id)}
                                    >
                                        <span className="file-icon">{getFileIcon(file.filename)}</span>
                                        {file.filename}
                                    </button>

                                    <span className="file-date">
                                        {new Date(file.uploaded_at).toLocaleString()}
                                    </span>

                                    <button
                                        className="file-download-btn"
                                        onClick={() => downloadFile(file.id, file.filename)}
                                    >
                                        📥 Download
                                    </button>

                                    {hasEditAccess() && (
                                        <button
                                            className="file-delete-btn"
                                            onClick={() => handleDeleteFile(file.id)}
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Share Link */}
                <div className="share-section">
                    <h3>Share by Link</h3>
                    <p>Link: http://localhost:3001/trips/{id}/share</p>
                </div>

                {/* Trip Cancellation */}
                {trip?.current && (
                    <div className="trip-cancellation">
                        <h3>Cancel Votes</h3>
                        <p><strong>Cancel Votes:</strong> {cancelVotes}</p>
                        {hasVotedToCancel ? (
                            <button onClick={rescindVote} className="rescind-vote-btn">
                                Rescind Cancellation Vote
                            </button>
                        ) : (
                            <button onClick={voteToCancel} className="cancel-vote-btn">
                                Vote to Cancel Trip
                            </button>
                        )}
                        {trip.isCancelled && (
                            <button onClick={restoreTrip} className="restore-trip-btn">
                                Restore Trip
                            </button>
                        )}
                    </div>
                )}

                {/* Delete Trip button */}
                {(trip?.creator_id === userId || tripMembers.find(m => m.id === userId && m.role === "co-creator")) && (
                    <button onClick={handleDeleteTrip} className="delete-trip-btn">Delete Trip</button>
                )}

                {/* Chat Window */}
                <ChatWindow tripId={id} userId={userId} />
            </div>
        </div>
    );
};

export default TripDetails;