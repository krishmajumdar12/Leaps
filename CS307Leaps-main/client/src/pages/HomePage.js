import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Link as ScrollLink } from 'react-scroll';
import '../styles/HomePage.css';
import groupImage from '../assets/group.jpg';
import planeImage from '../assets/plane.jpg';

const HomePage = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const features = [
    {
        title: "Centalized Itenary",
        description: "Access your trip itenary with ease in one place on your computer. Flights, stays, and events organized and shared with your group effortlessly.",
        icon: "💻"
    },
    {
      title: "Group Collaboration",
      description: "Plan together with friends and family. Update availability, vote on activities, and share events in real-time.",
      icon: "👥"
    },
    {
      title: "Trip Optimization",
      description: "Find the best deals on lodging and transportation based on your group's preferences and availability.",
      icon: "📈"
    },
    {
      title: "Activity Recommendations",
      description: "Get personalized recommendations for activities and events based on your destination.",
      icon: "🎭"
    }
  ];

  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-content">
          <h1>Plan Your Next Adventure Together</h1>
          <h2>The collaborative trip planning platform that makes group travel simple</h2>
          <div className="hero-buttons">
            <Link to="/signup" className="btn btn-primary">Get Started</Link>
            <ScrollLink 
                to="how-it-works"
                smooth={true}
                duration={500}
                className="btn btn-secondary"
            >
                See How It Works
            </ScrollLink>
          </div>
        </div>
        <div className="hero-image">
          <img src={groupImage}/>
        </div>
      </section>

      {/* Problem Statement Section */}
      <section className="problem">
        <div className="container problem-container">
            <div className="problem-image">
                <img src={planeImage}/>
            </div>
            <div className="problem-content">
                <h2>Why Leaps?</h2>
                <p>Planning a trip with others is complicated. Coordinating schedules, finding affordable options, and deciding on activities shouldn't be spread across multiple platforms. Leaps brings everything together in one place.</p>
            </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <h2>Everything You Need For Successful Group Planning</h2>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div className="feature-card" key={index}>
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works" id="how-it-works">
        <div className="container">
          <h2>How Leaps Works</h2>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Create a Trip</h3>
              <p>Set up your trip with basic details like destination, dates, and who's coming along.</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>Collaborate</h3>
              <p>Invite friends and family to join. Everyone can add availability and preferences.</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>Discover & Vote</h3>
              <p>Browse accommodations, transportation, and activities. Vote on your favorites as a group.</p>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <h3>Book & Enjoy</h3>
              <p>Finalize your plans and book directly through our verified partners.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="container">
          <h2>Ready to plan your next adventure?</h2>
          <Link to="/signup" className="btn btn-primary btn-large">Get Started For Free</Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;