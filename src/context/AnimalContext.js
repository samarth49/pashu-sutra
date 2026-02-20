/**
 * Animal Context
 * Provides the currently selected animal globally.
 * Persists selected animal to AsyncStorage.
 * Usage: const { selectedAnimal, setSelectedAnimal, animals, loadAnimals } = useAnimal();
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAnimals } from '../services/databaseService';

const SELECTED_ANIMAL_KEY = '@pashusutra_selected_animal';

const AnimalContext = createContext({
  selectedAnimal: null,
  setSelectedAnimal: () => {},
  animals: [],
  loadAnimals: () => {},
});

export function AnimalProvider({ children }) {
  const [selectedAnimal, setSelectedAnimalState] = useState(null);
  const [animals, setAnimals] = useState([]);

  useEffect(() => {
    loadAnimals();
    // Restore last selected animal
    AsyncStorage.getItem(SELECTED_ANIMAL_KEY).then((saved) => {
      if (saved) {
        try {
          setSelectedAnimalState(JSON.parse(saved));
        } catch (e) {}
      }
    });
  }, []);

  const loadAnimals = async () => {
    const list = await getAnimals();
    setAnimals(list);
  };

  const setSelectedAnimal = async (animal) => {
    setSelectedAnimalState(animal);
    await AsyncStorage.setItem(SELECTED_ANIMAL_KEY, JSON.stringify(animal));
  };

  return (
    <AnimalContext.Provider value={{ selectedAnimal, setSelectedAnimal, animals, loadAnimals }}>
      {children}
    </AnimalContext.Provider>
  );
}

export function useAnimal() {
  return useContext(AnimalContext);
}
