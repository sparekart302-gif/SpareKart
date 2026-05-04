"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Search, Star } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/components/navigation/Link";
import { AdminCompactStat, AdminKeyValue, AdminScopeGate } from "@/components/admin/AdminCommon";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  AdminPill,
} from "@/components/admin/AdminUI";
import { formatRating } from "@/lib/format-rating";
import { getReviewInsights } from "@/modules/marketplace/admin-selectors";
import { useMarketplace } from "@/modules/marketplace/store";
import type { ReviewModerationStatus } from "@/modules/marketplace/types";

const moderationStatuses: Array<ReviewModerationStatus | "ALL"> = [
  "ALL",
  "PENDING",
  "APPROVED",
  "FLAGGED",
  "REJECTED",
];

type ReviewRow = {
  id: string;
  kind: "product" | "store";
  entityName: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  moderationStatus: ReviewModerationStatus;
  reportedCount: number;
  moderatedAt?: string;
  moderatorNote?: string;
};

const ITEMS_PER_PAGE = 12;

export default function AdminReviewsPage() {
  const { currentUser, state, moderateReviewRecord } = useMarketplace();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReviewModerationStatus | "ALL">("ALL");
  const [kindFilter, setKindFilter] = useState<"product" | "store" | "all">("all");
  const [selectedReviewId, setSelectedReviewId] = useState("");
  const [moderatorNote, setModeratorNote] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const reviewRows = useMemo<ReviewRow[]>(() => {
    const productRows = state.managedProductReviews.map((review) => ({
      id: review.id,
      kind: "product" as const,
      entityName:
        state.managedProducts.find((product) => product.id === review.productId)?.title ??
        review.productId,
      author: review.author,
      rating: review.rating,
      title: review.title,
      body: review.body,
      moderationStatus: review.moderationStatus,
      reportedCount: review.reportedCount,
      moderatedAt: review.moderatedAt,
      moderatorNote: review.moderatorNote,
    }));
    const storeRows = state.managedStoreReviews.map((review) => ({
      id: review.id,
      kind: "store" as const,
      entityName:
        state.sellersDirectory.find((seller) => seller.slug === review.sellerSlug)?.name ??
        review.sellerSlug,
      author: review.author,
      rating: review.rating,
      title: review.title,
      body: review.body,
      moderationStatus: review.moderationStatus,
      reportedCount: review.reportedCount,
      moderatedAt: review.moderatedAt,
      moderatorNote: review.moderatorNote,
    }));

    return [...productRows, ...storeRows]
      .filter((review) => {
        const searchable =
          `${review.author} ${review.entityName} ${review.title} ${review.body}`.toLowerCase();
        return (
          (!query.trim() || searchable.includes(query.trim().toLowerCase())) &&
          (statusFilter === "ALL" || review.moderationStatus === statusFilter) &&
          (kindFilter === "all" || review.kind === kindFilter)
        );
      })
      .sort(
        (left, right) => right.reportedCount - left.reportedCount || right.rating - left.rating,
      );
  }, [
    kindFilter,
    query,
    state.managedProductReviews,
    state.managedProducts,
    state.managedStoreReviews,
    state.sellersDirectory,
    statusFilter,
  ]);

  const totalPages = Math.ceil(reviewRows.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedReviews = reviewRows.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, statusFilter, kindFilter]);

  useEffect(() => {
    if (!paginatedReviews.length && currentPage > 1) {
      setCurrentPage(1);
      return;
    }
    if (!reviewRows.length) {
      setSelectedReviewId("");
      return;
    }
    if (!reviewRows.some((review) => review.id === selectedReviewId)) {
      setSelectedReviewId(paginatedReviews[0]?.id ?? "");
    }
  }, [paginatedReviews, reviewRows, selectedReviewId, currentPage]);

  const selectedReview = reviewRows.find((review) => review.id === selectedReviewId);
  const insights = getReviewInsights(state);

  useEffect(() => {
    setModeratorNote(selectedReview?.moderatorNote ?? "");
  }, [selectedReview?.moderatorNote, selectedReviewId]);

  return (
    <AdminScopeGate scope="reviews" currentUser={currentUser}>
      <div className="space-y-4">
        <AdminPageHeader
          eyebrow="Review moderation"
          title="Product and store trust moderation"
          description="Review reported content, keep high-quality feedback visible, and resolve suspicious reviews with auditable moderation notes."
          actions={
            <Link
              href="/admin/reports"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-surface px-5 text-sm font-semibold shadow-[var(--shadow-soft)]"
            >
              View all reports
            </Link>
          }
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminCompactStat
            label="Avg product rating"
            value={formatRating(insights.averageProductRating)}
            helper="Across moderated product reviews"
          />
          <AdminCompactStat
            label="Avg store rating"
            value={formatRating(insights.averageStoreRating)}
            helper="Across moderated store reviews"
          />
          <AdminCompactStat
            label="Pending"
            value={String(insights.pendingReviewCount)}
            helper="Awaiting moderation"
            tone="warning"
          />
          <AdminCompactStat
            label="Flagged"
            value={String(insights.flaggedReviewCount)}
            helper="Reported or suspicious"
            tone="danger"
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
          <AdminPanel title="Review queue" description="Search and filter reviews for moderation.">
            <div className="grid gap-3 lg:grid-cols-[1.2fr_0.45fr_0.5fr]">
              <div className="flex items-center gap-2 rounded-xl bg-surface px-3 shadow-[var(--shadow-soft)]">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by author, entity, or text"
                  className="h-11 w-full bg-transparent text-sm focus:outline-none"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as ReviewModerationStatus | "ALL")
                }
                className="h-11 rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
              >
                {moderationStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status === "ALL" ? "All states" : status}
                  </option>
                ))}
              </select>
              <select
                value={kindFilter}
                onChange={(event) =>
                  setKindFilter(event.target.value as "product" | "store" | "all")
                }
                className="h-11 rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
              >
                <option value="all">All types</option>
                <option value="product">Product reviews</option>
                <option value="store">Store reviews</option>
              </select>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    <th className="px-3 py-3 font-semibold">Review</th>
                    <th className="px-3 py-3 font-semibold">Author</th>
                    <th className="px-3 py-3 font-semibold">Rating</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 font-semibold">Reports</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedReviews.map((review) => (
                    <tr
                      key={review.id}
                      onClick={() => setSelectedReviewId(review.id)}
                      className={`cursor-pointer border-b border-border/70 transition-colors hover:bg-accent-soft/30 last:border-b-0 ${
                        selectedReviewId === review.id ? "bg-accent-soft/50" : ""
                      }`}
                    >
                      <td className="px-3 py-4">
                        <div className="font-medium text-foreground">{review.title}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {review.entityName}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-muted-foreground">{review.author}</td>
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{formatRating(review.rating)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <ModerationPill status={review.moderationStatus} />
                      </td>
                      <td className="px-3 py-4">
                        {review.reportedCount > 0 ? (
                          <AdminPill tone="danger">{review.reportedCount}</AdminPill>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {reviewRows.length === 0 && (
              <AdminEmptyState
                title="No reviews found"
                body="Try adjusting your search or filters."
              />
            )}

            {reviewRows.length > 0 && (
              <div className="mt-4 flex flex-col gap-3 border-t border-border/50 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{startIndex + 1}</span> to{" "}
                  <span className="font-semibold text-foreground">
                    {Math.min(startIndex + ITEMS_PER_PAGE, reviewRows.length)}
                  </span>{" "}
                  of <span className="font-semibold text-foreground">{reviewRows.length}</span>{" "}
                  reviews
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex h-9 items-center justify-center rounded-lg bg-surface px-3 text-sm font-semibold shadow-[var(--shadow-soft)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:bg-accent-soft/30"
                  >
                    ← Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((page) => {
                        const diff = Math.abs(page - currentPage);
                        return diff === 0 || diff === 1 || page === 1 || page === totalPages;
                      })
                      .reduce<(number | null)[]>((acc, page) => {
                        const lastItem = acc[acc.length - 1];
                        if (lastItem !== undefined && lastItem !== null && page - lastItem > 1) {
                          acc.push(null);
                        }
                        acc.push(page);
                        return acc;
                      }, [])
                      .map((page, idx) =>
                        page === null ? (
                          <span key={`dots-${idx}`} className="px-1 text-muted-foreground">
                            •••
                          </span>
                        ) : (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                              currentPage === page
                                ? "bg-primary text-primary-foreground"
                                : "bg-surface shadow-[var(--shadow-soft)] hover:bg-accent-soft/30"
                            }`}
                          >
                            {page}
                          </button>
                        ),
                      )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="inline-flex h-9 items-center justify-center rounded-lg bg-surface px-3 text-sm font-semibold shadow-[var(--shadow-soft)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:bg-accent-soft/30"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </AdminPanel>

          <div className="space-y-4">
            <AdminPanel title="Moderation details">
              {!selectedReview ? (
                <AdminEmptyState
                  title="Select a review"
                  body="Choose a review from the queue to see full details and take moderation action."
                />
              ) : (
                <div className="space-y-4">
                  <div className="rounded-[16px] border border-border/50 bg-card p-4 shadow-[var(--shadow-soft)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">
                          {selectedReview.title}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {selectedReview.author} •{" "}
                          {selectedReview.kind === "product" ? "Product" : "Store"}
                        </p>
                      </div>
                      <ModerationPill status={selectedReview.moderationStatus} />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-foreground/80">
                      {selectedReview.body}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <AdminPill>{formatRating(selectedReview.rating)} / 5</AdminPill>
                      {selectedReview.reportedCount > 0 && (
                        <AdminPill tone="danger">
                          <AlertTriangle className="h-3 w-3" />
                          {selectedReview.reportedCount}{" "}
                          {selectedReview.reportedCount === 1 ? "report" : "reports"}
                        </AdminPill>
                      )}
                    </div>
                  </div>

                  <div className="rounded-[16px] border border-border/50 bg-card p-4 shadow-[var(--shadow-soft)]">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Metadata
                    </div>
                    <div className="mt-3 space-y-2 text-sm">
                      <AdminKeyValue
                        label="Review type"
                        value={
                          selectedReview.kind === "product" ? "Product review" : "Store review"
                        }
                      />
                      <AdminKeyValue label="Entity" value={selectedReview.entityName} />
                      <AdminKeyValue
                        label="Current status"
                        value={selectedReview.moderationStatus}
                      />
                      <AdminKeyValue
                        label="Last moderated"
                        value={
                          selectedReview.moderatedAt
                            ? new Date(selectedReview.moderatedAt).toLocaleString()
                            : "Not moderated yet"
                        }
                      />
                    </div>
                  </div>

                  <div className="rounded-[16px] border border-border/50 bg-card p-4 shadow-[var(--shadow-soft)]">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Moderator note
                    </div>
                    <textarea
                      value={moderatorNote}
                      onChange={(event) => setModeratorNote(event.target.value)}
                      placeholder="Add notes for future reference..."
                      className="mt-2.5 min-h-24 w-full rounded-xl bg-surface px-3 py-2 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                    />
                  </div>

                  <div className="grid gap-2">
                    {(["APPROVED", "FLAGGED", "REJECTED"] as ReviewModerationStatus[]).map(
                      (status) => {
                        const isApproved = status === "APPROVED";
                        const isFlagged = status === "FLAGGED";
                        const isRejected = status === "REJECTED";
                        return (
                          <button
                            key={status}
                            type="button"
                            onClick={() => {
                              try {
                                moderateReviewRecord({
                                  kind: selectedReview.kind,
                                  reviewId: selectedReview.id,
                                  status,
                                  moderatorNote: moderatorNote,
                                });
                                toast.success(`Review marked as ${status.toLowerCase()}.`);
                                setSelectedReviewId("");
                              } catch (error) {
                                toast.error(
                                  error instanceof Error
                                    ? error.message
                                    : "Unable to moderate review.",
                                );
                              }
                            }}
                            className={`h-10 w-full rounded-xl px-4 text-sm font-semibold shadow-[var(--shadow-soft)] transition-colors ${
                              isApproved
                                ? "bg-green-500/20 text-green-700 hover:bg-green-500/30"
                                : isFlagged
                                  ? "bg-yellow-500/20 text-yellow-700 hover:bg-yellow-500/30"
                                  : isRejected
                                    ? "bg-red-500/20 text-red-700 hover:bg-red-500/30"
                                    : ""
                            }`}
                          >
                            Mark as {status.toLowerCase()}
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>
              )}
            </AdminPanel>
          </div>
        </section>
      </div>
    </AdminScopeGate>
  );
}

function ModerationPill({ status }: { status: ReviewModerationStatus }) {
  const tone =
    status === "APPROVED"
      ? "success"
      : status === "FLAGGED" || status === "REJECTED"
        ? "danger"
        : "warning";
  return <AdminPill tone={tone}>{status}</AdminPill>;
}
