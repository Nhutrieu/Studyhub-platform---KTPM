"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reviewService } from "@/services/reviewService";
import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Badge from "@/components/ui/Badge";
import { FiStar, FiEdit, FiTrash2, FiPackage } from "react-icons/fi";
import { toast } from "react-toastify";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import Link from "next/link";
import { Review } from "@/lib/types";
import { routes } from "@/lib/config/routes";

export default function ReviewsPage() {
  const queryClient = useQueryClient();

  const { data: reviews, isLoading, isError, refetch } = useQuery({
    queryKey: ["reviews", "my"],
    queryFn: () => reviewService.getMyReviews(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reviewService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      toast.success("Đã xóa đánh giá");
    },
    onError: () => {
      toast.error("Không thể xóa đánh giá");
    },
  });

  if (isLoading) {
    return (
      <PageShell>
        <PageHeader title="Đánh giá của tôi" breadcrumbs={[{ label: "Tài khoản", href: "/account" }, { label: "Đánh giá" }]} />
        <div className="text-center py-12 text-secondary-500">Đang tải...</div>
      </PageShell>
    );
  }

  if (isError) {
    return (
      <PageShell>
        <PageHeader title="Đánh giá của tôi" breadcrumbs={[{ label: "Tài khoản", href: "/account" }, { label: "Đánh giá" }]} />
        <ErrorState title="Không thể tải đánh giá" description="Vui lòng thử lại sau" action={{ label: "Thử lại", onClick: () => refetch() }} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Đánh giá của tôi"
        breadcrumbs={[
          { label: "Tài khoản", href: "/account" },
          { label: "Đánh giá" },
        ]}
      />
      <main className="space-y-6 pb-12">
        {!reviews || reviews.length === 0 ? (
          <EmptyState
            icon={<FiStar className="w-16 h-16 text-secondary-300" />}
            title="Chưa có đánh giá nào"
            description="Bạn chưa đánh giá sản phẩm nào"
          />
        ) : (
          <div className="space-y-4">
            {reviews.map((review: Review) => (
              <Card key={review.id} variant="outline">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Link href={`/products/${review.productId}`} className="flex items-center gap-2 text-primary-600 hover:text-primary-700">
                          <FiPackage className="w-4 h-4" />
                          <span className="font-medium">Xem sản phẩm</span>
                        </Link>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <FiStar
                            key={i}
                            className={`w-5 h-5 ${
                              i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-secondary-300"
                            }`}
                          />
                        ))}
                        <span className="text-sm text-secondary-500 ml-2">
                          {formatDistanceToNow(new Date(review.createdAt), {
                            addSuffix: true,
                            locale: vi,
                          })}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-secondary-700 mb-3">{review.comment}</p>
                      )}
                      {review.images && review.images.length > 0 && (
                        <div className="flex gap-2 mt-3">
                          {review.images.map((img: string, idx: number) => (
                            <img
                              key={idx}
                              src={img}
                              alt={`Review image ${idx + 1}`}
                              className="w-20 h-20 object-cover rounded"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMutation.mutate(review.id)}
                        isLoading={deleteMutation.isPending}
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </PageShell>
  );
}

