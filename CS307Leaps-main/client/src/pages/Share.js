import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/Share.css";

const Share = () => {
    const { id } = useParams();
    console.log("use params", useParams());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const token = localStorage.getItem('token');
    const navigate = useNavigate();

    const handleAddFriendLink = async () => {
        setIsLoading(true);
        try {
            console.log("before fetch");
            console.log("token: ", token);
            console.log("id", id);
            const response = await fetch(`https://leaps-ohwd.onrender.com/api/trips/${id}/share`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });      
            console.log("after fetch");          
        } catch (err) {
            setError('Error loading trip. Please try again later.');
            console.error('Error fetching trip:', err);
        } finally {
            console.log("finally");
            setIsLoading(false);
        }
    };

    useEffect (() => {
        console.log("loaded");
        handleAddFriendLink();
        navigate("/trips");
    });

    return (
        <div className="share-text">
            <h3>Adding to Trip {id}</h3>
        </div>
    );


};

export default Share