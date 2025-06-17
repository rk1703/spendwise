import { useState, useEffect } from 'react';

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // Initialize state with initialValue.
  // This ensures that the server and client render the same thing for the first pass.
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // This effect runs only on the client, after the component has mounted.
  // It reads the current value from localStorage and updates the state if a value is found.
  useEffect(() => {
    if (typeof window === 'undefined') {
      return; // Don't run on server
    }
    try {
      const item = window.localStorage.getItem(key);
      // If a value exists in localStorage, parse and set it.
      // Otherwise, storedValue remains initialValue (already set by useState).
      if (item !== null) { // Check item is not null, to differentiate from the string "null"
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      // In case of an error, the state remains initialValue.
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]); // Effect dependencies: only re-run if the key changes.

  // This effect is responsible for saving the state to localStorage whenever it changes.
  useEffect(() => {
    if (typeof window === 'undefined') {
        return; // Don't run on server
    }
    try {
        // Persist the storedValue to localStorage.
        // This will also write the initialValue to localStorage if it wasn't there initially.
        window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
        console.error(`Error writing to localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);


  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have the same API as useState's setter.
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      // The useEffect above will handle persisting the new valueToStore to localStorage.
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}

export default useLocalStorage;
