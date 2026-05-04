"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  getEmailSessionUser,
  logoutFromEmailSession,
  type AuthenticatedUser,
} from "@/modules/auth/client";
import { getCurrentUser } from "./permissions";
import { fetchMarketplaceState, runMarketplaceCommand } from "./client";
import {
  addItemToCart,
  applyCouponCodeToCart,
  logoutSession,
  removeCartLine,
  removeCouponCodeFromCart,
  switchSessionUser,
  updateCartLineQuantity,
} from "./workflows";
import type {
  AdminUserInput,
  CheckoutSubmission,
  CODPaymentProofSubmission,
  CouponInput,
  CODRemittanceReviewInput,
  CustomerAddressInput,
  CustomerPreferencesUpdate,
  CustomerProfileUpdate,
  GuestOrderLookupInput,
  InventoryAdjustmentInput,
  ManagedCategoryInput,
  ManagedProductInput,
  MarketplaceState,
  PaymentProofReview,
  PaymentProofSubmission,
  PayoutStatus,
  ProductReviewSubmissionInput,
  ReviewModerationInput,
  SavedVehicleInput,
  SellerPayoutAccountInput,
  SellerPayoutAccountReviewInput,
  SellerPayoutRequestInput,
  SellerSettlementBatchInput,
  SellerStoreProfileInput,
  SellerRecordInput,
  StoreReviewSubmissionInput,
  SystemSettings,
} from "./types";
import { buildEmptyMarketplaceState } from "./seed";
import {
  hasMeaningfulMarketplaceState,
  shouldPreserveExistingMarketplaceState,
} from "./state-utils";
import { toast } from "sonner";

const GUEST_CART_USER_ID = "guest-session";
const GUEST_CART_STORAGE_KEY = "sparekart.guest-cart.v1";
const GUEST_COUPON_STORAGE_KEY = "sparekart.guest-coupon.v1";

type MarketplaceContextValue = {
  state: MarketplaceState;
  hydrated: boolean;
  currentUser: ReturnType<typeof getCurrentUser>;
  refreshAuthSession: () => Promise<AuthenticatedUser | null>;
  switchUser: (userId: string) => void;
  logout: () => void;
  saveUserRecord: (input: AdminUserInput) => Promise<void>;
  deleteUserRecord: (userId: string) => Promise<void>;
  saveSellerRecord: (input: SellerRecordInput) => Promise<void>;
  saveCategoryRecord: (input: ManagedCategoryInput) => Promise<void>;
  deleteCategoryRecord: (slug: string) => Promise<void>;
  saveProductRecord: (input: ManagedProductInput) => Promise<void>;
  deleteProductRecord: (productId: string) => Promise<void>;
  moderateReviewRecord: (input: ReviewModerationInput) => Promise<void>;
  saveCouponRecord: (input: CouponInput) => Promise<void>;
  deleteCouponRecord: (couponId: string) => Promise<void>;
  adjustInventoryRecord: (input: InventoryAdjustmentInput) => Promise<void>;
  updateSystemSettings: (input: SystemSettings) => Promise<void>;
  applyCouponCode: (code: string) => Promise<void>;
  removeCouponCode: () => Promise<void>;
  addToCart: (productId: string, qty?: number) => Promise<void>;
  updateCartQty: (productId: string, qty: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  updateProfile: (input: CustomerProfileUpdate) => Promise<void>;
  updateSellerStoreProfile: (input: SellerStoreProfileInput) => Promise<void>;
  updateSellerPayoutAccount: (input: SellerPayoutAccountInput) => Promise<void>;
  saveSellerProduct: (input: ManagedProductInput) => Promise<void>;
  adjustSellerInventory: (input: InventoryAdjustmentInput) => Promise<void>;
  requestPayout: (input?: SellerPayoutRequestInput) => Promise<void>;
  submitProductReview: (input: ProductReviewSubmissionInput) => Promise<void>;
  submitStoreReview: (input: StoreReviewSubmissionInput) => Promise<void>;
  saveAddress: (input: CustomerAddressInput) => Promise<void>;
  deleteAddress: (addressId: string) => Promise<void>;
  saveVehicle: (input: SavedVehicleInput) => Promise<void>;
  deleteVehicle: (vehicleId: string) => Promise<void>;
  toggleWishlist: (productId: string) => Promise<void>;
  updatePreferences: (input: CustomerPreferencesUpdate) => Promise<void>;
  markNotificationsRead: () => Promise<void>;
  placeOrder: (input: CheckoutSubmission) => Promise<string>;
  submitProof: (orderId: string, proof: PaymentProofSubmission) => Promise<string>;
  submitProofByLookup: (
    lookup: GuestOrderLookupInput,
    proof: PaymentProofSubmission,
  ) => Promise<string>;
  submitCODProof: (orderId: string, proof: CODPaymentProofSubmission) => Promise<string>;
  approveProof: (input: PaymentProofReview) => Promise<void>;
  rejectProof: (input: PaymentProofReview) => Promise<void>;
  updateOrderStatus: (
    orderId: string,
    nextStatus: MarketplaceState["orders"][number]["status"],
  ) => Promise<void>;
  updatePayoutRecord: (input: {
    payoutId: string;
    status: PayoutStatus;
    adminNotes?: string;
    transactionReference?: string;
  }) => Promise<void>;
  createPayoutBatch: (input: SellerSettlementBatchInput) => Promise<void>;
  reviewCODRemittance: (input: CODRemittanceReviewInput) => Promise<void>;
  reviewSellerPayoutAccount: (input: SellerPayoutAccountReviewInput) => Promise<void>;
};

const MarketplaceContext = createContext<MarketplaceContextValue | null>(null);

function loadStoredGuestCart() {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(GUEST_CART_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as { productId?: string; qty?: number }[];
    return parsed
      .filter(
        (line): line is { productId: string; qty: number } =>
          typeof line.productId === "string" &&
          line.productId.length > 0 &&
          typeof line.qty === "number" &&
          Number.isFinite(line.qty) &&
          line.qty > 0,
      )
      .map((line) => ({
        productId: line.productId,
        qty: Math.min(Math.max(Math.floor(line.qty), 1), 99),
      }));
  } catch {
    return [];
  }
}

function loadStoredGuestCoupon() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(GUEST_COUPON_STORAGE_KEY) ?? "";
}

function persistGuestSessionState(state: MarketplaceState) {
  if (typeof window === "undefined") {
    return;
  }

  const guestCart = state.cartsByUserId[GUEST_CART_USER_ID] ?? [];
  const guestCouponCode = state.appliedCouponCodesByUserId[GUEST_CART_USER_ID] ?? "";

  if (guestCart.length > 0) {
    window.localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(guestCart));
  } else {
    window.localStorage.removeItem(GUEST_CART_STORAGE_KEY);
  }

  if (guestCouponCode) {
    window.localStorage.setItem(GUEST_COUPON_STORAGE_KEY, guestCouponCode);
  } else {
    window.localStorage.removeItem(GUEST_COUPON_STORAGE_KEY);
  }
}

function withGuestSessionState(
  state: MarketplaceState,
  guestCart: MarketplaceState["cartsByUserId"][string],
  guestCouponCode: string,
) {
  return {
    ...state,
    cartsByUserId: {
      ...state.cartsByUserId,
      [GUEST_CART_USER_ID]: guestCart,
    },
    appliedCouponCodesByUserId: {
      ...state.appliedCouponCodesByUserId,
      [GUEST_CART_USER_ID]: guestCouponCode,
    },
  };
}

export function MarketplaceProvider({
  children,
  initialState,
  initialStateLoaded = false,
}: {
  children: ReactNode;
  initialState?: MarketplaceState;
  initialStateLoaded?: boolean;
}) {
  const [state, setState] = useState<MarketplaceState>(
    () => initialState ?? buildEmptyMarketplaceState(),
  );
  const [hydrated, setHydrated] = useState(false);
  const stateRef = useRef(state);
  const guestCartRef = useRef<MarketplaceState["cartsByUserId"][string]>([]);
  const guestCouponRef = useRef("");
  const hasShownMarketplaceRefreshErrorRef = useRef(false);
  const hasShownMarketplaceStaleWarningRef = useRef(false);

  const commitState = useCallback((nextState: MarketplaceState) => {
    stateRef.current = nextState;
    guestCartRef.current = nextState.cartsByUserId[GUEST_CART_USER_ID] ?? [];
    guestCouponRef.current = nextState.appliedCouponCodesByUserId[GUEST_CART_USER_ID] ?? "";
    persistGuestSessionState(nextState);
    setState(nextState);
    return nextState;
  }, []);

  const hydrateMarketplaceState = useCallback(
    async (authUser?: AuthenticatedUser | null) => {
      const response = await fetchMarketplaceState();

      if (
        !response?.state ||
        !Array.isArray(response.state.managedProducts) ||
        !Array.isArray(response.state.managedCategories) ||
        !Array.isArray(response.state.sellersDirectory)
      ) {
        throw new Error("Marketplace API returned an invalid state payload.");
      }

      const guestCart = guestCartRef.current;
      const guestCouponCode = guestCouponRef.current;
      const nextState = withGuestSessionState(response.state, guestCart, guestCouponCode);

      if (shouldPreserveExistingMarketplaceState(stateRef.current, nextState)) {
        throw new Error(
          "Refusing to replace the current marketplace state with an empty response payload.",
        );
      }

      hasShownMarketplaceRefreshErrorRef.current = false;
      if (response.stale) {
        if (!hasShownMarketplaceStaleWarningRef.current) {
          hasShownMarketplaceStaleWarningRef.current = true;
          toast.warning("Showing the last available catalog while the database reconnects.");
        }
      } else {
        hasShownMarketplaceStaleWarningRef.current = false;
      }
      commitState(nextState);
      return authUser ?? null;
    },
    [commitState],
  );

  useEffect(() => {
    guestCartRef.current = loadStoredGuestCart();
    guestCouponRef.current = loadStoredGuestCoupon();

    const bootstrapState = withGuestSessionState(
      stateRef.current,
      guestCartRef.current,
      guestCouponRef.current,
    );
    commitState(bootstrapState);
    const shouldUseBackgroundRefresh =
      initialStateLoaded && hasMeaningfulMarketplaceState(initialState);

    if (shouldUseBackgroundRefresh) {
      setHydrated(true);

      const scheduleRefresh = () =>
        hydrateMarketplaceState().catch((error) => {
          console.error("Failed to refresh marketplace state in the background.", error);

          if (
            hasMeaningfulMarketplaceState(stateRef.current) &&
            !hasShownMarketplaceRefreshErrorRef.current
          ) {
            hasShownMarketplaceRefreshErrorRef.current = true;
            toast.error("Store data could not be refreshed. Showing the last loaded catalog.");
          }
        });

      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        const idleWindow = window as Window & {
          requestIdleCallback: (callback: () => void) => number;
          cancelIdleCallback?: (id: number) => void;
        };
        const idleId = idleWindow.requestIdleCallback(scheduleRefresh);

        return () => {
          idleWindow.cancelIdleCallback?.(idleId);
        };
      }

      const timeoutId = globalThis.setTimeout(scheduleRefresh, 250);
      return () => {
        globalThis.clearTimeout(timeoutId);
      };
    }

    void hydrateMarketplaceState()
      .catch((error) => {
        console.error("Failed to hydrate marketplace state.", error);
      })
      .finally(() => {
        setHydrated(true);
      });
  }, [commitState, hydrateMarketplaceState, initialState, initialStateLoaded]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const refreshAuthSession = useCallback(async () => {
    try {
      const authUser = await getEmailSessionUser();
      await hydrateMarketplaceState(authUser);
      return authUser;
    } catch (error) {
      console.error("Failed to refresh auth session.", error);
      return null;
    }
  }, [hydrateMarketplaceState]);

  const runGuestLocalUpdate = useCallback(
    (updater: (previous: MarketplaceState) => MarketplaceState) => {
      const nextState = updater(stateRef.current);
      commitState(nextState);
      return nextState;
    },
    [commitState],
  );

  const runRemoteCommand = useCallback(
    async (command: string, payload?: unknown) => {
      const response = await runMarketplaceCommand({
        command,
        payload,
        guestCart: guestCartRef.current,
        guestCouponCode: guestCouponRef.current,
      });
      commitState(response.state);
      return response.result;
    },
    [commitState],
  );

  const switchUser = useCallback(
    (userId: string) => {
      runGuestLocalUpdate((previous) => switchSessionUser(previous, userId));
    },
    [runGuestLocalUpdate],
  );

  const logout = useCallback(() => {
    void logoutFromEmailSession().catch(() => undefined);
    runGuestLocalUpdate((previous) => logoutSession(previous));
    void hydrateMarketplaceState(null).catch(() => undefined);
  }, [hydrateMarketplaceState, runGuestLocalUpdate]);

  const addToCart = useCallback(
    async (productId: string, qty = 1) => {
      if (!stateRef.current.currentUserId) {
        runGuestLocalUpdate((previous) =>
          addItemToCart(previous, previous.currentUserId, productId, qty),
        );
        return;
      }

      await runRemoteCommand("ADD_TO_CART", { productId, qty });
    },
    [runGuestLocalUpdate, runRemoteCommand],
  );

  const applyCouponCode = useCallback(
    async (code: string) => {
      if (!stateRef.current.currentUserId) {
        runGuestLocalUpdate((previous) =>
          applyCouponCodeToCart(previous, previous.currentUserId, code),
        );
        return;
      }

      await runRemoteCommand("APPLY_COUPON", { code });
    },
    [runGuestLocalUpdate, runRemoteCommand],
  );

  const removeCouponCode = useCallback(async () => {
    if (!stateRef.current.currentUserId) {
      runGuestLocalUpdate((previous) => removeCouponCodeFromCart(previous, previous.currentUserId));
      return;
    }

    await runRemoteCommand("REMOVE_COUPON");
  }, [runGuestLocalUpdate, runRemoteCommand]);

  const updateCartQty = useCallback(
    async (productId: string, qty: number) => {
      if (!stateRef.current.currentUserId) {
        runGuestLocalUpdate((previous) =>
          updateCartLineQuantity(previous, previous.currentUserId, productId, qty),
        );
        return;
      }

      await runRemoteCommand("UPDATE_CART_QTY", { productId, qty });
    },
    [runGuestLocalUpdate, runRemoteCommand],
  );

  const removeFromCart = useCallback(
    async (productId: string) => {
      if (!stateRef.current.currentUserId) {
        runGuestLocalUpdate((previous) =>
          removeCartLine(previous, previous.currentUserId, productId),
        );
        return;
      }

      await runRemoteCommand("REMOVE_FROM_CART", { productId });
    },
    [runGuestLocalUpdate, runRemoteCommand],
  );

  const placeOrder = useCallback(
    async (input: CheckoutSubmission) => {
      const result = await runRemoteCommand("PLACE_ORDER", input);
      return String(result.orderId ?? "");
    },
    [runRemoteCommand],
  );

  const submitProof = useCallback(
    async (orderId: string, proof: PaymentProofSubmission) => {
      const result = await runRemoteCommand("SUBMIT_PROOF", { orderId, proof });
      return String(result.proofId ?? "");
    },
    [runRemoteCommand],
  );

  const submitProofByLookup = useCallback(
    async (lookup: GuestOrderLookupInput, proof: PaymentProofSubmission) => {
      const result = await runRemoteCommand("SUBMIT_PROOF_BY_LOOKUP", { lookup, proof });
      return String(result.proofId ?? "");
    },
    [runRemoteCommand],
  );

  const submitCODProof = useCallback(
    async (orderId: string, proof: CODPaymentProofSubmission) => {
      const result = await runRemoteCommand("SUBMIT_COD_PROOF", { orderId, proof });
      return String(result.proofId ?? "");
    },
    [runRemoteCommand],
  );

  const value = useMemo<MarketplaceContextValue>(
    () => ({
      state,
      hydrated,
      currentUser: getCurrentUser(state),
      refreshAuthSession,
      switchUser,
      logout,
      saveUserRecord: async (input) => {
        await runRemoteCommand("SAVE_USER", input);
      },
      deleteUserRecord: async (userId) => {
        await runRemoteCommand("DELETE_USER", { userId });
      },
      saveSellerRecord: async (input) => {
        await runRemoteCommand("SAVE_SELLER", input);
      },
      saveCategoryRecord: async (input) => {
        await runRemoteCommand("SAVE_CATEGORY", input);
      },
      deleteCategoryRecord: async (slug) => {
        await runRemoteCommand("DELETE_CATEGORY", { slug });
      },
      saveProductRecord: async (input) => {
        await runRemoteCommand("SAVE_PRODUCT", input);
      },
      deleteProductRecord: async (productId) => {
        await runRemoteCommand("DELETE_PRODUCT", { productId });
      },
      moderateReviewRecord: async (input) => {
        await runRemoteCommand("MODERATE_REVIEW", input);
      },
      saveCouponRecord: async (input) => {
        await runRemoteCommand("SAVE_COUPON", input);
      },
      deleteCouponRecord: async (couponId) => {
        await runRemoteCommand("DELETE_COUPON", { couponId });
      },
      adjustInventoryRecord: async (input) => {
        await runRemoteCommand("ADJUST_INVENTORY", input);
      },
      updateSystemSettings: async (input) => {
        await runRemoteCommand("UPDATE_SYSTEM_SETTINGS", input);
      },
      applyCouponCode,
      removeCouponCode,
      addToCart,
      updateCartQty,
      removeFromCart,
      updateProfile: async (input) => {
        await runRemoteCommand("UPDATE_PROFILE", input);
      },
      updateSellerStoreProfile: async (input) => {
        await runRemoteCommand("UPDATE_SELLER_PROFILE", input);
      },
      updateSellerPayoutAccount: async (input) => {
        await runRemoteCommand("UPDATE_SELLER_PAYOUT_ACCOUNT", input);
      },
      saveSellerProduct: async (input) => {
        await runRemoteCommand("SAVE_SELLER_PRODUCT", input);
      },
      adjustSellerInventory: async (input) => {
        await runRemoteCommand("ADJUST_SELLER_INVENTORY", input);
      },
      requestPayout: async (input = {}) => {
        await runRemoteCommand("REQUEST_PAYOUT", input);
      },
      submitProductReview: async (input) => {
        await runRemoteCommand("SUBMIT_PRODUCT_REVIEW", input);
      },
      submitStoreReview: async (input) => {
        await runRemoteCommand("SUBMIT_STORE_REVIEW", input);
      },
      saveAddress: async (input) => {
        await runRemoteCommand("SAVE_ADDRESS", input);
      },
      deleteAddress: async (addressId) => {
        await runRemoteCommand("DELETE_ADDRESS", { addressId });
      },
      saveVehicle: async (input) => {
        await runRemoteCommand("SAVE_VEHICLE", input);
      },
      deleteVehicle: async (vehicleId) => {
        await runRemoteCommand("DELETE_VEHICLE", { vehicleId });
      },
      toggleWishlist: async (productId) => {
        await runRemoteCommand("TOGGLE_WISHLIST", { productId });
      },
      updatePreferences: async (input) => {
        await runRemoteCommand("UPDATE_PREFERENCES", input);
      },
      markNotificationsRead: async () => {
        await runRemoteCommand("MARK_NOTIFICATIONS_READ");
      },
      placeOrder,
      submitProof,
      submitProofByLookup,
      submitCODProof,
      approveProof: async (input) => {
        await runRemoteCommand("APPROVE_PROOF", input);
      },
      rejectProof: async (input) => {
        await runRemoteCommand("REJECT_PROOF", input);
      },
      updateOrderStatus: async (orderId, nextStatus) => {
        await runRemoteCommand("UPDATE_ORDER_STATUS", { orderId, nextStatus });
      },
      updatePayoutRecord: async (input) => {
        await runRemoteCommand("UPDATE_PAYOUT_RECORD", input);
      },
      createPayoutBatch: async (input) => {
        await runRemoteCommand("CREATE_PAYOUT_BATCH", input);
      },
      reviewCODRemittance: async (input) => {
        await runRemoteCommand("REVIEW_COD_REMITTANCE", input);
      },
      reviewSellerPayoutAccount: async (input) => {
        await runRemoteCommand("REVIEW_SELLER_PAYOUT_ACCOUNT", input);
      },
    }),
    [
      state,
      hydrated,
      refreshAuthSession,
      switchUser,
      logout,
      runRemoteCommand,
      applyCouponCode,
      removeCouponCode,
      addToCart,
      updateCartQty,
      removeFromCart,
      placeOrder,
      submitProof,
      submitProofByLookup,
      submitCODProof,
    ],
  );

  return <MarketplaceContext.Provider value={value}>{children}</MarketplaceContext.Provider>;
}

export function useMarketplace() {
  const context = useContext(MarketplaceContext);

  if (!context) {
    throw new Error("useMarketplace must be used within MarketplaceProvider.");
  }

  return context;
}
