import { useState } from "react";
import { useNavigate } from "react-router-dom";
import LeapsLogo from "../assets/Leapspng.png";

const CreateTrip = () => {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [destination, setDestination] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [isPublic, setIsPublic] = useState(false);
    const [status, setStatus] = useState("Upcoming")
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const token = localStorage.getItem('token');
    const navigate = useNavigate();
    

    const handleCreateTrip = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch("/api/trips", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },                
                body: JSON.stringify({ name, description, destination, startDate, endDate, isPublic, status }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess("Trip created successfully!");
                setTimeout(() => {
                    navigate("/trips");
                }, 1000);
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
        <div className="auth-container">
            <img src={LeapsLogo} alt="Leaps Logo" className="logo" />
            <h2>Create Trip</h2>

            {error && <p className="error">{error}</p>}
            {success && <div className="success-message">{success}</div>}

            <form onSubmit={handleCreateTrip}>
                <input
                    type="text"
                    placeholder="Trip Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
                <textarea
                    placeholder="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
                <input
                    type="text"
                    placeholder="Destination"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    required
                />
                <input
                    type="date"
                    placeholder="Start Date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                />
                <input
                    type="date"
                    placeholder="End Date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                />
                <label>
                    <input
                        type="checkbox"
                        checked={isPublic}
                        onChange={(e) => setIsPublic(e.target.checked)}
                    />
                    Public
                </label>
                <button type="submit" disabled={isLoading}>
                    {isLoading ? "Creating..." : "Create Trip"}
                </button>
            </form>
        </div>
    );
};

export default CreateTrip;
