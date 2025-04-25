import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import "./DeleteTripConfirmation.css"
import Modal from '@mui/material/Modal';
import "../styles/Trips.css";
import "../components/DeleteTripConfirmation.css";
import handleSaveChanges from "../pages/AccountPage";


const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 450,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

export default function UploadImage({ updateImage }) {
    const [open, setOpen] = React.useState(false);
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    // Function to handle file input change and convert image to base64
    const handleFileSelect = (event) => {
        console.error("in handler");
        const file = event.target.files[0];
        if (file) {
            
            const reader = new FileReader();

            reader.onload = function (e) {
                console.error("in if file");
                const base64String = e.target.result;
                updateImage(base64String);

                
                handleClose();
            };

            reader.readAsDataURL(file);
        }
        else {
            console.error("no file was selected");
        }
    };

    return (
        <div>
        <button onClick={handleOpen}>Edit Profile Picture</button>
        <Modal
            open={open}
            onClose={handleClose}
            aria-labelledby="modal-modal-title"
            aria-describedby="modal-modal-description"
        >
            <Box sx={style}>
            <div className='confirm-text'>
                <input type="file" id="fileInput" accept="image/*"  style={{ display: 'none' }} onChange={handleFileSelect}/>

                <button 
                    onClick={() => document.getElementById('fileInput').click()} 
                    style={{ marginBottom: '20px' }} // Add some space between button and input
                >
                Upload Profile Picture
                </button>
            </div>
            </Box>
        </Modal>
        </div>
    );
}