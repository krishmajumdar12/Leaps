import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import LeapsLogo from "../assets/Leapspng.png";
import dummyLodging from '../dummyLodging.json';

const ViewLodging = () => {
    const { id } = useParams();
    //const [lodging, setLodging] = useState(null);
    const lodging = dummyLodging.find(lodging => lodging.id === id);
    const [checkIn, setCheckIn] = useState(lodging ? lodging.checkIn : "");
    const [checkOut, setCheckOut] = useState(lodging ? lodging.checkOut : "");
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const token = localStorage.getItem('token');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchEvent = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`https://leaps-ohwd.onrender.com/api/lodging/${id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) throw new Error('Failed to fetch lodging');
                //const data = await response.json();
                //setLodging(data);
            } catch (err) {
                //setError('Error loading lodging. Please try again later.');
                console.error('Error fetching event:', err);
                /*const lodging = dummyLodging.find(lodging => lodging.id === id);
                if (lodging) {
                    setLodging(lodging);
                } else {
                    setError('Error loading lodging. Please try again later.');
                }*/
            } finally {
                setIsLoading(false);
            }
        };

        fetchEvent();
    }, [id, token]);

    if (isLoading) {
        return <p className="loading">Loading lodging details...</p>;
    }

    if (error) {
        return <p className="error">{error}</p>;
    }

    return (
        <div style={{marginLeft: "50px"}}>
            <div style={{ display: "flex", alignItems: "center"}}>
                <h2 style={{
                    textAlign: "left",
                    marginTop: "70px",
                    color: "black",
                    fontSize: "60px",
                    fontWeight: "bold",
                    marginRight: "-650px"
                }}>
                    {lodging.name}
                </h2>

                <button onClick={() => navigate("/trips")}  // Adjust navigate later
                // Also add condition if event is already part of trip
                    style={{
                        marginTop: "80px",
                        color: "white",
                        backgroundColor: "#007BFF",
                        fontSize: "20px",
                        padding: "10px 20px",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer",
                    }}>
                    Add to Trip
                </button>
            </div>

                <div style={{
                    display: "flex",
                    alignItems: "center",
                    marginTop: "2px",
                }}>
                    <h2 style={{
                        textAlign: "left",
                        color: "black",
                        fontSize: "25px",
                    }}>
                        {lodging.location}
                    </h2>
                </div>

                
                <h2 style={{ // Adjust so it continues onto next line
                    textAlign: "left",
                    marginTop: "10px",
                    color: "black",
                    fontSize: "15px",
                    fontWeight: "lighter"
                }}>
                    {lodging.description}
                </h2>
                

                <div style={{ display: "flex", alignItems: "center", gap: "20px", margin: "20px 0" }}>
                    <label>
                        Check-In:
                        <input 
                            type="date" 
                            value={checkIn} 
                            onChange={(e) => setCheckIn(e.target.value)}
                            style={{ marginLeft: "10px", padding: "5px", fontSize: "16px" }}
                        />
                    </label>

                    <label>
                        Check-Out:
                        <input 
                            type="date" 
                            value={checkOut} 
                            onChange={(e) => setCheckOut(e.target.value)}
                            style={{ marginLeft: "10px", padding: "5px", fontSize: "16px" }}
                        />
                    </label>
                </div>

                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-start",
                    alignItems: "flex-end",
                    marginTop: "-250px",
                    marginRight: "500px"
                }}>
                    <h2 style={{
                        color: "black",
                        fontSize: "15px",
                    }}>
                        Reviews
                    </h2>
                    <h2 style={{
                        marginRight: "22px",
                        color: "black",
                        fontSize: "15px",
                    }}>
                        Price
                    </h2>

                    <button onClick={() => window.open("https://www.ticketmaster.com", "_blank")} style={{ //Update url later
                        marginRight: "-110px",
                        color: "white",
                        backgroundColor: "#4CAF50",
                        fontSize: "15px",
                        padding: "10px 20px",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer",
                    }}>
                        {lodging.price}
                    </button>
                </div>

                {error && <p className="error">{error}</p>}
                {success && <div className="success-message">{success}</div>}
        </div>
    );
};

export default ViewLodging;