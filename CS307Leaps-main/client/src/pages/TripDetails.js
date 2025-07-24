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

            if (response.ok) {
                // Update UI immediately without waiting for refresh
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
    
                setSuccess("Friend added successfully!");
                
                // Remove added friend from the available friends list
                setFriends(friends.filter(friend => friend.id !== selectedFriend));
                
                // Reset selection
                setSelectedFriend("");
            } else {
                throw new Error(data.message || "Successfully added friend");
            }
        } catch (err) {
            console.error("Error adding friend:", err);
            alert("Successfully added friend");
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
                        endpoint = `https://leaps-ohwd.onrender.com/api/lodgings/${id}`;
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
            <div className="nothing">
                <img className="preview-image" src="data:image/jpeg;base64,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"/>
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
                <div className="lodging-previews">
                    {preview.photos?.length > 0 && (
                        <img src={preview.photos[0].url} alt={preview.name} className="preview-image" />
                    )}
                    <h5>{preview.name}</h5>
                    <p>{preview.address}</p>
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
        } else if (type === 'travel') {
            return (
                <div className="travel-preview">
                    {preview.logo_url && (
                        <img src={preview.logo_url} alt={`${preview.airline_name}`} className="preview-image" />
                    )}
                    <h5>{preview.airline_name}</h5>
                    <p>{preview.departure_location} → {preview.arrival_location}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
                        <label htmlFor={`price-${id}`}>Price:</label>
                        <input
                            id={`price-${id}`}
                            type="number"
                            step="1.00"
                            min="0"
                            value={preview.price}
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
                                    {/*<button
                                        onClick={() => fetchItemDetails(item.item_type, item.item_id)}
                                        className="view-details-btn"
                                    >
                                        View Details
                                    </button>*/}
                                    <div className="vote-buttons">
                                        <button onClick={() => handleVote(item.id, 'up')} className="thumbs-up-btn vote-yes">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M7.493 18.75c-.425 0-.82-.236-.975-.632A7.48 7.48 0 016 15.375c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558-.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23h-.777zM2.331 10.977a11.969 11.969 0 00-.831 4.398 12 12 0 00.52 3.507c.26.85 1.084 1.368 1.973 1.368H4.9c.445 0 .72-.498.523-.898a8.963 8.963 0 01-.924-3.977c0-1.708.476-3.305 1.302-4.666.245-.403-.028-.959-.5-.959H4.25c-.832 0-1.612.453-1.918 1.227z"/>
                                            </svg>
                                            {item.upVotes || 0}
                                        </button>
                                        <button onClick={() => handleVote(item.id, 'down')} className="thumbs-down-btn vote-no">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M15.73 5.25h1.035A7.465 7.465 0 0118 9.375a7.465 7.465 0 01-1.235 4.125h-.148c-.806 0-1.534.446-2.031 1.08a9.04 9.04 0 01-2.861 2.4c-.723.384-1.35.956-1.653 1.715a4.498 4.498 0 00-.322 1.672V21a.75.75 0 01-.75.75 2.25 2.25 0 01-2.25-2.25c0-1.152.26-2.243.723-3.218C7.74 15.724 7.366 15 6.748 15H3.622c-1.026 0-1.945-.694-2.054-1.715A12.134 12.134 0 011.5 12c0-2.848.992-5.464 2.649-7.521C4.537 3.997 5.136 3.75 5.754 3.75h1.78c.483 0 .964.078 1.423.23l3.114 1.04a4.501 4.501 0 001.423.23zM21.669 13.023c.536-1.362.831-2.845.831-4.398 0-1.22-.182-2.398-.52-3.507-.26-.85-1.084-1.368-1.973-1.368H19.1c-.445 0-.72.498-.523.898.591 1.2.924 2.55.924 3.977a8.958 8.958 0 01-1.302 4.666c-.245.403.028.959.5.959h1.053c.832 0 1.612-.453 1.918-1.227z"/>
                                            </svg>
                                            {item.downVotes || 0}
                                        </button>
                                    </div>
                                    {hasEditAccess() && (
                                        <button
                                            onClick={() => handleDeleteItem(trip.id, item.item_type, item.item_id)}
                                            className="delete-item-btn"
                                        >
                                            Remove
                                        </button>
                                    )}
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