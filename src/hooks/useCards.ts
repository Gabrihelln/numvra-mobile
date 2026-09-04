import { useState, useEffect } from 'react';
import { cardService } from '../services/cardService';
import { CreditCardType } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const useCards = () => {
  const { user } = useAuth();
  const [cards, setCards] = useState<CreditCardType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user) {
      setCards([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = cardService.subscribeToCards((data) => {
      setCards(data);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  return {
    cards,
    loading,
    addCard: cardService.addCard,
    updateCard: cardService.updateCard,
    adjustUsedLimit: cardService.adjustUsedLimit,
    deleteCard: cardService.deleteCard,
  };
};
