import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { cart } = useApp();

  useEffect(() => {
    if (cart.length > 0) {
      navigate('/paiement', { replace: true });
    } else {
      navigate('/home', { replace: true });
    }
  }, [cart, navigate]);

  return null;
};
