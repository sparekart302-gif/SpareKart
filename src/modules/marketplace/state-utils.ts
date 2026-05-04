import type { MarketplaceState } from "./types";

export function hasMeaningfulMarketplaceState(state?: MarketplaceState | null) {
  if (!state) {
    return false;
  }

  return (
    state.managedProducts.length > 0 ||
    state.managedCategories.length > 0 ||
    state.sellersDirectory.length > 0
  );
}
