import "server-only";

import { enqueueTemplatedEmail } from "./queue";
import type { MarketplaceEmailRequest } from "./types";

export async function queueMarketplaceEmail(request: MarketplaceEmailRequest) {
  switch (request.type) {
    case "AUTH_TEMPLATE":
      return enqueueTemplatedEmail(request.to, request.template);
    case "ORDER_CREATED": {
      const jobs = [];
      jobs.push(
        enqueueTemplatedEmail(request.order.customer, {
          template: "ORDER_CONFIRMATION_CUSTOMER",
          recipientName: request.order.customer.name ?? "Customer",
          orderNumber: request.order.orderNumber,
          paymentMethod: request.order.paymentMethod,
          totalAmountLabel: request.order.totalAmountLabel,
          shippingAddress: request.order.shippingAddress,
          items: request.order.items.map((item) => ({
            title: item.title,
            quantity: item.quantity,
            unitPriceLabel: item.unitPriceLabel,
            sellerName: item.sellerName,
          })),
          trackingUrl: request.order.trackingUrl,
        }),
      );

      const sellerGroups = new Map<
        string,
        {
          email: string;
          name: string;
          items: {
            title: string;
            quantity: number;
            unitPriceLabel: string;
          }[];
        }
      >();

      request.order.items.forEach((item) => {
        if (!item.sellerEmail) {
          return;
        }

        const key = item.sellerEmail.toLowerCase();
        const current = sellerGroups.get(key);

        if (current) {
          current.items.push({
            title: item.title,
            quantity: item.quantity,
            unitPriceLabel: item.unitPriceLabel,
          });
          return;
        }

        sellerGroups.set(key, {
          email: item.sellerEmail,
          name: item.sellerContactName ?? item.sellerName,
          items: [
            {
              title: item.title,
              quantity: item.quantity,
              unitPriceLabel: item.unitPriceLabel,
            },
          ],
        });
      });

      sellerGroups.forEach((seller) => {
        jobs.push(
          enqueueTemplatedEmail(
            { email: seller.email, name: seller.name },
            {
              template: "ORDER_CONFIRMATION_SELLER",
              recipientName: seller.name,
              orderNumber: request.order.orderNumber,
              customerName: request.order.customer.name ?? "Customer",
              customerPhone: request.order.customer.phone,
              shippingAddress: request.order.shippingAddress,
              items: seller.items,
              workspaceUrl: request.order.sellerWorkspaceBaseUrl,
            },
          ),
        );
      });

      return Promise.all(jobs);
    }
    case "ORDER_STATUS_CHANGED":
      return Promise.all([
        enqueueTemplatedEmail(request.order.customer, {
          template: "ORDER_STATUS_UPDATE",
          recipientName: request.order.customer.name ?? "Customer",
          audience: "CUSTOMER",
          orderNumber: request.order.orderNumber,
          status: request.order.status,
          summary: request.order.summary,
          actionUrl: request.order.trackingUrl,
          actionLabel: "View tracking",
        }),
        ...(request.order.sellers ?? []).map((seller) =>
          enqueueTemplatedEmail(
            { email: seller.email, name: seller.name },
            {
              template: "ORDER_STATUS_UPDATE",
              recipientName: seller.name ?? "Seller",
              audience: "SELLER",
              orderNumber: request.order.orderNumber,
              status: request.order.status,
              summary: seller.summary,
              actionUrl: seller.workspaceUrl,
              actionLabel: "Open seller orders",
            },
          ),
        ),
      ]);
    case "PAYMENT_PROOF_RECEIVED":
      return enqueueTemplatedEmail(request.order.customer, {
        template: "PAYMENT_PROOF_RECEIVED",
        recipientName: request.order.customer.name ?? "Customer",
        orderNumber: request.order.orderNumber,
        paymentMethod: request.order.paymentMethod,
        proofReference: request.order.proofReference,
        trackingUrl: request.order.trackingUrl,
      });
  }
}
