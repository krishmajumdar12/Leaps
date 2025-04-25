import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import LeapsLogo from "../assets/Leapspng.png";
import "../styles/Events.css"

function Events() {

    return(
        <>
            <div className="logo">
                <img src={LeapsLogo} alt="Leaps Logo" />
            </div>
            {/*
            <div className="events-container">
                <h2>
                    Custom Events
                </h2>
            </div>
            */}
            <div className="events-container">
                <h2>
                    Public Events
                </h2>
            </div>
        </>
    )

}

export default Events