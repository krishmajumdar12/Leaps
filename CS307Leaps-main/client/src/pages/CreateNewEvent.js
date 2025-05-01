import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/CreateNewEvent.css";

const CreateNewEvent = () => {
    const [name, setName] = useState("");
    const [location, setLocation] = useState("");
    const [date, setDate] = useState("");
    const [start_time, setTime] = useState("");
    const [type, setType] = useState("");
    const [price, setPrice] = useState("");
    const [description, setDescription] = useState("");
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isPublic, setPublic] = useState(false);
    const token = localStorage.getItem("token");
    const navigate = useNavigate();

    const handleCreateEvent = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccess(null);

        const eventData = {
            name: name || "N/A",
            location: location || "N/A",
            date: date || "N/A",
            start_time: start_time || "N/A",
            type: type || "N/A",
            price: price || "N/A",
            description: description || "N/A",
            public: isPublic,
        };

        try {
            const response = await fetch("https://leaps-ohwd.onrender.com/api/events", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(eventData),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess("Event created successfully!");
                setTimeout(() => {
                    navigate("/customevents");
                }, 2000);
            } else {
                setError(data.message);
            }
        } catch (err) {
            setError("Connection error. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="create-event-container">
            <h2 className="event-title">Create a New Event</h2>
            <p className="description">Fill in the details below to add your event.</p>

            {error && <p className="error">{error}</p>}
            {success && <div className="success-message">{success}</div>}

            <form className="event-form" onSubmit={handleCreateEvent}>
                <label>Event Name</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />

                <label>Location</label>
                <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                />

                <label>Date</label>
                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                />

                <label>Time</label>
                <input
                    type="time"
                    value={start_time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                />

                <label>Type</label>
                <input
                    type="text"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    required
                />

                <label>Price</label>
                <div className="price-container">
                    <span className="dollar-sign">$</span>
                    <input
                        type="number"
                        min="0"
                        step="10"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                    />
                </div>

                <label>Description</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
                <label>public</label>
                <input
                        type="checkbox"
                        checked={isPublic}
                        onChange={(e) => setPublic(e.target.checked)}
                />

                <div className="button-group">
                    <button type="submit" className="square-btn" disabled={isLoading}>
                        {isLoading ? "Creating..." : "Create Event"}
                    </button>
                    <button type="button" onClick={() => navigate(-1)} className="back-btn square-btn">
                        Go Back
                    </button>
                </div>
            </form>

        </div>
    );
};

export default CreateNewEvent;