"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Bell,
  CarFront,
  Heart,
  KeyRound,
  LogOut,
  MapPin,
  MailCheck,
  Package,
  Plus,
  Settings2,
  ShieldCheck,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/components/navigation/Link";
import { AccessGuard } from "@/components/marketplace/AccessGuard";
import { NotificationFeed } from "@/components/marketplace/NotificationFeed";
import { PageLayout, Breadcrumbs } from "@/components/marketplace/PageLayout";
import { OptimizedImage } from "@/components/media/OptimizedImage";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPKR, getSeller, products, vehicles } from "@/data/marketplace";
import {
  getCartQuantity,
  getCustomerAccount,
  getCustomerDefaultAddress,
  getCustomerStats,
  getNotificationsForUser,
  getOrdersForCustomer,
  getPaymentById,
  getWishlistProducts,
} from "@/modules/marketplace/selectors";
import { useMarketplace } from "@/modules/marketplace/store";
import type {
  CustomerAddressInput,
  CustomerPreferences,
  CustomerProfileUpdate,
  SavedVehicleInput,
} from "@/modules/marketplace/types";

const overviewTabs = [
  { value: "overview", label: "Overview", Icon: User },
  { value: "profile", label: "Profile", Icon: User },
  { value: "addresses", label: "Addresses", Icon: MapPin },
  { value: "garage", label: "Garage", Icon: CarFront },
  { value: "wishlist", label: "Wishlist", Icon: Heart },
  { value: "settings", label: "Settings", Icon: Settings2 },
] as const;

function createBlankAddress(name: string, phone: string): CustomerAddressInput {
  return {
    label: "Home",
    fullName: name,
    phone,
    addressLine: "",
    city: "Karachi",
    province: "Sindh",
    postalCode: "",
    isDefault: false,
  };
}

function createBlankVehicle(): SavedVehicleInput {
  const firstBrand = vehicles[0];
  const firstModel = firstBrand.models[0];

  return {
    nickname: "My Car",
    brand: firstBrand.brand,
    model: firstModel.name,
    year: firstModel.years[0],
    engine: firstModel.engines[0],
    isPrimary: false,
  };
}

export default function AccountPage() {
  const router = useRouter();
  const {
    currentUser,
    state,
    logout,
    updateProfile,
    saveAddress,
    deleteAddress,
    saveVehicle,
    deleteVehicle,
    toggleWishlist,
    updatePreferences,
    markNotificationsRead,
    addToCart,
  } = useMarketplace();

  const customerId = currentUser?.id;
  const account = getCustomerAccount(state, customerId);
  const orders = customerId ? getOrdersForCustomer(state, customerId) : [];
  const notifications = customerId ? getNotificationsForUser(state, customerId) : [];
  const wishlistProducts = getWishlistProducts(state, customerId);
  const stats = getCustomerStats(state, customerId);
  const defaultAddress = getCustomerDefaultAddress(state, customerId);
  const primaryVehicle = account?.savedVehicles.find((vehicle) => vehicle.isPrimary) ?? account?.savedVehicles[0];
  const recentOrders = orders.slice(0, 3);

  const [profileDraft, setProfileDraft] = useState<CustomerProfileUpdate>({
    name: currentUser?.name ?? "",
    email: currentUser?.email ?? "",
    phone: currentUser?.phone ?? "",
    city: account?.city ?? "Karachi",
  });
  const [addressDraft, setAddressDraft] = useState<CustomerAddressInput>(
    createBlankAddress(currentUser?.name ?? "", currentUser?.phone ?? ""),
  );
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [vehicleDraft, setVehicleDraft] = useState<SavedVehicleInput>(createBlankVehicle());
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<(typeof overviewTabs)[number]["value"]>("overview");

  useEffect(() => {
    setProfileDraft({
      name: currentUser?.name ?? "",
      email: currentUser?.email ?? "",
      phone: currentUser?.phone ?? "",
      city: account?.city ?? "Karachi",
    });
  }, [account?.city, currentUser?.email, currentUser?.name, currentUser?.phone]);

  useEffect(() => {
    if (!editingAddressId) {
      setAddressDraft(createBlankAddress(currentUser?.name ?? "", currentUser?.phone ?? ""));
    }
  }, [currentUser?.name, currentUser?.phone, editingAddressId]);

  const selectedBrand = useMemo(
    () => vehicles.find((vehicle) => vehicle.brand === vehicleDraft.brand) ?? vehicles[0],
    [vehicleDraft.brand],
  );
  const selectedModel = useMemo(
    () => selectedBrand.models.find((model) => model.name === vehicleDraft.model) ?? selectedBrand.models[0],
    [selectedBrand, vehicleDraft.model],
  );

  useEffect(() => {
    if (!selectedBrand.models.some((model) => model.name === vehicleDraft.model)) {
      setVehicleDraft((previous) => ({
        ...previous,
        model: selectedBrand.models[0].name,
        year: selectedBrand.models[0].years[0],
        engine: selectedBrand.models[0].engines[0],
      }));
      return;
    }

    if (!selectedModel.years.includes(vehicleDraft.year)) {
      setVehicleDraft((previous) => ({
        ...previous,
        year: selectedModel.years[0],
      }));
    }

    if (!selectedModel.engines.includes(vehicleDraft.engine)) {
      setVehicleDraft((previous) => ({
        ...previous,
        engine: selectedModel.engines[0],
      }));
    }
  }, [selectedBrand, selectedModel, vehicleDraft.engine, vehicleDraft.model, vehicleDraft.year]);

  const suggestedWishlistProducts = useMemo(
    () =>
      products
        .filter((product) => !wishlistProducts.some((wishlistItem) => wishlistItem.id === product.id))
        .slice(0, 4),
    [wishlistProducts],
  );
  const memberSince = formatAccountDate(account?.joinedAt);

  const handleLogout = () => {
    logout();
    toast.success("Signed out successfully.");
    router.push("/login");
  };

  if (!currentUser) {
    return (
      <PageLayout>
        <section className="container mx-auto max-w-5xl px-4 py-10 sm:py-12 md:py-14">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[28px] bg-card p-6 shadow-[var(--shadow-premium)] sm:p-8">
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Account access</div>
              <h1 className="mt-2 text-[2rem] font-black tracking-tight sm:text-3xl">
                Sign in to your SpareKart account
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Access orders, saved vehicles, wishlist items, addresses, and account settings from one secure customer hub.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <Link
                  href="/login"
                  className="flex min-h-[126px] flex-col rounded-[24px] bg-surface p-4 text-left shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-accent-soft text-accent">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                  <div className="mt-4 text-base font-bold text-foreground">Login</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Sign in with email/password or continue with Google.
                  </div>
                </Link>
                <Link
                  href="/register"
                  className="flex min-h-[126px] flex-col rounded-[24px] bg-surface p-4 text-left shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-accent-soft text-accent">
                    <MailCheck className="h-4 w-4" />
                  </div>
                  <div className="mt-4 text-base font-bold text-foreground">Create account</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Register, verify your email with OTP, and activate your account.
                  </div>
                </Link>
                <Link
                  href="/forgot-password"
                  className="flex min-h-[126px] flex-col rounded-[24px] bg-surface p-4 text-left shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-accent-soft text-accent">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <div className="mt-4 text-base font-bold text-foreground">Reset password</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Request a 6-digit OTP and set a new password securely.
                  </div>
                </Link>
              </div>
            </div>

            <div className="rounded-[28px] bg-card p-6 shadow-[var(--shadow-premium)] sm:p-8">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-accent" /> Secure access
              </div>
              <div className="mt-4 space-y-4">
                {[
                  "Email/password sign-in for customers, sellers, admins, and super admin.",
                  "Google sign-in for faster verified access where supported.",
                  "OTP verification for new registrations and password recovery.",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-[22px] border border-border/70 bg-surface px-4 py-3 text-sm text-muted-foreground shadow-[var(--shadow-soft)]"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </PageLayout>
    );
  }

  if (!account) {
    return (
      <PageLayout>
        <section className="container mx-auto max-w-2xl px-4 py-10 sm:py-12">
          <div className="rounded-[28px] bg-card p-6 text-center shadow-[var(--shadow-premium)] sm:p-8">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-accent">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h1 className="mt-4 text-2xl font-black">Customer account only</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This page is reserved for customer profiles, saved vehicles, addresses, wishlist items, and order tracking.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href={currentUser.role === "SELLER" ? "/seller/orders" : "/admin"}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
              >
                Open my portal
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-surface px-5 text-sm font-semibold shadow-[var(--shadow-soft)]"
              >
                Sign out
              </button>
            </div>
          </div>
        </section>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <AccessGuard
        allow={["CUSTOMER"]}
        title="Customer Account Only"
        description="Switch to a customer account to manage SpareKart profile, addresses, vehicles, wishlist, and orders."
      >
        <div className="container mx-auto px-4">
          <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "My Account" }]} />
        </div>

        <section className="container mx-auto px-4 pb-10 sm:pb-12 md:pb-16">
          <div className="rounded-[24px] border border-border/60 bg-card p-4 shadow-[var(--shadow-soft)] sm:p-[18px]">
            <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="min-w-0">
                <div className="flex items-start gap-3.5">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] bg-accent-soft text-lg font-black text-accent shadow-[var(--shadow-soft)]">
                    {currentUser.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">My account</div>
                    <h1 className="mt-1 text-[1.55rem] font-black tracking-tight sm:text-[1.9rem]">
                      {currentUser.name}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Manage profile, delivery details, vehicles, saved items, and order activity from one compact customer hub.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                      <span className="rounded-full border border-border/60 bg-background px-3 py-1">
                        {currentUser.email}
                      </span>
                      <span className="rounded-full border border-border/60 bg-background px-3 py-1">
                        {account.city}
                      </span>
                      <span className="rounded-full border border-border/60 bg-background px-3 py-1">
                        Customer since {memberSince}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
                  <AccountStat label="Orders" value={String(stats.orderCount)} />
                  <AccountStat label="Wishlist" value={String(stats.wishlistCount)} />
                  <AccountStat label="Garage" value={String(stats.vehicleCount)} />
                  <AccountStat label="Unread" value={String(stats.unreadNotificationCount)} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/account/orders"
                    className="flex items-center gap-2.5 rounded-[18px] bg-surface px-3.5 py-3 text-sm font-semibold shadow-[var(--shadow-soft)] transition-colors hover:bg-accent-soft"
                  >
                    <Package className="h-4 w-4 text-accent" />
                    Orders
                  </Link>
                  <button
                    type="button"
                    onClick={() => setActiveTab("addresses")}
                    className="flex items-center gap-2.5 rounded-[18px] bg-surface px-3.5 py-3 text-sm font-semibold shadow-[var(--shadow-soft)] transition-colors hover:bg-accent-soft"
                  >
                    <MapPin className="h-4 w-4 text-accent" />
                    Addresses
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("garage")}
                    className="flex items-center gap-2.5 rounded-[18px] bg-surface px-3.5 py-3 text-sm font-semibold shadow-[var(--shadow-soft)] transition-colors hover:bg-accent-soft"
                  >
                    <CarFront className="h-4 w-4 text-accent" />
                    Garage
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 rounded-[18px] bg-destructive/8 px-3.5 py-3 text-sm font-semibold text-destructive shadow-[var(--shadow-soft)] transition-colors hover:bg-destructive/12"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as (typeof overviewTabs)[number]["value"])} className="mt-6">
            <div className="pb-1">
              <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-[18px] bg-surface p-1 shadow-[var(--shadow-soft)] sm:grid-cols-6">
                {overviewTabs.map((entry) => (
                  <TabsTrigger
                    key={entry.value}
                    value={entry.value}
                    className="gap-1.5 rounded-2xl px-2.5 py-2.5 text-[11px] font-semibold sm:px-3 sm:text-sm"
                  >
                    <entry.Icon className="h-4 w-4" />
                    {entry.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value="overview" className="mt-5">
              <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-5">
                  <PanelCard
                    title="Account snapshot"
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <QuickInfo label="Email" value={currentUser.email} />
                      <QuickInfo label="Phone" value={currentUser.phone} />
                      <QuickInfo label="City" value={account.city} />
                      <QuickInfo label="Cart items" value={String(getCartQuantity(state, currentUser.id))} />
                    </div>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <Link
                        href="/account/orders"
                        className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
                      >
                        Manage orders
                      </Link>
                      <Link
                        href="/cart"
                        className="inline-flex h-11 items-center justify-center rounded-xl bg-surface px-5 text-sm font-semibold shadow-[var(--shadow-soft)]"
                      >
                        Open cart
                      </Link>
                    </div>
                  </PanelCard>

                  <PanelCard
                    title="Recent orders"
                    action={
                      <Link href="/account/orders" className="text-sm font-semibold text-accent hover:underline">
                        View all
                      </Link>
                    }
                  >
                    {recentOrders.length === 0 ? (
                      <EmptyInline
                        title="No orders yet"
                        body="Start shopping and your recent orders will appear here."
                      />
                    ) : (
                      <div className="space-y-3">
                        {recentOrders.map((order) => {
                          const payment = getPaymentById(state, order.paymentId);
                          const firstItem = order.items[0];

                          if (!payment) {
                            return null;
                          }

                          return (
                            <div key={order.id} className="rounded-[18px] border border-border/60 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-sm font-bold">{order.orderNumber}</div>
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    {firstItem.title}
                                  </div>
                                </div>
                                <div className="text-sm font-black tabular-nums">
                                  {formatPKR(order.totals.total)}
                                </div>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <span className="rounded-full bg-card px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-foreground shadow-[var(--shadow-soft)]">
                                  {order.status.replaceAll("_", " ")}
                                </span>
                                <span className="rounded-full bg-card px-3 py-1 text-[11px] font-semibold text-muted-foreground shadow-[var(--shadow-soft)]">
                                  {payment.method === "COD" ? "COD" : payment.method.replaceAll("_", " ")}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </PanelCard>
                </div>

                <div className="space-y-5">
                  <PanelCard title="Default delivery address">
                    {defaultAddress ? (
                      <AddressPreviewCard
                        label={defaultAddress.label}
                        name={defaultAddress.fullName}
                        phone={defaultAddress.phone}
                        body={`${defaultAddress.addressLine}, ${defaultAddress.city}, ${defaultAddress.province} ${defaultAddress.postalCode}`}
                      />
                    ) : (
                      <EmptyInline title="No saved address" body="Add an address in the Addresses tab." />
                    )}
                  </PanelCard>

                  <PanelCard title="Primary vehicle">
                    {primaryVehicle ? (
                      <VehiclePreviewCard
                        nickname={primaryVehicle.nickname}
                        body={`${primaryVehicle.brand} ${primaryVehicle.model} · ${primaryVehicle.year} · ${primaryVehicle.engine}`}
                      />
                    ) : (
                      <EmptyInline title="No saved vehicles" body="Add one in Garage to keep fitment details ready." />
                    )}
                  </PanelCard>

                  <PanelCard
                    title="Notifications"
                    action={
                      stats.unreadNotificationCount > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            markNotificationsRead();
                            toast.success("Notifications marked as read.");
                          }}
                          className="text-sm font-semibold text-accent hover:underline"
                        >
                          Mark all read
                        </button>
                      ) : undefined
                    }
                  >
                    <NotificationFeed
                      items={notifications.slice(0, 3)}
                      emptyLabel="No recent customer notifications."
                    />
                  </PanelCard>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="profile" className="mt-5">
              <PanelCard
                title="Profile details"
                description="Checkout and contact details."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name">
                    <input
                      value={profileDraft.name}
                      onChange={(event) => setProfileDraft((previous) => ({ ...previous, name: event.target.value }))}
                      className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                  </Field>
                  <Field label="Phone">
                    <input
                      value={profileDraft.phone}
                      onChange={(event) => setProfileDraft((previous) => ({ ...previous, phone: event.target.value }))}
                      className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                  </Field>
                  <Field label="Email">
                    <input
                      value={profileDraft.email}
                      onChange={(event) => setProfileDraft((previous) => ({ ...previous, email: event.target.value }))}
                      className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                  </Field>
                  <Field label="City">
                    <input
                      value={profileDraft.city}
                      onChange={(event) => setProfileDraft((previous) => ({ ...previous, city: event.target.value }))}
                      className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                  </Field>
                </div>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        updateProfile(profileDraft);
                        toast.success("Profile updated successfully.");
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Unable to update profile.");
                      }
                    }}
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
                  >
                    Save profile
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setProfileDraft({
                        name: currentUser.name,
                        email: currentUser.email,
                        phone: currentUser.phone,
                        city: account.city,
                      })
                    }
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-surface px-5 text-sm font-semibold shadow-[var(--shadow-soft)]"
                  >
                    Reset
                  </button>
                </div>
              </PanelCard>
            </TabsContent>

            <TabsContent value="addresses" className="mt-5">
              <div className="grid gap-4 lg:grid-cols-[1fr_0.95fr]">
                <PanelCard title="Address book">
                  {account.addresses.length === 0 ? (
                    <EmptyInline title="No saved addresses" body="Add your first delivery address from the form." />
                  ) : (
                    <div className="space-y-3">
                      {account.addresses.map((address) => (
                        <div key={address.id} className="rounded-[18px] border border-border/60 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="text-sm font-bold">{address.label}</div>
                                {address.isDefault && (
                                  <span className="rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-success">
                                    Default
                                  </span>
                                )}
                              </div>
                              <div className="mt-2 text-sm text-foreground">{address.fullName}</div>
                              <div className="mt-1 text-xs text-muted-foreground">{address.phone}</div>
                              <div className="mt-2 text-sm text-muted-foreground">
                                {address.addressLine}, {address.city}, {address.province} {address.postalCode}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingAddressId(address.id);
                                  setAddressDraft(address);
                                }}
                                className="inline-flex h-9 items-center justify-center rounded-xl bg-card px-3 text-sm font-semibold shadow-[var(--shadow-soft)]"
                              >
                                Edit
                              </button>
                              {!address.isDefault && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    try {
                                      saveAddress({ ...address, isDefault: true });
                                      toast.success("Default address updated.");
                                    } catch (error) {
                                      toast.error(error instanceof Error ? error.message : "Unable to update address.");
                                    }
                                  }}
                                  className="inline-flex h-9 items-center justify-center rounded-xl bg-card px-3 text-sm font-semibold shadow-[var(--shadow-soft)]"
                                >
                                  Set default
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  deleteAddress(address.id);
                                  toast.success("Address removed.");
                                  if (editingAddressId === address.id) {
                                    setEditingAddressId(null);
                                    setAddressDraft(createBlankAddress(currentUser.name, currentUser.phone));
                                  }
                                }}
                                className="inline-flex h-9 items-center justify-center rounded-xl bg-destructive/10 px-3 text-sm font-semibold text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </PanelCard>

                <PanelCard
                  title={editingAddressId ? "Edit address" : "Add new address"}
                >
                  <div className="space-y-4">
                    <Field label="Label">
                      <input
                        value={addressDraft.label}
                        onChange={(event) => setAddressDraft((previous) => ({ ...previous, label: event.target.value }))}
                        className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
                      />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Recipient name">
                        <input
                          value={addressDraft.fullName}
                          onChange={(event) => setAddressDraft((previous) => ({ ...previous, fullName: event.target.value }))}
                          className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
                        />
                      </Field>
                      <Field label="Phone">
                        <input
                          value={addressDraft.phone}
                          onChange={(event) => setAddressDraft((previous) => ({ ...previous, phone: event.target.value }))}
                          className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
                        />
                      </Field>
                    </div>
                    <Field label="Address line">
                      <input
                        value={addressDraft.addressLine}
                        onChange={(event) => setAddressDraft((previous) => ({ ...previous, addressLine: event.target.value }))}
                        className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
                      />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <Field label="City">
                        <input
                          value={addressDraft.city}
                          onChange={(event) => setAddressDraft((previous) => ({ ...previous, city: event.target.value }))}
                          className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
                        />
                      </Field>
                      <Field label="Province">
                        <input
                          value={addressDraft.province}
                          onChange={(event) => setAddressDraft((previous) => ({ ...previous, province: event.target.value }))}
                          className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
                        />
                      </Field>
                      <Field label="Postal code">
                        <input
                          value={addressDraft.postalCode}
                          onChange={(event) => setAddressDraft((previous) => ({ ...previous, postalCode: event.target.value }))}
                          className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
                        />
                      </Field>
                    </div>

                    <label className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3 text-sm shadow-[var(--shadow-soft)]">
                      <span className="font-semibold text-foreground">Use as default address</span>
                      <Switch
                        checked={!!addressDraft.isDefault}
                        onCheckedChange={(checked) => setAddressDraft((previous) => ({ ...previous, isDefault: checked }))}
                      />
                    </label>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => {
                          try {
                            saveAddress(addressDraft);
                            toast.success(editingAddressId ? "Address updated." : "Address added.");
                            setEditingAddressId(null);
                            setAddressDraft(createBlankAddress(currentUser.name, currentUser.phone));
                          } catch (error) {
                            toast.error(error instanceof Error ? error.message : "Unable to save address.");
                          }
                        }}
                        className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
                      >
                        {editingAddressId ? "Update address" : "Save address"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAddressId(null);
                          setAddressDraft(createBlankAddress(currentUser.name, currentUser.phone));
                        }}
                        className="inline-flex h-11 items-center justify-center rounded-xl bg-surface px-5 text-sm font-semibold shadow-[var(--shadow-soft)]"
                      >
                        Clear form
                      </button>
                    </div>
                  </div>
                </PanelCard>
              </div>
            </TabsContent>

            <TabsContent value="garage" className="mt-5">
              <div className="grid gap-4 lg:grid-cols-[1fr_0.95fr]">
                <PanelCard title="Saved vehicles">
                  {account.savedVehicles.length === 0 ? (
                    <EmptyInline title="No saved vehicles" body="Add your first car to the SpareKart garage." />
                  ) : (
                    <div className="space-y-3">
                      {account.savedVehicles.map((vehicle) => (
                        <div key={vehicle.id} className="rounded-[18px] border border-border/60 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="text-sm font-bold">{vehicle.nickname}</div>
                                {vehicle.isPrimary && (
                                  <span className="rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-success">
                                    Primary
                                  </span>
                                )}
                              </div>
                              <div className="mt-2 text-sm text-muted-foreground">
                                {vehicle.brand} {vehicle.model} · {vehicle.year} · {vehicle.engine}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingVehicleId(vehicle.id);
                                  setVehicleDraft(vehicle);
                                }}
                                className="inline-flex h-9 items-center justify-center rounded-xl bg-card px-3 text-sm font-semibold shadow-[var(--shadow-soft)]"
                              >
                                Edit
                              </button>
                              {!vehicle.isPrimary && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    try {
                                      saveVehicle({ ...vehicle, isPrimary: true });
                                      toast.success("Primary vehicle updated.");
                                    } catch (error) {
                                      toast.error(error instanceof Error ? error.message : "Unable to update vehicle.");
                                    }
                                  }}
                                  className="inline-flex h-9 items-center justify-center rounded-xl bg-card px-3 text-sm font-semibold shadow-[var(--shadow-soft)]"
                                >
                                  Set primary
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  deleteVehicle(vehicle.id);
                                  toast.success("Vehicle removed.");
                                  if (editingVehicleId === vehicle.id) {
                                    setEditingVehicleId(null);
                                    setVehicleDraft(createBlankVehicle());
                                  }
                                }}
                                className="inline-flex h-9 items-center justify-center rounded-xl bg-destructive/10 px-3 text-sm font-semibold text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </PanelCard>

                <PanelCard
                  title={editingVehicleId ? "Edit vehicle" : "Add vehicle"}
                >
                  <div className="space-y-4">
                    <Field label="Nickname">
                      <input
                        value={vehicleDraft.nickname}
                        onChange={(event) => setVehicleDraft((previous) => ({ ...previous, nickname: event.target.value }))}
                        className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
                      />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Brand">
                        <select
                          value={vehicleDraft.brand}
                          onChange={(event) =>
                            setVehicleDraft((previous) => ({
                              ...previous,
                              brand: event.target.value,
                            }))
                          }
                          className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
                        >
                          {vehicles.map((vehicle) => (
                            <option key={vehicle.brand} value={vehicle.brand}>
                              {vehicle.brand}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Model">
                        <select
                          value={vehicleDraft.model}
                          onChange={(event) =>
                            setVehicleDraft((previous) => ({
                              ...previous,
                              model: event.target.value,
                            }))
                          }
                          className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
                        >
                          {selectedBrand.models.map((model) => (
                            <option key={model.name} value={model.name}>
                              {model.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Year">
                        <select
                          value={vehicleDraft.year}
                          onChange={(event) =>
                            setVehicleDraft((previous) => ({
                              ...previous,
                              year: Number(event.target.value),
                            }))
                          }
                          className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
                        >
                          {selectedModel.years.map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Engine">
                        <select
                          value={vehicleDraft.engine}
                          onChange={(event) =>
                            setVehicleDraft((previous) => ({
                              ...previous,
                              engine: event.target.value,
                            }))
                          }
                          className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
                        >
                          {selectedModel.engines.map((engine) => (
                            <option key={engine} value={engine}>
                              {engine}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>

                    <label className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3 text-sm shadow-[var(--shadow-soft)]">
                      <span className="font-semibold text-foreground">Use as primary vehicle</span>
                      <Switch
                        checked={!!vehicleDraft.isPrimary}
                        onCheckedChange={(checked) => setVehicleDraft((previous) => ({ ...previous, isPrimary: checked }))}
                      />
                    </label>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => {
                          try {
                            saveVehicle(vehicleDraft);
                            toast.success(editingVehicleId ? "Vehicle updated." : "Vehicle added.");
                            setEditingVehicleId(null);
                            setVehicleDraft(createBlankVehicle());
                          } catch (error) {
                            toast.error(error instanceof Error ? error.message : "Unable to save vehicle.");
                          }
                        }}
                        className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
                      >
                        {editingVehicleId ? "Update vehicle" : "Save vehicle"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingVehicleId(null);
                          setVehicleDraft(createBlankVehicle());
                        }}
                        className="inline-flex h-11 items-center justify-center rounded-xl bg-surface px-5 text-sm font-semibold shadow-[var(--shadow-soft)]"
                      >
                        Clear form
                      </button>
                    </div>

                    <Link
                      href="/compatibility"
                      className="inline-flex h-11 items-center justify-center rounded-xl bg-surface px-5 text-sm font-semibold shadow-[var(--shadow-soft)]"
                    >
                      Find parts for this garage
                    </Link>
                  </div>
                </PanelCard>
              </div>
            </TabsContent>

            <TabsContent value="wishlist" className="mt-5">
              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <PanelCard title="Saved wishlist">
                  {wishlistProducts.length === 0 ? (
                    <EmptyInline title="Wishlist is empty" body="Save products here to revisit them quickly." />
                  ) : (
                    <div className="space-y-3">
                      {wishlistProducts.map((product) => {
                        const seller = getSeller(product.sellerSlug);

                        return (
                          <div key={product.id} className="rounded-[18px] border border-border/60 p-4">
                            <div className="flex gap-3">
                              <OptimizedImage
                                src={product.images[0]}
                                alt={product.title}
                                width={72}
                                height={72}
                                className="h-[72px] w-[72px] rounded-xl object-cover"
                              />
                              <div className="min-w-0 flex-1">
                                <Link href={`/product/${product.slug}`} className="line-clamp-2 text-sm font-bold text-foreground hover:text-accent">
                                  {product.title}
                                </Link>
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {seller.name} · {product.brand}
                                </div>
                                <div className="mt-2 text-base font-black tabular-nums">
                                  {formatPKR(product.price)}
                                </div>
                                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      try {
                                        addToCart(product.id, 1);
                                        toast.success(`${product.title} added to cart.`);
                                      } catch (error) {
                                        toast.error(error instanceof Error ? error.message : "Unable to add item to cart.");
                                      }
                                    }}
                                    className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
                                  >
                                    Add to cart
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      toggleWishlist(product.id);
                                      toast.success("Removed from wishlist.");
                                    }}
                                    className="inline-flex h-10 items-center justify-center rounded-xl bg-surface px-4 text-sm font-semibold shadow-[var(--shadow-soft)]"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </PanelCard>

                <PanelCard title="Suggested products" description="Recommended for your next order.">
                  <div className="space-y-3">
                    {suggestedWishlistProducts.map((product) => (
                      <div key={product.id} className="rounded-[18px] border border-border/60 p-4">
                        <div className="flex items-center gap-3">
                          <OptimizedImage
                            src={product.images[0]}
                            alt={product.title}
                            width={56}
                            height={56}
                            className="h-14 w-14 rounded-xl object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="line-clamp-2 text-sm font-bold text-foreground">
                              {product.title}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {formatPKR(product.price)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              toggleWishlist(product.id);
                              toast.success("Saved to wishlist.");
                            }}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-[var(--shadow-soft)]"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </PanelCard>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="mt-5">
              <div className="grid gap-4 lg:grid-cols-[1fr_0.95fr]">
                <PanelCard title="Communication preferences">
                  <div className="space-y-3">
                    <PreferenceRow
                      label="Order email updates"
                      description="Receive email updates for order confirmations, shipping, and delivery."
                      checked={account.preferences.orderEmailUpdates}
                      onCheckedChange={(checked) => updatePreferenceWithToast(updatePreferences, "orderEmailUpdates", checked)}
                    />
                    <PreferenceRow
                      label="Promotions"
                      description="Receive promotions and marketplace campaigns."
                      checked={account.preferences.promotions}
                      onCheckedChange={(checked) => updatePreferenceWithToast(updatePreferences, "promotions", checked)}
                    />
                    <PreferenceRow
                      label="Price alerts"
                      description="Get notified when watched products or categories change price."
                      checked={account.preferences.priceAlerts}
                      onCheckedChange={(checked) => updatePreferenceWithToast(updatePreferences, "priceAlerts", checked)}
                    />
                    <PreferenceRow
                      label="SMS alerts"
                      description="Receive time-sensitive shipping and payment alerts via SMS."
                      checked={account.preferences.smsAlerts}
                      onCheckedChange={(checked) => updatePreferenceWithToast(updatePreferences, "smsAlerts", checked)}
                    />
                  </div>
                </PanelCard>

                <div className="space-y-5">
                  <PanelCard title="Security preferences">
                    <div className="space-y-3">
                      <PreferenceRow
                        label="Login alerts"
                        description="Get notified whenever your SpareKart session changes."
                        checked={account.preferences.loginAlerts}
                        onCheckedChange={(checked) => updatePreferenceWithToast(updatePreferences, "loginAlerts", checked)}
                      />
                      <PreferenceRow
                        label="Two-factor verification"
                        description="Require a second confirmation step for sensitive account actions."
                        checked={account.preferences.twoFactorEnabled}
                        onCheckedChange={(checked) => updatePreferenceWithToast(updatePreferences, "twoFactorEnabled", checked)}
                      />
                    </div>
                  </PanelCard>

                  <PanelCard
                    title="Customer notifications"
                    action={
                      stats.unreadNotificationCount > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            markNotificationsRead();
                            toast.success("Notifications marked as read.");
                          }}
                          className="text-sm font-semibold text-accent hover:underline"
                        >
                          Mark all read
                        </button>
                      ) : undefined
                    }
                  >
                    <NotificationFeed
                      items={notifications.slice(0, 5)}
                      emptyLabel="No recent account notifications."
                    />
                  </PanelCard>

                  <PanelCard title="Account access">
                    <div className="grid gap-3">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-destructive/10 px-5 text-sm font-semibold text-destructive"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                      <Link href="/login" className="inline-flex h-11 items-center justify-center rounded-xl bg-surface px-5 text-sm font-semibold shadow-[var(--shadow-soft)]">
                        Switch account
                      </Link>
                    </div>
                  </PanelCard>

                  <PanelCard title="Need help?">
                    <div className="grid gap-3">
                      <Link href="/help" className="inline-flex h-11 items-center justify-center rounded-xl bg-surface px-5 text-sm font-semibold shadow-[var(--shadow-soft)]">
                        Help centre
                      </Link>
                      <Link href="/compatibility" className="inline-flex h-11 items-center justify-center rounded-xl bg-surface px-5 text-sm font-semibold shadow-[var(--shadow-soft)]">
                        Find parts for your car
                      </Link>
                    </div>
                  </PanelCard>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </section>
      </AccessGuard>
    </PageLayout>
  );
}

function updatePreferenceWithToast(
  updatePreferences: (input: Partial<CustomerPreferences>) => void,
  key: keyof CustomerPreferences,
  value: boolean,
) {
  updatePreferences({ [key]: value });
  toast.success("Preference updated.");
}

function AccountStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] border border-border/60 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </div>
        <div className="text-base font-black tabular-nums text-foreground sm:text-[1.1rem]">{value}</div>
      </div>
    </div>
  );
}

function PanelCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[22px] border border-border/60 bg-card p-3.5 sm:p-4">
      <div className="flex flex-col gap-2.5 border-b border-border/60 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-base font-black text-foreground sm:text-[1.05rem]">{title}</div>
          {description ? <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-3.5">{children}</div>
    </div>
  );
}

function QuickInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-border/60 px-3.5 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-bold text-foreground">{value}</div>
    </div>
  );
}

function AddressPreviewCard({
  label,
  name,
  phone,
  body,
}: {
  label: string;
  name: string;
  phone: string;
  body: string;
}) {
  return (
    <div className="rounded-[16px] border border-border/60 px-4 py-3">
      <div className="inline-flex rounded-full border border-border/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2.5 text-sm font-bold text-foreground">{name}</div>
      <div className="mt-1 text-xs text-muted-foreground">{phone}</div>
      <p className="mt-3 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function VehiclePreviewCard({
  nickname,
  body,
}: {
  nickname: string;
  body: string;
}) {
  return (
    <div className="rounded-[16px] border border-border/60 px-4 py-3">
      <div className="text-sm font-bold text-foreground">{nickname}</div>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function EmptyInline({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[16px] border border-dashed border-border/70 px-4 py-3 text-sm">
      <div className="font-bold text-foreground">{title}</div>
      <p className="mt-1 text-muted-foreground">{body}</p>
    </div>
  );
}

function PreferenceRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-[16px] border border-border/60 px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-bold text-foreground">{label}</div>
        <div className="mt-1 text-sm leading-5 text-muted-foreground">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function formatAccountDate(date?: string) {
  if (!date) {
    return "recently";
  }

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  } catch {
    return date;
  }
}
