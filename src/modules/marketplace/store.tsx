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
import { getEmailSessionUser, logoutFromEmailSession, type AuthenticatedUser } from "@/modules/auth/client";
import { syncAuthenticatedMarketplaceUser } from "./auth-bridge";
import {
  queueOrderCreatedEmails,
  queueOrderStatusEmail,
  queuePaymentProofReceivedEmail,
} from "./email-client";
import { getCurrentUser } from "./permissions";
import {
  adjustInventoryRecord,
  deleteCouponRecord,
  deleteManagedCategoryRecord,
  deleteManagedProductRecord,
  deleteUserRecord,
  moderateManagedReview,
  reviewCODRemittanceRecord,
  reviewSellerPayoutAccountRecord,
  saveCouponRecord,
  createSellerPayoutBatchRecord,
  saveManagedCategoryRecord,
  saveManagedProductRecord,
  saveSellerRecord,
  saveUserRecord,
  updateSellerPayoutRecord,
  updateSystemSettingsRecord,
} from "./admin-workflows";
import {
  approvePaymentProof,
  addItemToCart,
  applyCouponCodeToCart,
  adjustSellerOwnedInventory,
  advanceOrderStatus,
  deleteCustomerAddress,
  deleteCustomerVehicle,
  logoutSession,
  markAllNotificationsRead,
  placeOrderFromCheckout,
  rejectPaymentProof,
  removeCartLine,
  removeCouponCodeFromCart,
  saveCustomerAddress,
  saveCustomerVehicle,
  saveSellerOwnedProduct,
  requestSellerPayout,
  submitProductReview,
  submitPaymentProofByLookup,
  submitStoreReview,
  submitCODCollectionProof,
  submitPaymentProof,
  switchSessionUser,
  toggleWishlistProduct,
  updateSellerPayoutAccount,
  updateSellerStoreProfile,
  updateCartLineQuantity,
  updateCustomerPreferences,
  updateCustomerProfile,
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
import { buildInitialMarketplaceState, normalizeMarketplaceState } from "./seed";
const STORAGE_KEY = "sparekart.marketplace.state.v1";

type MarketplaceContextValue = {
  state: MarketplaceState;
  hydrated: boolean;
  currentUser: ReturnType<typeof getCurrentUser>;
  refreshAuthSession: () => Promise<AuthenticatedUser | null>;
  switchUser: (userId: string) => void;
  logout: () => void;
  saveUserRecord: (input: AdminUserInput) => void;
  deleteUserRecord: (userId: string) => void;
  saveSellerRecord: (input: SellerRecordInput) => void;
  saveCategoryRecord: (input: ManagedCategoryInput) => void;
  deleteCategoryRecord: (slug: string) => void;
  saveProductRecord: (input: ManagedProductInput) => void;
  deleteProductRecord: (productId: string) => void;
  moderateReviewRecord: (input: ReviewModerationInput) => void;
  saveCouponRecord: (input: CouponInput) => void;
  deleteCouponRecord: (couponId: string) => void;
  adjustInventoryRecord: (input: InventoryAdjustmentInput) => void;
  updateSystemSettings: (input: SystemSettings) => void;
  applyCouponCode: (code: string) => void;
  removeCouponCode: () => void;
  addToCart: (productId: string, qty?: number) => void;
  updateCartQty: (productId: string, qty: number) => void;
  removeFromCart: (productId: string) => void;
  updateProfile: (input: CustomerProfileUpdate) => void;
  updateSellerStoreProfile: (input: SellerStoreProfileInput) => void;
  updateSellerPayoutAccount: (input: SellerPayoutAccountInput) => void;
  saveSellerProduct: (input: ManagedProductInput) => void;
  adjustSellerInventory: (input: InventoryAdjustmentInput) => void;
  requestPayout: (input?: SellerPayoutRequestInput) => void;
  submitProductReview: (input: ProductReviewSubmissionInput) => void;
  submitStoreReview: (input: StoreReviewSubmissionInput) => void;
  saveAddress: (input: CustomerAddressInput) => void;
  deleteAddress: (addressId: string) => void;
  saveVehicle: (input: SavedVehicleInput) => void;
  deleteVehicle: (vehicleId: string) => void;
  toggleWishlist: (productId: string) => void;
  updatePreferences: (input: CustomerPreferencesUpdate) => void;
  markNotificationsRead: () => void;
  placeOrder: (input: CheckoutSubmission) => string;
  submitProof: (orderId: string, proof: PaymentProofSubmission) => string;
  submitProofByLookup: (lookup: GuestOrderLookupInput, proof: PaymentProofSubmission) => string;
  submitCODProof: (orderId: string, proof: CODPaymentProofSubmission) => string;
  approveProof: (input: PaymentProofReview) => void;
  rejectProof: (input: PaymentProofReview) => void;
  updateOrderStatus: (orderId: string, nextStatus: MarketplaceState["orders"][number]["status"]) => void;
  updatePayoutRecord: (input: {
    payoutId: string;
    status: PayoutStatus;
    adminNotes?: string;
    transactionReference?: string;
  }) => void;
  createPayoutBatch: (input: SellerSettlementBatchInput) => void;
  reviewCODRemittance: (input: CODRemittanceReviewInput) => void;
  reviewSellerPayoutAccount: (input: SellerPayoutAccountReviewInput) => void;
};

const MarketplaceContext = createContext<MarketplaceContextValue | null>(null);

function loadStoredState() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return normalizeMarketplaceState(JSON.parse(raw) as Partial<MarketplaceState>);
  } catch {
    return null;
  }
}

export function MarketplaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MarketplaceState>(() => buildInitialMarketplaceState());
  const [hydrated, setHydrated] = useState(false);
  const stateRef = useRef(state);

  useEffect(() => {
    const stored = loadStoredState();

    if (stored) {
      stateRef.current = stored;
      setState(stored);
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const refreshAuthSession = useCallback(async () => {
    try {
      const authUser = await getEmailSessionUser();
      const nextState = syncAuthenticatedMarketplaceUser(stateRef.current, authUser);

      if (nextState !== stateRef.current) {
        stateRef.current = nextState;
        setState(nextState);
      }

      return authUser;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    void refreshAuthSession();
  }, [hydrated, refreshAuthSession]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  const runUpdate = useCallback((updater: (previous: MarketplaceState) => MarketplaceState) => {
    const nextState = updater(stateRef.current);
    stateRef.current = nextState;
    setState(nextState);
  }, []);

  const switchUser = useCallback(
    (userId: string) => {
      runUpdate((previous) => switchSessionUser(previous, userId));
    },
    [runUpdate],
  );

  const logout = useCallback(() => {
    void logoutFromEmailSession().catch(() => undefined);
    runUpdate((previous) => logoutSession(previous));
  }, [runUpdate]);

  const addToCart = useCallback(
    (productId: string, qty = 1) => {
      runUpdate((previous) => addItemToCart(previous, previous.currentUserId, productId, qty));
    },
    [runUpdate],
  );

  const saveUser = useCallback(
    (input: AdminUserInput) => {
      runUpdate((previous) => saveUserRecord(previous, previous.currentUserId, input));
    },
    [runUpdate],
  );

  const deleteUser = useCallback(
    (userId: string) => {
      runUpdate((previous) => deleteUserRecord(previous, previous.currentUserId, userId));
    },
    [runUpdate],
  );

  const saveSeller = useCallback(
    (input: SellerRecordInput) => {
      runUpdate((previous) => saveSellerRecord(previous, previous.currentUserId, input));
    },
    [runUpdate],
  );

  const saveCategory = useCallback(
    (input: ManagedCategoryInput) => {
      runUpdate((previous) => saveManagedCategoryRecord(previous, previous.currentUserId, input));
    },
    [runUpdate],
  );

  const deleteCategory = useCallback(
    (slug: string) => {
      runUpdate((previous) => deleteManagedCategoryRecord(previous, previous.currentUserId, slug));
    },
    [runUpdate],
  );

  const saveProduct = useCallback(
    (input: ManagedProductInput) => {
      runUpdate((previous) => saveManagedProductRecord(previous, previous.currentUserId, input));
    },
    [runUpdate],
  );

  const deleteProduct = useCallback(
    (productId: string) => {
      runUpdate((previous) => deleteManagedProductRecord(previous, previous.currentUserId, productId));
    },
    [runUpdate],
  );

  const moderateReview = useCallback(
    (input: ReviewModerationInput) => {
      runUpdate((previous) => moderateManagedReview(previous, previous.currentUserId, input));
    },
    [runUpdate],
  );

  const saveCoupon = useCallback(
    (input: CouponInput) => {
      runUpdate((previous) => saveCouponRecord(previous, previous.currentUserId, input));
    },
    [runUpdate],
  );

  const deleteCoupon = useCallback(
    (couponId: string) => {
      runUpdate((previous) => deleteCouponRecord(previous, previous.currentUserId, couponId));
    },
    [runUpdate],
  );

  const adjustInventory = useCallback(
    (input: InventoryAdjustmentInput) => {
      runUpdate((previous) => adjustInventoryRecord(previous, previous.currentUserId, input));
    },
    [runUpdate],
  );

  const updateSettings = useCallback(
    (input: SystemSettings) => {
      runUpdate((previous) => updateSystemSettingsRecord(previous, previous.currentUserId, input));
    },
    [runUpdate],
  );

  const applyCouponCode = useCallback(
    (code: string) => {
      runUpdate((previous) => applyCouponCodeToCart(previous, previous.currentUserId, code));
    },
    [runUpdate],
  );

  const removeCouponCode = useCallback(() => {
    runUpdate((previous) => removeCouponCodeFromCart(previous, previous.currentUserId));
  }, [runUpdate]);

  const updateCartQty = useCallback(
    (productId: string, qty: number) => {
      runUpdate((previous) => updateCartLineQuantity(previous, previous.currentUserId, productId, qty));
    },
    [runUpdate],
  );

  const removeFromCart = useCallback(
    (productId: string) => {
      runUpdate((previous) => removeCartLine(previous, previous.currentUserId, productId));
    },
    [runUpdate],
  );

  const updateProfile = useCallback(
    (input: CustomerProfileUpdate) => {
      runUpdate((previous) => updateCustomerProfile(previous, previous.currentUserId, input));
    },
    [runUpdate],
  );

  const updateSellerProfile = useCallback(
    (input: SellerStoreProfileInput) => {
      runUpdate((previous) => updateSellerStoreProfile(previous, previous.currentUserId, input));
    },
    [runUpdate],
  );

  const saveSellerPayoutAccount = useCallback(
    (input: SellerPayoutAccountInput) => {
      runUpdate((previous) => updateSellerPayoutAccount(previous, previous.currentUserId, input));
    },
    [runUpdate],
  );

  const saveSellerProduct = useCallback(
    (input: ManagedProductInput) => {
      runUpdate((previous) => saveSellerOwnedProduct(previous, previous.currentUserId, input));
    },
    [runUpdate],
  );

  const adjustSellerInventory = useCallback(
    (input: InventoryAdjustmentInput) => {
      runUpdate((previous) => adjustSellerOwnedInventory(previous, previous.currentUserId, input));
    },
    [runUpdate],
  );

  const requestPayout = useCallback(
    (input: SellerPayoutRequestInput = {}) => {
      runUpdate((previous) => requestSellerPayout(previous, previous.currentUserId, input));
    },
    [runUpdate],
  );

  const submitCustomerProductReview = useCallback(
    (input: ProductReviewSubmissionInput) => {
      runUpdate((previous) => submitProductReview(previous, previous.currentUserId, input));
    },
    [runUpdate],
  );

  const submitSellerStoreReview = useCallback(
    (input: StoreReviewSubmissionInput) => {
      runUpdate((previous) => submitStoreReview(previous, previous.currentUserId, input));
    },
    [runUpdate],
  );

  const saveAddress = useCallback(
    (input: CustomerAddressInput) => {
      runUpdate((previous) => saveCustomerAddress(previous, previous.currentUserId, input));
    },
    [runUpdate],
  );

  const deleteAddress = useCallback(
    (addressId: string) => {
      runUpdate((previous) => deleteCustomerAddress(previous, previous.currentUserId, addressId));
    },
    [runUpdate],
  );

  const saveVehicle = useCallback(
    (input: SavedVehicleInput) => {
      runUpdate((previous) => saveCustomerVehicle(previous, previous.currentUserId, input));
    },
    [runUpdate],
  );

  const deleteVehicle = useCallback(
    (vehicleId: string) => {
      runUpdate((previous) => deleteCustomerVehicle(previous, previous.currentUserId, vehicleId));
    },
    [runUpdate],
  );

  const toggleWishlist = useCallback(
    (productId: string) => {
      runUpdate((previous) => toggleWishlistProduct(previous, previous.currentUserId, productId));
    },
    [runUpdate],
  );

  const updatePreferences = useCallback(
    (input: CustomerPreferencesUpdate) => {
      runUpdate((previous) => updateCustomerPreferences(previous, previous.currentUserId, input));
    },
    [runUpdate],
  );

  const markNotificationsRead = useCallback(() => {
    runUpdate((previous) => markAllNotificationsRead(previous, previous.currentUserId));
  }, [runUpdate]);

  const placeOrder = useCallback(
    (input: CheckoutSubmission) => {
      let createdOrderId = "";
      let nextStateForEmail: MarketplaceState | null = null;
      runUpdate((previous) => {
        const result = placeOrderFromCheckout(previous, previous.currentUserId, input);
        createdOrderId = result.orderId;
        nextStateForEmail = result.state;
        return result.state;
      });

      const emailState = nextStateForEmail as MarketplaceState | null;

      if (emailState && createdOrderId) {
        queueOrderCreatedEmails(emailState, createdOrderId);

        if (input.paymentMethod !== "COD") {
          const createdOrder = emailState.orders.find((order) => order.id === createdOrderId);
          const activeProofId = createdOrder
            ? emailState.payments.find((payment) => payment.id === createdOrder.paymentId)?.activeProofId
            : null;

          if (activeProofId) {
            queuePaymentProofReceivedEmail(emailState, createdOrderId, activeProofId);
          }
        }
      }

      return createdOrderId;
    },
    [runUpdate],
  );

  const submitProof = useCallback(
    (orderId: string, proof: PaymentProofSubmission) => {
      let createdProofId = "";
      let nextStateForEmail: MarketplaceState | null = null;
      runUpdate((previous) => {
        const result = submitPaymentProof(previous, previous.currentUserId, orderId, proof);
        createdProofId = result.proofId;
        nextStateForEmail = result.state;
        return result.state;
      });

      if (nextStateForEmail && createdProofId) {
        queuePaymentProofReceivedEmail(nextStateForEmail, orderId, createdProofId);
      }

      return createdProofId;
    },
    [runUpdate],
  );

  const submitProofByLookup = useCallback(
    (lookup: GuestOrderLookupInput, proof: PaymentProofSubmission) => {
      let createdProofId = "";
      let orderId = "";
      let nextStateForEmail: MarketplaceState | null = null;
      runUpdate((previous) => {
        const result = submitPaymentProofByLookup(previous, lookup, proof);
        createdProofId = result.proofId;
        nextStateForEmail = result.state;
        orderId = result.state.paymentProofs.find((candidate) => candidate.id === result.proofId)?.orderId ?? "";
        return result.state;
      });

      if (nextStateForEmail && createdProofId && orderId) {
        queuePaymentProofReceivedEmail(nextStateForEmail, orderId, createdProofId);
      }

      return createdProofId;
    },
    [runUpdate],
  );

  const submitCODProof = useCallback(
    (orderId: string, proof: CODPaymentProofSubmission) => {
      let createdProofId = "";
      let nextStateForEmail: MarketplaceState | null = null;
      runUpdate((previous) => {
        const result = submitCODCollectionProof(previous, previous.currentUserId, orderId, proof);
        createdProofId = result.proofId;
        nextStateForEmail = result.state;
        return result.state;
      });

      if (nextStateForEmail && createdProofId) {
        queuePaymentProofReceivedEmail(nextStateForEmail, orderId, createdProofId);
      }

      return createdProofId;
    },
    [runUpdate],
  );

  const approveProof = useCallback(
    (input: PaymentProofReview) => {
      let orderId = "";
      let nextStateForEmail: MarketplaceState | null = null;
      let nextStatus: MarketplaceState["orders"][number]["status"] | null = null;

      runUpdate((previous) => {
        const proof = previous.paymentProofs.find((candidate) => candidate.id === input.proofId);
        orderId = proof?.orderId ?? "";
        const result = approvePaymentProof(previous, previous.currentUserId, input);
        nextStateForEmail = result.state;
        nextStatus = orderId
          ? result.state.orders.find((candidate) => candidate.id === orderId)?.status ?? null
          : null;
        return result.state;
      });

      if (nextStateForEmail && orderId && nextStatus) {
        queueOrderStatusEmail(nextStateForEmail, orderId, nextStatus);
      }
    },
    [runUpdate],
  );

  const rejectProof = useCallback(
    (input: PaymentProofReview) => {
      let orderId = "";
      let nextStateForEmail: MarketplaceState | null = null;
      let nextStatus: MarketplaceState["orders"][number]["status"] | null = null;

      runUpdate((previous) => {
        const proof = previous.paymentProofs.find((candidate) => candidate.id === input.proofId);
        orderId = proof?.orderId ?? "";
        const result = rejectPaymentProof(previous, previous.currentUserId, input);
        nextStateForEmail = result.state;
        nextStatus = orderId
          ? result.state.orders.find((candidate) => candidate.id === orderId)?.status ?? null
          : null;
        return result.state;
      });

      if (nextStateForEmail && orderId && nextStatus) {
        queueOrderStatusEmail(nextStateForEmail, orderId, nextStatus);
      }
    },
    [runUpdate],
  );

  const updateOrderStatus = useCallback(
    (orderId: string, nextStatus: MarketplaceState["orders"][number]["status"]) => {
      let nextStateForEmail: MarketplaceState | null = null;
      runUpdate((previous) => {
        const result = advanceOrderStatus(previous, previous.currentUserId, orderId, nextStatus);
        nextStateForEmail = result.state;
        return result.state;
      });

      if (nextStateForEmail) {
        queueOrderStatusEmail(nextStateForEmail, orderId, nextStatus);
      }
    },
    [runUpdate],
  );

  const updatePayoutRecord = useCallback(
    (input: {
      payoutId: string;
      status: PayoutStatus;
      adminNotes?: string;
      transactionReference?: string;
    }) => {
      runUpdate((previous) => updateSellerPayoutRecord(previous, previous.currentUserId, input));
    },
    [runUpdate],
  );

  const createPayoutBatch = useCallback(
    (input: SellerSettlementBatchInput) => {
      runUpdate((previous) => createSellerPayoutBatchRecord(previous, previous.currentUserId, input));
    },
    [runUpdate],
  );

  const reviewCODRemittance = useCallback(
    (input: CODRemittanceReviewInput) => {
      runUpdate((previous) => reviewCODRemittanceRecord(previous, previous.currentUserId, input));
    },
    [runUpdate],
  );

  const reviewSellerPayoutAccount = useCallback(
    (input: SellerPayoutAccountReviewInput) => {
      runUpdate((previous) =>
        reviewSellerPayoutAccountRecord(previous, previous.currentUserId, input),
      );
    },
    [runUpdate],
  );

  const currentUser = useMemo(() => getCurrentUser(state), [state]);

  const value = useMemo<MarketplaceContextValue>(
    () => ({
      state,
      hydrated,
      currentUser,
      refreshAuthSession,
      switchUser,
      logout,
      saveUserRecord: saveUser,
      deleteUserRecord: deleteUser,
      saveSellerRecord: saveSeller,
      saveCategoryRecord: saveCategory,
      deleteCategoryRecord: deleteCategory,
      saveProductRecord: saveProduct,
      deleteProductRecord: deleteProduct,
      moderateReviewRecord: moderateReview,
      saveCouponRecord: saveCoupon,
      deleteCouponRecord: deleteCoupon,
      adjustInventoryRecord: adjustInventory,
      updateSystemSettings: updateSettings,
      applyCouponCode,
      removeCouponCode,
      addToCart,
      updateCartQty,
      removeFromCart,
      updateProfile,
      updateSellerStoreProfile: updateSellerProfile,
      updateSellerPayoutAccount: saveSellerPayoutAccount,
      saveSellerProduct,
      adjustSellerInventory,
      requestPayout,
      submitProductReview: submitCustomerProductReview,
      submitStoreReview: submitSellerStoreReview,
      saveAddress,
      deleteAddress,
      saveVehicle,
      deleteVehicle,
      toggleWishlist,
      updatePreferences,
      markNotificationsRead,
      placeOrder,
      submitProof,
      submitProofByLookup,
      submitCODProof,
      approveProof,
      rejectProof,
      updateOrderStatus,
      updatePayoutRecord,
      createPayoutBatch,
      reviewCODRemittance,
      reviewSellerPayoutAccount,
    }),
    [
      state,
      hydrated,
      currentUser,
      refreshAuthSession,
      switchUser,
      logout,
      saveUser,
      deleteUser,
      saveSeller,
      saveCategory,
      deleteCategory,
      saveProduct,
      deleteProduct,
      moderateReview,
      saveCoupon,
      deleteCoupon,
      adjustInventory,
      updateSettings,
      applyCouponCode,
      removeCouponCode,
      addToCart,
      updateCartQty,
      removeFromCart,
      updateProfile,
      updateSellerProfile,
      saveSellerPayoutAccount,
      saveSellerProduct,
      adjustSellerInventory,
      requestPayout,
      submitCustomerProductReview,
      submitSellerStoreReview,
      saveAddress,
      deleteAddress,
      saveVehicle,
      deleteVehicle,
      toggleWishlist,
      updatePreferences,
      markNotificationsRead,
      placeOrder,
      submitProof,
      submitProofByLookup,
      submitCODProof,
      approveProof,
      rejectProof,
      updateOrderStatus,
      updatePayoutRecord,
      createPayoutBatch,
      reviewCODRemittance,
      reviewSellerPayoutAccount,
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
