"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminField, AdminScopeGate } from "@/components/admin/AdminCommon";
import { AdminPageHeader, AdminPanel } from "@/components/admin/AdminUI";
import { useMarketplace } from "@/modules/marketplace/store";

export default function AdminSettingsPage() {
  const { currentUser, state, updateSystemSettings } = useMarketplace();
  const [draft, setDraft] = useState(state.systemSettings);

  useEffect(() => {
    setDraft(state.systemSettings);
  }, [state.systemSettings]);

  return (
    <AdminScopeGate
      scope="settings"
      currentUser={currentUser}
      superAdminOnly
      title="Super admin settings only"
      description="Platform settings are restricted to the super-admin role because they affect global marketplace behavior."
    >
      <div className="space-y-4">
        <AdminPageHeader
          eyebrow="System settings"
          title="Marketplace configuration and platform controls"
          description="Manage tax, shipping, seller behavior, payment method availability, and platform-wide notification settings."
        />

        <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <AdminPanel title="Commerce settings">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <AdminField label="Currency">
                  <input
                    value={draft.currency}
                    onChange={(event) => setDraft((previous) => ({ ...previous, currency: event.target.value }))}
                    className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                  />
                </AdminField>
                <AdminField label="Tax rate">
                  <input
                    type="number"
                    value={draft.taxRate}
                    onChange={(event) => setDraft((previous) => ({ ...previous, taxRate: Number(event.target.value) || 0 }))}
                    className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                  />
                </AdminField>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <AdminField label="Standard shipping">
                  <input
                    type="number"
                    value={draft.shipping.standardRate}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        shipping: { ...previous.shipping, standardRate: Number(event.target.value) || 0 },
                      }))
                    }
                    className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                  />
                </AdminField>
                <AdminField label="Express shipping">
                  <input
                    type="number"
                    value={draft.shipping.expressRate}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        shipping: { ...previous.shipping, expressRate: Number(event.target.value) || 0 },
                      }))
                    }
                    className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                  />
                </AdminField>
                <AdminField label="Free shipping threshold">
                  <input
                    type="number"
                    value={draft.shipping.freeShippingThreshold}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        shipping: { ...previous.shipping, freeShippingThreshold: Number(event.target.value) || 0 },
                      }))
                    }
                    className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                  />
                </AdminField>
              </div>
            </div>
          </AdminPanel>

          <AdminPanel title="Seller platform settings">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <AdminField label="Allow self-registration">
                  <select
                    value={draft.sellerPlatform.allowSelfRegistration ? "yes" : "no"}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        sellerPlatform: { ...previous.sellerPlatform, allowSelfRegistration: event.target.value === "yes" },
                      }))
                    }
                    className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                  >
                    <option value="yes">Enabled</option>
                    <option value="no">Disabled</option>
                  </select>
                </AdminField>
                <AdminField label="Auto-approve sellers">
                  <select
                    value={draft.sellerPlatform.autoApproveSellers ? "yes" : "no"}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        sellerPlatform: { ...previous.sellerPlatform, autoApproveSellers: event.target.value === "yes" },
                      }))
                    }
                    className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                  >
                    <option value="no">Manual approval</option>
                    <option value="yes">Auto approve</option>
                  </select>
                </AdminField>
              </div>

              <AdminField label="Default commission rate">
                <input
                  type="number"
                  value={draft.sellerPlatform.defaultCommissionRate}
                  onChange={(event) =>
                    setDraft((previous) => ({
                      ...previous,
                      sellerPlatform: {
                        ...previous.sellerPlatform,
                        defaultCommissionRate: Number(event.target.value) || 0,
                      },
                    }))
                  }
                  className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                />
              </AdminField>
            </div>
          </AdminPanel>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <AdminPanel title="Payment method availability">
            <div className="grid gap-3 md:grid-cols-2">
              {Object.entries(draft.payments).map(([method, config]) => (
                <div key={method} className="rounded-[22px] bg-surface px-4 py-4 shadow-[var(--shadow-soft)]">
                  <div className="text-sm font-bold text-foreground">{config.label}</div>
                  <div className="mt-3 space-y-3">
                    <AdminField label="Enabled">
                      <select
                        value={config.enabled ? "yes" : "no"}
                        onChange={(event) =>
                          setDraft((previous) => ({
                            ...previous,
                            payments: {
                              ...previous.payments,
                              [method]: { ...config, enabled: event.target.value === "yes" },
                            },
                          }))
                        }
                        className="h-11 w-full rounded-xl bg-card px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                      >
                        <option value="yes">Enabled</option>
                        <option value="no">Disabled</option>
                      </select>
                    </AdminField>
                    <AdminField label="Manual review">
                      <select
                        value={config.requiresManualReview ? "yes" : "no"}
                        onChange={(event) =>
                          setDraft((previous) => ({
                            ...previous,
                            payments: {
                              ...previous.payments,
                              [method]: { ...config, requiresManualReview: event.target.value === "yes" },
                            },
                          }))
                        }
                        className="h-11 w-full rounded-xl bg-card px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                      >
                        <option value="yes">Required</option>
                        <option value="no">Not required</option>
                      </select>
                    </AdminField>
                  </div>
                </div>
              ))}
            </div>
          </AdminPanel>

          <AdminPanel title="Notifications and integrations">
            <div className="space-y-4">
              {notificationRows(draft).map(({ label, value, key }) => (
                <AdminField key={String(key)} label={String(label)}>
                  <select
                    value={value ? "yes" : "no"}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        notifications: {
                          ...previous.notifications,
                          [key]: event.target.value === "yes",
                        },
                      }))
                    }
                    className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                  >
                    <option value="yes">Enabled</option>
                    <option value="no">Disabled</option>
                  </select>
                </AdminField>
              ))}

              <div className="grid gap-4 sm:grid-cols-2">
                <AdminField label="Analytics enabled">
                  <select
                    value={draft.integrations.analyticsEnabled ? "yes" : "no"}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        integrations: { ...previous.integrations, analyticsEnabled: event.target.value === "yes" },
                      }))
                    }
                    className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                  >
                    <option value="yes">Enabled</option>
                    <option value="no">Disabled</option>
                  </select>
                </AdminField>
                <AdminField label="Email provider enabled">
                  <select
                    value={draft.integrations.emailProviderEnabled ? "yes" : "no"}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        integrations: { ...previous.integrations, emailProviderEnabled: event.target.value === "yes" },
                      }))
                    }
                    className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                  >
                    <option value="yes">Enabled</option>
                    <option value="no">Disabled</option>
                  </select>
                </AdminField>
              </div>

              <AdminField label="Webhook URL">
                <input
                  value={draft.integrations.webhookUrl}
                  onChange={(event) =>
                    setDraft((previous) => ({
                      ...previous,
                      integrations: { ...previous.integrations, webhookUrl: event.target.value },
                    }))
                  }
                  className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                />
              </AdminField>
            </div>
          </AdminPanel>
        </section>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              try {
                updateSystemSettings(draft);
                toast.success("System settings updated.");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Unable to update settings.");
              }
            }}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
          >
            Save settings
          </button>
        </div>
      </div>
    </AdminScopeGate>
  );
}

function notificationRows(draft: ReturnType<typeof getDraftShape>) {
  return [
    { label: "Order emails", value: draft.notifications.orderEmails, key: "orderEmails" as const },
    { label: "Payment queue alerts", value: draft.notifications.paymentQueueAlerts, key: "paymentQueueAlerts" as const },
    { label: "Seller approval alerts", value: draft.notifications.sellerApprovalAlerts, key: "sellerApprovalAlerts" as const },
    { label: "Low stock alerts", value: draft.notifications.lowStockAlerts, key: "lowStockAlerts" as const },
  ];
}

function getDraftShape() {
  return {
    notifications: {
      orderEmails: false,
      paymentQueueAlerts: false,
      sellerApprovalAlerts: false,
      lowStockAlerts: false,
    },
  };
}
