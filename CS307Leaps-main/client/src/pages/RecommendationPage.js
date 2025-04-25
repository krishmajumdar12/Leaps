import EventRecommendationsSearcher from '../components/EventRecommendationsSearcher';
import EventRecommendations from '../components/EventRecommendations';
import AddToTripDialog from '../components/AddToTripDialog';
import AddRecommendationDialog from "../components/AddRecommendationDialog";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import '../styles/RecommendationPage.css'


const RecommendationPage = () => {

    const { id } = useParams();
    const token = localStorage.getItem('token');
    const userId = JSON.parse(atob(token.split('.')[1])).id;

    const [trip, setTrip] = useState(null);
    const [Loading, setLoading] = useState(true);
    const [events, setEvents] = useState([]);
    const [tripMembers, setTripMembers] = useState([]);
    const [error, setError] = useState(null);
    const [results, setResults] = useState({ events: [], travel: [], lodging: [] });
    const [success, setSuccess] = useState(null);
    const navigate = useNavigate();

    




    const fetchTrip = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/trips/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch trip');

            const data = await response.json();

            console.log("data: ", data);

            // Fetch vote counts for trip items
            const votesResponse = await fetch(`/api/trips/items/${id}/votes`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!votesResponse.ok) throw new Error('Failed to fetch vote counts');

            const votesData = await votesResponse.json();

            // Map vote counts to trip 
            const itemsWithVotes = data.items.map(item => {
                // Ensure proper matching of trip_item_id with item.id
                const vote = votesData.find(v => v.trip_item_id === item.id) || {};
                return {
                    ...item,
                    upVotes: vote.upvotes ?? 0, // Correctly use `upvotes` from votesData
                    downVotes: vote.downvotes ?? 0 // Correctly use `downvotes` from votesData
                };
            });

            setTrip({
                ...data,
                items: itemsWithVotes,
                startDate: data.start_date ? new Date(data.start_date).toISOString().split('T')[0] : '',
                endDate: data.end_date ? new Date(data.end_date).toISOString().split('T')[0] : ''
            });
            setEvents(data.events || []); // Assuming events are part of the trip data
            setTripMembers(data.members || []); // Ensure members are stored
        } catch (err) {
            setError('Error loading trip. Please try again later.');
            console.error('Error fetching trip:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleResults = (data) => {
        console.log('Received results:', data);
        setResults(data);
    };

    const addToTrip = (addedItem) => {
        setLoading(true);
        console.log("Would send to server:", { tripId: trip.id, itemType: addedItem.type, itemId: addedItem.id });
        fetch('/api/trips/add-item', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ tripId: trip.id, itemType: addedItem.type, itemId: addedItem.id }),
        })
        .then(res => {
          if (!res.ok) throw new Error('Failed to add item');
          console.log("Sending to server:", { tripId: trip.id, itemType: addedItem.type, itemId: addedItem.id });
          setSuccess(`Successfully added to trip!`);
        })
        .catch(err => {
          console.error('Add item error:', err);
          setError('Failed to add item to trip.');
        })
        .finally(() => setLoading(false));
    
    };

    const navBack = () => {
        navigate(`/trips/${trip.id}`);
    }

    useEffect(
        () => {
            fetchTrip();
            console.log("in use effect");
        }, [id, token, userId]
    );

    useEffect(
        () => {
            console.log("trip: ", trip);
        }, [trip]
    );

    return (
        <div className='text-container'>
            {Loading ? (
                <p>Loading trip data...</p>
            ) : trip ? (
                <div>
                    <h1>Event Recommendations:</h1>
                    <button
                        onClick={navBack}
                    >
                        Back to Trip
                    </button>
                    <EventRecommendationsSearcher onResults={handleResults} location={trip.destination} />
                    <EventRecommendations results={results} onAddToTrip={addToTrip} currentTrip={trip} />
                </div>
            ) : (
                <p>No trip data found.</p>
            )}
        </div>
    );

}

export default RecommendationPage;