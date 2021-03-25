import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const isAdded = cart.filter(product => product.id === productId);

      let newCart;

      if (isAdded.length > 0) {
        newCart = cart.map(product => {
          if (product.id === productId) {
            const newProduct = {
              ...product,
              amount: product.amount + 1,
            }
            return newProduct;
          }
          return product;
        })
      } else {
        const response = await api.get(`/products/${productId}`);
        const newProduct = {
          ...response.data,
          amount: 1,
        };

        newCart = [...cart, newProduct];
      }

      const response = await api.get<Stock>(`/stock/${productId}`);
      const stockAmount = response.data.amount;

      const addedProduct = newCart.filter(product => product.id === productId);
      const newAmount = addedProduct[0].amount;

      if (stockAmount < newAmount) {
        toast.error('Quantidade solicitada fora de estoque');
      } else {
        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      }
    } catch (err) {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = cart.filter(product => product.id !== productId);

      if (cart.findIndex(product => product.id === productId) < 0) {
        throw Error();
      }

      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const response = await api.get<Stock>(`/stock/${productId}`);
      const stockAmount = response.data.amount;

      if (stockAmount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
      } else {
        const newCart = cart.map(product => {
          if (product.id === productId) {
            return {
              ...product,
              amount,
            }
          } else {
            return product;
          }
        });

        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
