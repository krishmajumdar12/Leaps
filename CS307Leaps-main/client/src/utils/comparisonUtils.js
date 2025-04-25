// src/utils/comparisonUtils.js

/**
 * Find similar items in the same area
 */
export const findSimilarItems = (allItems, selectedItem) => {
  if (!selectedItem) return [];
  
  // For lodging
  if (selectedItem.type && selectedItem.location) {
    return allItems.filter(item => 
      item.id !== selectedItem.id && 
      item.location.split(',')[0] === selectedItem.location.split(',')[0]
    );
  }
  
  // For travel
  if (selectedItem.departure_location && selectedItem.arrival_location) {
    return allItems.filter(item => 
      item.id !== selectedItem.id &&
      item.departure_location.split(',')[0] === selectedItem.departure_location.split(',')[0] &&
      item.arrival_location.split(',')[0] === selectedItem.arrival_location.split(',')[0]
    );
  }
  
  return [];
};

/**
 * Check if an item is a better deal
 */
export const isBetterDeal = (item, selectedItem) => {
  // For lodging
  if (item.price_per_night && selectedItem.price_per_night) {
    return item.price_per_night < selectedItem.price_per_night;
  }
  
  // For travel
  if (item.price && selectedItem.price) {
    return item.price < selectedItem.price;
  }
  
  return false;
};

/**
 * Generate savings text
 */
export const calculateSavings = (item, selectedItem) => {
  // For lodging
  if (item.price_per_night && selectedItem.price_per_night) {
    const savings = selectedItem.price_per_night - item.price_per_night;
    return savings > 0 ? `Save $${savings.toFixed(2)} per night` : '';
  }
  
  // For travel
  if (item.price && selectedItem.price) {
    const savings = selectedItem.price - item.price;
    return savings > 0 ? `Save $${savings.toFixed(2)}` : '';
  }
  
  return '';
};