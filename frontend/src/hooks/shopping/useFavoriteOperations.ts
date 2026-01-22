/**
 * useFavoriteOperations - Favorites manipulation operations hook
 * FIXED: Uses React Query mutations for real-time UI updates
 */
import { useCallback } from 'react';
import { useFavoritesMutations } from '../queries/useShoppingHubQuery';

interface UseFavoriteOperationsProps {
  setFavorites: (favorites: any[]) => void;
  isAdminView: boolean;
}

export const useFavoriteOperations = ({
  setFavorites,
  isAdminView,
}: UseFavoriteOperationsProps) => {
  // Use React Query mutations for real-time updates
  const { toggleFavorite: toggleFavoriteMutation } = useFavoritesMutations();

  /**
   * Toggle favorite status - uses React Query mutation for instant UI update
   */
  const toggleFavorite = useCallback(
    async (productId: string) => {
      if (isAdminView) {
        // Admin view - don't modify favorites
        return;
      }

      try {
        await toggleFavoriteMutation.mutateAsync(productId);
      } catch (error) {
        console.error('[useFavoriteOperations] Error toggling favorite:', error);
      }
    },
    [isAdminView, toggleFavoriteMutation]
  );

  return {
    toggleFavorite,
  };
};

export default useFavoriteOperations;
