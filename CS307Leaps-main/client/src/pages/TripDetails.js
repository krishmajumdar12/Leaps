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
                throw new Error(data.message || "Failed to add friend");
            }
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
                <div className="lodging-previews">
                    <img className="preview-image" src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxMTERUTExMWFhUVGBcXFxgYGBgYHRsXGRsaGB0YGxoYHiggGx0lHRkaITEhJSkrLi4uGh8zODMtNygtLisBCgoKDg0OGxAQGy0lHyYtLTUyLS0tMDcvLS0tLS0tLi0tMC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAPsAyQMBIgACEQEDEQH/xAAbAAACAwEBAQAAAAAAAAAAAAADBQIEBgABB//EAEIQAAECAwUECAUCAwgBBQAAAAECEQADIQQSMUFRBSJhcQYTMoGRobHwQlLB0eEU8RUjkjNTYmNygpPSFkOio7LC/8QAGgEAAgMBAQAAAAAAAAAAAAAAAAIBAwQFBv/EAC4RAAICAQIFAgUEAwEAAAAAAAABAhEDEjEEEyFBURShBSJhsfAycYGRwdHxQv/aAAwDAQACEQMRAD8A2rRzQW7HXY02Ugo5oLcjy5AQDaOaCXI65BYA7sc0TuR12Cwog0c0TaOaCwog0c0TaOibIog0c0TjoLCiDRzROOgsKINHNE46Cwog0c0TjyCwoi0c0SjoLCiMeRKOaCwo8aPGiUc0FhQBW1ZSe2oIOiyB9Wi4lQNRUGPkvTK3Bc83S4SGcYHiGiXQzpCuROShSiZKzdIOCScFDSuMYOHzzlBOe7NebFGMmon1to5okkRJo12UUQux5dgrRzQWFArsddgrR12CyKBXY8uQa7Hl2CwoFdjrsFux12CwoFdjy5BbsddibCgVyOuQW7HXYLCgV2OuwRo5oLCgd2PLsFaOaCyKBXY67BGjmgsKB3Y67BGjxoLJohcjrsTjmgsKPhu0ZySkC51ajiouR44eEefo1XQpBCm0z7oNLm3nQsAkY+oMHsFpTeUggBQzAZwc4xRil0NEpNuz7JZF3kJV8yQfEPBxHzro5t5clYRMUVSlU/08R9o+gpU4BBcGoIi1SI02GjoG5j28YbUGgnHRG8dI6/wgsjQyUdEb0deibDQSjoi8ePBqDQTjyIuY5zBqDQSjyPHMc8GojQex0RKo6DUGk9jo6PImyNJ7HkdHQWFHR5HrR5BYUeR0ex5BYUfDJ6xfQoZuk+o+sFtMuqZgBvClMxoYLbLM4oKio7vZEFs5vocHKMtlhOzTbwr4w72T0inWchPbln4TkdUnLlhjGOsMuaieUgkpxxo0N7QlVT5ccvOC6JR9In9I0oShRlqZTFedxJZiSKZiHdnnIX2VO2ORD1qDWPj1i2gudKCJgLJKkcUvjXOrRq+iyp/XJUokBT31KIJYA1I5sxOZEKpyhFub8lvSTqJuymBKmpCgkq3jgNYX7a2ubOAsh5bgE5gH4j7yhaq3qWpM1IHZIAckbwod4AioEY8nxBx+ZR+U0Q4a+l9TSgjWOaMnO2oFFMxe4ZSVAgXnNd1QNBjkcjnDWcQSLQq8L0khUsFwEipNKlW8kBmxMNj+IKa/T1Ilw1dxrNUEgklgMT5RQXbylZvIIRUBVKkC9SrtdrhFBG3ErXLDLAqSxyHzD1iGzZwVOnpJoSOrKks6ShVE6s7QmfissJWlS8D48MGuu41ttruIvgXksCWd7tKgAOcYX7V2qEGRNQoqlKmCWttVm6k9xIhhOExQISUpT2aj0pGS21suYgdWi0AFSkFpiWG6XBBBJfu0ivFxU8m72d/wTLDGKNam2AzFoDEISFEgjwbOK1u2pdkGakNQtfBT3ilRm4hFsOzJkIVNnzQbRMBSaulINAAM8i5zi7apyJtnTZVKJZCUFVEEsGCwC+LOIafFSSpu4+fPkiOFPZdRTtfbBmyFpl3pqwxT1ZcOM3V2RhgTHtg27OVLSFzLk4HeChRUtr17BnDEAjHvhnZbMmVLEqWogJVddTXi9dMA8Qt1mMud1aZf9olSBgu+abxfeSWJq5FBFeHiItuKbSu7/PoPPE+jf7UWbNtsJSkTVh2DqAIYEUU2YgNp2jOlyiZi0zM0qQgoOoLFRc4U9YrS7MWClBImV7QBZnAzYjA60aCoEyZNKFTEo/lgoAQAVFLukKLpDNkHblETyZMi061uEYwi70sqWDaNumzilcrqEgGqlJzAINcjVsQ4yaGM22WpJQAlKyQs7pobrapfXTm0Ftk2YClAWhE1YJCVm+HagJYOcqcYqKmlSv0qp7T1uFG64uOFKSh8HD8m0DQiyzT3r+W+nncbRGtr/ot7N6QJmKCSRVJJLhgq81x3qW00MMpdvQq7dJN4EhgcBQuWp3xmNuEm0SrPJ3FJJUWS7hSaLIwLM2rQbbNtQky3WEqMtSVKLhlYgsnddwoOGrnGqPGZNC0rq/P+foUPBG3bNEbYgO6mYtX6RL9Wj50/1CPmdutUsSlEzlKIAUGBDgKukVVuk1rXERS/8k9sP+0XY8/Eaesb9hJY8N9JDK2bPUkuQToR7pCWzylSp5SOwvebQ5x9FJHvOFO0dkomtd3VioIFO+NJlozVollKwoCmB5GGMuReBfP1g0+wqSkhaeDio/EebNmboJ5d+Hq8RQWULOkpXofrH0SxlCpSWYUemIJLl++vOMha9m395JDjIDPx7ooWnbSpKXF4k7oyY5450bxjJxmCWSCSLsORRbs3m0bSKXlugVYgb3CEW29rJQHQUuK4Esa6YwGwW3r5bLTdOWn5MLttbCZTpmb5ZQJJOrgJfsin2jmQ4esijkfU3cy46oAU9IVEJvqSbz0bK81ScADUipoY3dhXugpmXihKmWm6ylKU5SMcWxLtHzDY/RifaJ5CgES0gFU0VSAltalZagp3AR9Blqs9nsiUy1LCEZrBvKLuTXB+AzjZmxctacatvsVY8mp3LbyWJVkRL6ybMX/LJSadorI3klgGD6GMrtzpChUxKpYZMsghA3aJL7xFa4Uy50PtLpTIXK6pJDve3XYFWRepPGMsJKVE1e75514feDh8PzOeRdWGWfy1Fm22d0gmzpS5oX1YSsVXdZKWwYgPq7iI7Y2rIKBOmrSpZACGRfSFYXqbr5VjGpm3+se8JSAQoJJAWSKppUgZw4QsIlIQhLMBgPExrXDR1X0/r7mb1Eqoa2DalnUodfMUtKEYXbjBFCpgLxdxwie0ukkj9QkSkhZUE9Ws9lF4MFHMkVb/AFDmE022KCk3uzXQudDFyXbZaVCZNF5hRTAlJ1D+EVy4RRuV3W34iyHEt0thrsixjdZK1TEpF+YyWJvHexJLk9og9wjSmaFKShQIWUqUlQO6AKFzzanLux1g6fiZO6sSUIA+IzGBT4BvP6xa/wDNAH/lhkvW9vbxwACWbi8YXw8nJ3H7GjnRrcsbR2ROKCp3oKsbySSOOQOOVIs2jZ80olIDukpWFZBlJYKJDigcsNRnGYV05WFJokIDlRJWaklhu5YVPCL9j6eJmrCQbo+O9QaAAh8NDpjrC4bJHrWxPPhLpYysuxROtXXT135srdIQAJd4YKaqgrvakRsskKt02eQCmSQAQXN5lhQAGd1QLHWLaekEiURLC0rWoOGIdRJJLNQVc1OcKNr7RXNKk3xLQCGQk1+a8WDgvrELDkyS8dCXkjBMfTdnoFpTPd5jLRSrOkFzp2R4wi6R2RNxMy6QTOXeSoNeQslJPIBljlGa2hblomg31JvF1lJYEsALzmrAe3hbbtpqmquk/UP8z5vGrDwEotNzM+Ti4tVQvsqJgIuywQSpIwqdW4awz/hqvklf0S/vBLDsxQWFFTlsK8Kw7/Tq09+EdRyce5hilLsOOIbjBEOMIKUpmClFaj3WK1xSFN56wgx7Mq4OeUILZLEqbd+GYCRwIxjSqQGeKO0dnibLKMDilWN1WREGxO5U2bNVmaZZvyP0i3abIiaLq0hSVZHUZg5HjGZsE1aFdWtQvYXXul9Q+PdGlDlLtDJiMF/D+pG4CUaGpELLfY1FaVSyqpZnJCdSkY10TDuXOUBTSrwNc2t9NFJ0wf8AMLJKQ0XQxsk1KJaZSHAT2nYl8SVEUfh9ozfSm3BZuDAegH3MVP1q5Utj/aLUVrzYqrd7vvCu0268CVMCSwbkIrj1ZbJ9BRQhxi+PfnE0z5iOyRXUPjSLdqkpZgwfECDybMkuFAKuswBYjUtnFvQpsvXOsuSpTBwwGgzUeHq8PZ1iQCEhRKm4N+IBseyJQ6gxLBjqDUPxoIrrUtK3OdPrCKVDuPQ82sZaU3FrAJqMcRoWb94Xy19YpKQRdcAkVcYkA90W7UhExDTQ4GGXnFHZSOqWwVeQcjkcj4OIs6Mr2M3tFHUzlIDkPunUH20GmCYkAkEPUH6c4ebTsihMvABaVqACWN5JaqgwcDVv2Ha5aVG6F0GBVh4iviInsQ0LLMoXVA1dOBY1DGBonXaANWrZ84LaUnG6zONXdxiYWORrAA2NoLuNGfAmuZGX2i2jbnVtcDfMSSSrAEknOg8Iz2/pHEKZzEaCdQwts9KyVEqfyrjSAicAAyqjUPFFSo8vQJUQOZPSCagEJIqGqH8NIF/HZ3zq/qV94UKXHl6B44vq0NqaPuCRdNINMVeSafvB5Ul0k6d8VptnVunLFn0wHKKnlgpON/m4+mTV0VU2kAC86bzgXgRUZcY42ol0oTeUMU/kkCJW60rSipFfhNS30hXZre1M373d6+ECyKWxGlopbTswmTFBctSFourTkQFYhxQsR5xfs05kkOTQl8S2dBjBdoyUzk1JBFUnRWsDlFPaJZQYLFN44Pwhk6YrXQIuWxq7aP6wn2ygymUgm4TUaHmcodTUuopTnnoRnyhB0mtplyrqkuXAJwGtPCGpC2yjtFRUAQ1dSB3VzhJMs6lEIUoM+VW4wQ2sTAAKGoD4HnEUSFy3DPp7ziVSJ6stbSMpMtKJYW+ZNSaVwgNhlG+FLJBfsnEgB+4c4s2RSiXICdBnyiS1mpAcqx4wkp9iNI6sG0Q63zWT3XQPpAJdvKypJY6NSFSlqpTjXlAZloCQWZ4rW47bY8SSVMSG0EEmIpTDDjq8ZY2shiMYvWK2J+ME44EiLYitjKfbFXS1FAGo1EZ66TvgA8Rieb4xa/WkqLCj+sCE4AMfKG+gv1PEXy4Y8CTjEZpuJ7FX1duEDtMwmoUYnZZp7JYDPlBbRO55Ms5UAbwDgFvpFRSFDI4PT1hkqUoqoASMMBBLFLKlKClFN0d3KmMNrSFpiU2ckFQBYYmBCUY21h2fPNUpTdIFVN6QRey0IUVTlpVmEgM338ItjilLsI8kYrcwYkqJZKSo6AE+kG/hc/8AuV/0mNpM2kALstLDhSKv66Zr5n7xeuHXdlL4h9kbTYO0Vz5SlVAe6+D4e35we2WxUsELoSQBwwxL6ViVmISQAyUqOAAa8pV68Gxd/SB2uyqWrfYDEkVBIamPf3R4t5XmzOc+iPQxhohS3E1snrLpZ3NC+UJNn2s3lPiFHAM1WbuLww2nN6v4gFFrqRiE99YTfrUneugqJLk92XhHewQjptOznZZPVTQ8RtAPRhSvF4jOnAEKAOPs++EIxaBUlvzE5E1Snq2FeEN36imise00pBDspWfDhoKwO3XFdouNPrCZc1ITvvTTGJ/qUrF3A5comK2VitkDMlJUyQAcxrSBz5F47mdW04QK0WVL3iolstBzixsyWrrparqihJvkEHBAKiaUwGEPkjpVkY25S0oimyEKTfBCbzEsThjTUDKNHt/bslJSmRMmSE3Q4RITjmXvD2YZNKlolzFplJfG8AsgqClEG85cnWsBk2xM+0AyxJ6hKaq6mWHVoFFHEU4GOdPioyV9aR1YcFKLro2ZO27cUAVItloJFWYDmKqMWLHtaTapJE+U7rIQsIReSDVipN0vk+bCNuuzyzimSf8AZL+0V07MkvSRIPNMswmL4nCtMlIefw2d2tJ8iKSVFKAVAYFsno+mXjBRLmBTXa8aRvts2qSiebOpEmUlF1QCJY377kqTVg1wJJrjwEHn2VE8XbPLSEg7xUtLDEC7dTqPWOpCWtJxOXPHobUjCmWoUo+jxfsGzUzFMs3T6xoZHRNCDeXPbFwgOK8VUgybJY5eRmH/ABG95Cgi+PDzkZXlhERbR2SgUkS1rWCHAdVKwJPRi0LcqlhD/MoJbuDmNLM22AGlpAGGnkIoqtUyYSCcQWywrhnQRo9MquTK+fbpIpSejwl1mzksMkuTyMGTMs8v+zlBR+ZdS/e5jyUh0LFSzKHdQ+RgIRuk6N5vFkMcI30Kp5Jy7k7RtKar4ro4UigpL4kkwzs1hKkKVoKPTBn50MDEhI4xapKVpditppJsopkk4eUT/RH20Xbp5CJdUOMDSW7BN9kaDaImCYCBusm4HLFqNXNnLx1tnrlpKWwd3OL6DgWpnDOZMxOKRUZmjYaZwot8tcxd27ukgk8601xjwcZKknt+e56uSaujLW+1KKt9icMBnyo75wrTZR3O+Pk8O9s7JmJmEJFKNxfU4O9WinYtkzCasHNOJ/aO9gyQcU1scrLCVuyg0s1BOOHp+8WVzLv3ia9i3Z1x3oTn5xUtiLirpIzbzi6lITqia1FRc5YGCWRBVMCWxLP5xXk2eco7stZB0Soxpdi9HVlSZky+hjhdCXzzgjilq6BKUa6hZuw7qSVGoGcWNhT1dVMmzE3UoN1IZnCWJPFypH9JjSGSgmssqOFX+tIntbZy5sq6hIB3HGAYb3/68or4zHpilJ7uv4NHBT+dyS2V/wAmd2ta1ps6VFRckj/41E+sZ3Y9t6uQLs6aGNU38Xbs09Y0/SrZizJCWogLUeNEpA5kwgsHRe0KlpNzGovECh1eFxcrQ7rcbIsjmqvYaWTa6Fub0/8A0mYPHCL0q3i4spKt3eN4hVIT2fo3aEqULqAWoCQcS2WGtdIcy9lLCAm4HulKlUF5x/q14Qk1gXZDx5/lnm0EBCjOSlIXdQQQPhmAlhw6wDxMIbTbVJtAmA/2yShTDFSd9JpzmDuEaW02ZXVolqYKMu6STQFK76ajkIW7c2dLFnupU81BCkKHZBDtXMBzTOLuDklFV2/2Lx8G5W+6X2K1slzEqKZoKVDEKxHnFVTcTBbba1zFmYs3lHEsA/GlIEiQtWVNTSO1GTS+bc4Uo2/l2IlUeybzgpGBeLCLIBjX0ixKRVjQGnLjEu2voCSs6XYWWpTulnAHyq3W7nPhHkmzXVLQzG6fLeHpFyxy1MqXmN4P/hqU9+NIvWqzhShMwSHCiaOAGcagiME86xzcZPt/z++psjhc4px/PP8AQus0ligKwUhZPJQI9BFWy2e+q6gVOZ8YLbZy1FM1JoN3vD5cQYa7IsTpMxD73w5jUceETl4l4cbyPd/e3/sjHw6yzUFsvtSE1r2etMoKSlSl1JAyDsO+LX/jM/TzEauQu4hgKjPU1p6RYv8AAeP4jzuf4nOUjsYuChBUjMolLSmddIU6gQMGvb2IqRQjxivtC23CkqBTU1+gbWHvVy0qUVTkkmjAORkGu6cYGizIBDWiYojB7o8GTSGx8DOclrj0HnxEIL5ZIzMqTPWdyUog4EpUz5VIi9Y+jtqJBUpq1CUE+ZIpGg61A7c0k8Vn/q8V520rNmym1Kj6j6R14YNCSUTnzyKXVyBp6PoJBWkqVqSPoYsI2WlJdMmUD8xIfyD+cU5m2pOQT77oqzdsyzp5/aL1rWy9iusb7+45UgjtTEjgmno584rTJqU9m6+pJ/fzhSbbKMSTPk8YbXk8exGjH5X9lqbPmH40gcHH0h0tIKjwpjpSESbXIEP5MyWQSZiQXVQmrAmOV8TySejV03/wb+CxxWrR122OtMlBa6nm/wC8fKtsbctKbdPkomqCSq6kXmAYDskkBMfU02uWSQCaFiWo7A+ihHy/bHRW1Wm3Whdnl9YkLDm8lLXgCBUg4RTwU4yyNNrb/RZnU4xTV7nWLpTNQLt4+teJJrDfZnSqZMmoRe7RAqBGVtPRm2ypnVLs5C7t5gQd12dwrWGGxNhWtE2XMMsISFpBKlXfJ3weNHEctRdtXX0LuHnOTVJ0bnac8G65IdSQ4GDkCK9v2UhwCpSlJL3lHEkN2UgJZiaMYH0hdKATNlqZaaJWFGhd2xaM1tfpWDLZBUSFhOQJuqqXGRILRn+FqcouTfcb4nKCpfQ00vZCR8aSdSCfwIL/AAx//UHhFxG1ZbA3YivbcsfD6R21PKtl9jiOGDu0Vv4akYrHhA12ZIwV5QY7YQfh8YlL2nL+Q82HsQ2rN4fsLoweV7gU2ckpVfIUkirY6UizapV5BSHquvJ8B5eESTtBBpcx0Z4jNt/UrHWIvDFLM4OYWBw9iMOfHlclKttjTjliSavclI2ci4xVu9oFq4NSvKHOzRLSlwN1L5u/OMzM2gszBdYoF0jHsmn18mgll2mD/LLDeahxzD+MYs08mWMovzZoxRxwar9htarag/2YvOQGc0dQd82zip+s/wA4f8R+8UJm3kSpgQpmKksQWbKvk34hh/HU/J6faMbxSj2NKyRezEkzbDdlHi/7RVnbWmnB+6npHAnM5wRBI/byj03qX4ON6ZeSgqbMOSvAxES5h+E+BhqZzYmPP1fM933hfUy8E+kj5FybHMNbpiRsixikxcVbFZrblU+MDXag/ac8a/iI9TPwT6XH5KwlrySY7q16GL6QpnJujVVIJZjeP8sKmceygf7j9HhHxjXYdcFHyU7ChfWIJQVAKBIZ3AIJEbiXabOLqVMlSikBO8aqIujDEuKamEMqwLL31sPll0HecfSEPTkLMtQloWphKa6FPulBoU1yxEc7jMj4iUUzXw+HkRk0zU7UkLXaZAlk9QhU0Twk3a3UlOYV2tIsyOrkpWbMHUtQJT1ihfVRy6iQ4TXuaMii0pQgIQZySQl7kpVVAAE1QXJausLimUkAATAAXAEm6LzXf7vSkY1jkui+z6/uaW13Z9InygVBau3dCXckgO7Uyc4xQ2pPkS7qZywm8928SHbGuAxjGLt6lJuqEwgUAMsUfLsAj8xStikzAUqlzVDC6wSAP9rMYWOFt/P+f2TzHFfKxv0n2pZE2dbKSVKBuDecqDMRqASDGD6opnygQbjyy+W8Ek+ZaNPYtmWaXJEwSgFlS0qKq0ABDAkjM1GkUpJE6TLSXDJRgZYe43zLBy0yjo8LKME4wXfv+fQycQpZGnN9jZjZijQLHnBRsM/OPCE0u0FviPJYPpMMHF45K8X+8bfUZPPsjL6fF492NU7E/wAzy/MXLPsIHFbACpIDDveFtmsW7eWkpRqQ5J0SOpLwn6Q7dupuJAQkZMmp1IMsOfSHjPLL/wBeyFlDDH/z7s09pnSZAIRMF5qrLUHDSMZtG3rWpkkmtVJUH5tzir0fs6rXNZRZOIFASK6DhGmsvR7qgCE46aCvr4RDzU3Gcg5Lkk4RI2OstrwCgpwWxqSRwqSecTt6Esq4DeopjmeHmIImyqKgSkh6AasA7txMWP0ExLqagNPFsNYzZceLUmpUWQlOqaFU6zIJUyAAQASSKDF2OBerRWZf96j/AN/2hgpDKvdWSXvkb7XqHB2eoi5+tm6D/jR/0hocLKStr3FeaKdL7MRKn6esR/U6keMIf1ajBLysVMkcY1cutyvm3sODagPzEpSlLonzoOeMKZE8vupvnUinnFwomLotRb5Ui6PKDlvt7hzV/wALK0oSWXNvH5JYc/iL1gsy8UpTKGqt5XhgIo2QGWGQAniw+sW7804rPiIiWG+5Mctdvz9xrKscgF1PMVi66h+WA8IvonBgBQZAUpCBCln4zl8X5iV44mYT3mE9Ou7LPUVsjQBYw+kcSnN/flCEKx3tMzEFLSPi9YPSx/EHqX49zQlSeAHdAJk6WMGfmIz5mA1JIHKIUOvhB6WH4g9VL8Y6mT0HFs6AjzMAvyi73a8R7P5hcmUnj774sSrMjQ+X3g9NAj1ExhJVKAo3vui5LtEvAM3f9qxQkWVOnmIb2bZbuycMn0yw0hZYcUdx45cktqOkzkePAk+kMFTpctLrxyGfMxOTYQjspBVqcB+Yr2jZssqKlrUXyfUcK0r5RkzcVwmB/O+vgsUc89jNdJek4BZIvqYkJFDgC1Mi48RGY2VsFVoImzXBOQwA5cI+gyujVnJBY3qu5yINMMN4DwhtJsMtCWbiecJH4nhcNURnws3LqIOjfR0SV3vBg37a98aAy/RoJMXThFdVqAGIA9lo5XEcY8k9RtxYlCNIKmWkNQUbuiJd/wDCK1wOLwPrHBxbxBHtoj1hLFhhj6DjnGd5XJ9SxRo7qkqQbwBBOdKUYEcuUG6qX8qfE/eALZOAJAFWyzPOkTcaH33RYs8oKtRGhPsfHEXsmQOFT78YKiUHc7x1UXh1JsCKbr8yRxgsuyS/lfj9Y9askVscJ4pPdilBgyWhx1CBikDSkTFwBwAxqDQ41y94RPOXgOQ/Irlt7EGSeBhiDqzUeIzJwAfE/QU9mDneEHJ8spV0PhHpWoYg+Bi315LGpfw8M/fcMTgmhNcvsGwxg5z8Byl5Kxvn4TAbq/lJhghWD0anH8+6xbSgUycU5e/3hXna7DLh0+4pTYZh+HzgyNnTNB4w3lsnACuWufhFmVJL1wowHLWE9RIf08RVK2VM1A79IY2fZatR6H0hjZpTjDVvH8wysliA3lUH0hefN7DciC3I7I2RmS4hwlATQQuNuKVBk7mFCPH3pB5lqDuC9I5XG5nCV2bMOO1VHtqXiBzjP2i3hC2VUGjAOSTlXKuMGm24ioq414gD6+UJbPPM1d7q1BIJvAjecAeGPKOI8LyS1m1RUOjNIqpF01Hez6wdSu6AWWQQVKzy5acde+I2lYZsMnhnCl0IvqRtU8gFj4Cr8oXPeCiFB3IrugkZV54x5blqubhJcsGI4Oa4NpCeTM6wXVKU7BO6MFNewGFGOOXCGhjbVsLofWW0JJCGcGumFO8D3lFtc4JKaF+FBzxiopQZG8wA7mGPDBxFL+IyqELQouEOpSajEsHYsWwxbhFa67DDDac8I3gApWIBIDa1PMYwH9ar+6Pl94DtaeyCugIFDmC4c8KZxlf4kr50/wBA+0WY8TyK1/kWUlHcsBOBJoeI8OcSvCp00z4aCK5mXTX3XxPhHipo1q3lyzj1iRx7LKMchrXh7rHCaBhXn74RQE2rlw2XOsSmkYE3jnjp7Z4mhdQdE0niaNT0gc2ZQ6vU8uUV0TSeyMAzZtz0gyZQBxd6hqeeY4ROwLqFKyaAY6f9oPLlh2OOpwyHt48lyaNhTu8s8oNdyGIag48IS76Ieq3JykOW9s7U09IsCVeGOj8vrHSZegHIaVpWLUpDij68ftlnEUTZ7Il4HPBuAx98YvyLO5Hvw1idmspJYDE17sIYLWmSnB1e9YKsm6CSbOlAdTPkIBPtVQ9dA9B9zGft/SeVLczJgCieJHkGgY2pLWElEwLDYgjDFzxDANHD+JcTnjJ44Raj5rfoaMMIvq31+wznWsl0oYM+J8H4GEto2tNE2WA/VzCosBU0OPCjwRNpAvKUpJSAA40BJalD+YSG0LeWuWSoTVEJ7NEpZ2Uc1YBPBRyMc/Bic22+v7/n8m2Tio7DTb1tmCSkSSSpRwLdhy7vjDDorbVTEXlEFQUQQNBT3yEVpcszJm8l0qTUGpYtgUvRmyyinsvYxkTSpFCq8RLJLBFHS9QGJFc3bUxoxaeW4vdCuLUr7G1KqNhlj35RQtqCslITiMVYEAZjBnLQeSkXTQpejO/ZDU4MMo9SsKlkOwqmlDnUH6xXzaHoz/6pIXdeYSglO64Sok9ljQlm8CNYz8yzTlzysBUnrQACAXDAElT4XgSxBxA1aNTNlMVKAUSEmhyZy/e+PAwkmbeUN1kPdos8K0YMVHmMI2Ypt3pVlU0u7MttCfO61MuYuYEqoFXd4gfFdJ8YaqtUsgOpLJVdJBYhKiCQmlS4dvoYrbVQhaZa0LIa7cBIWamruAU9l34CmYU2kmddSAR2cHJYlgSNR9RG1QU0uxkbcW+5pZ9vC3SSVFlXWcEpuu7jQoJbWEv8NV/j/wCA/aAIvIWE31OgijEgu+IfAlw3Ea0ctav8z/iV94XTy/0/nsNev9RCZaqmudTnR/CBTJoH4ga5gyH7at3+sRRJBDkmuD8OGfpHXtHPdsnMn4fvU+sEl6nH3j7ePES0mjUDZuXprFqXZU0OJfDTuzhW0MotkZZOVBjUY0egz5mLSE1pQFs/r5MIHhgau7HH3wi4QBvKIcuyQCS55RAx6h/hFH8PDD3nF2XLwyGIvB8B4jF4FJWWySTgO7N+BhhJSbzlyS7HFtWMQ3RKVk5UrE65Y8i5bKG1jshUXGGZL+/CIWCyFry2CRhl3j7xX2rt1KRdSQhOZzINPGkNGDe5EppbDC129MsFKMQKk4cow+3ek10MHJU/O9UUpCnbu3VF0pNTyaF1gsqlKKlkF+/zGEaIwSMs8r7Ci2TZs9daMffOCKslBeD5Pr4Rp1SZYZxUDT6wKcmW9Q4yIy5VgcEKpszybVNQpwskaKN6gwxi7N6TzlOL7OQrsghBHyON16/gCJWqwIUXSsh8Qaj3xhZNsi0qDClUlSdC4Pk4jJPh4btI1QzS2THMnbi0zZSr14DFysBqnEGhDkUphjGln9M5RmEmUop3TeeoUMFAYBg2EfOZUtZZLO+A4MSPGHNnsF5CrhVfRdOIAUGSzHLEYxjzcLhdNmrHmyvojanpUFLQmU934lLS4FHe6C548AcTDhe05QcJJCmSC4Jb3ryjO9G9kPdLC6kBYLuSSGLsfBqMGMO1bKS4UmmB50wwjl5cWGLpWdDFratgbZtMgXCaMBewzYqI7jhGY21aTNLUzAAfVq8aQ3tqmLENdY8e07OcqGElmlqE0oYVQVb2SmBSR5ONL0auHhFdUupTnvaxHbUJ3kjtDANwZq4YeQpDXY9lVJ/nrdKZiQGUMGo7cq98WJOykpmhQVeCrzlibrbygBjeAp54Rppuzv1YSlimUwLHEn/FGyU01XYzRxtO+4j2JbkTLS9nlBcwAgrYm6OD0Tz9Y2l61fL/APX/AKxHZ+zU2aXcs8tJVSj3cTUlTHKHHVTeEUSkl+ktjF11PjqJgAqRR6e/dIN1z492Z79BFCQHDmOUKx2dCOTzHQ1VbEgYHiMvdYki2PQA+nGF6JY0izZ8uZ+v2hliiQ80i7Zpqang4JP2rFuRawQaVLhzjwYYUrhFNWLZQaXjDLCmLzmhjJXvmlaPjiDxx7qRo7Ejq09ZNPIYe+ULOjMsG8SKp7PCK+35qjMIJLAAgPnDrBHuK88ux5trpGS7FgHYUYmMTtXbilqZLOcTjTKK23J6gWcsC3kDC2zGvMH0hZOnSBNtWy9Z5bF8TjX39Ie2WakpoLtKaCE1hG6k8/JmhlIGHEseUMuiEe5emS3piT3ZjBoXzLK5eoxr+IsA4j3lF7aKiUJJJJc56BJblU+JhJNWl5GiujfgTdUoEsHatAx8C0Ntjo32VvIo5DOKpPfVqca6xCWf50viEv30jQWSUlzQfCcM7orGPicjUWkb+ExJu2DTsWSsq3QWIYjgxanFIGWEFXsGUEsBim6oucEs3dQw0sYpzUSecGmKLH/SfSONz5HX5USOzJKUBg4oKZYCgfvPfBZk0AkCo/EUL28f90BUslI5K9H9YySWp2y5LSDnS0FRXiWpwq/J6wGTLLC6LxBvAEAsBQhLh6jT6iLFnDJPd6KP0EMrKkOf8IS3CkWqdIrlG2BseyEIulTOk45P2Q2m6QO6GVnQQSALssMysycCAMsvGC2UXioGoBoPAwW1HeHd5mCOR2JJLYlLNQAG9vB7yvZgUuiKe8Ii/LwEW632K9J//9k="/>
                    <h5>{preview.name}</h5>
                    <p>{preview.location}</p>
                </div>
            );
        } else if (type === 'travel') {
            return (
                <div className="travel-preview">
                    <img className="preview-image" src= "data:image/jpeg;base64,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"/>
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