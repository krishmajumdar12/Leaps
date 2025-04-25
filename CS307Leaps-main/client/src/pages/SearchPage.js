import React, { useState } from 'react';
import SearchBar from '../components/SearchBar';
import SearchResults from '../components/SearchResults';
import AddToTripDialog from '../components/AddToTripDialog';
import '../styles/SearchPage.css';

const SearchPage = () => {
  const [results, setResults] = useState({ events: [], travel: [], lodging: [] });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const handleResults = (data) => {
    console.log('Received results:', data);
    setResults(data);
  };
  const openAddToTrip = (item) => {
    setSelectedItem(item);
    setDialogOpen(true);
  };

  return (
    <div className="search-page">
      <SearchBar onResults={handleResults} />
      <SearchResults results={results} onAddToTrip={openAddToTrip} />
      {selectedItem && (
        <AddToTripDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          item={selectedItem}
        />
      )}
    </div>
  );
};

export default SearchPage;