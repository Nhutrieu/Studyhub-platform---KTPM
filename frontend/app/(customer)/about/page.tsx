"use client";

import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { textPresets, sectionSpacing } from "@/lib/design-system";
import { FiAward, FiUsers, FiTruck, FiShield } from "react-icons/fi";

const highlights = [
  {
    title: "Hệ thống đa chi nhánh",
    description: "Đồng bộ tồn kho và giao hàng linh hoạt trên toàn quốc.",
    metric: "32+",
    metricLabel: "chi nhánh",
    icon: FiUsers,
  },
  {
    title: "Sản phẩm chọn lọc",
    description: "Tuyển chọn từ các thương hiệu nội thất hàng đầu.",
    metric: "8.000+",
    metricLabel: "sản phẩm",
    icon: FiAward,
  },
  {
    title: "Giao hàng tối ưu",
    description: "Theo dõi hành trình và giao nhanh trong 24-48h.",
    metric: "24-48h",
    metricLabel: "giao nhanh",
    icon: FiTruck,
  },
  {
    title: "Bảo hành minh bạch",
    description: "Chính sách rõ ràng, hỗ trợ đổi trả linh hoạt.",
    metric: "7 ngày",
    metricLabel: "đổi trả",
    icon: FiShield,
  },
];

const values = [
  {
    title: "Tận tâm",
    description: "Lắng nghe nhu cầu và tư vấn phù hợp với từng phong cách sống.",
  },
  {
    title: "Chất lượng",
    description: "Cam kết vật liệu chuẩn, quy trình kiểm định nghiêm ngặt.",
  },
  {
    title: "Đổi mới",
    description: "Cập nhật xu hướng thiết kế hiện đại và công nghệ mua sắm tiện lợi.",
  },
  {
    title: "Minh bạch",
    description: "Thông tin giá cả, tồn kho và giao hàng rõ ràng, dễ theo dõi.",
  },
];

export default function AboutPage() {
  return (
    <PageShell>
      <PageHeader
        title="Về FurniMart"
        breadcrumbs={[
          { label: "Trang chủ", href: "/" },
          { label: "Về FurniMart" },
        ]}
      />
      <main className={sectionSpacing.md}>
        <div className="space-y-10">
          <Card className="overflow-hidden border border-secondary-200 bg-gradient-to-br from-primary-50 via-white to-white">
            <CardContent className="p-8">
              <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                <div>
                  <h2 className={`${textPresets.heading2} mb-4`}>Giới thiệu về FurniMart</h2>
                  <p className={`${textPresets.body} mb-6`}>
                    FurniMart là hệ thống thương mại điện tử nội thất đa chi nhánh, mang đến
                    trải nghiệm mua sắm liền mạch từ cảm hứng thiết kế đến giao hàng tận nhà.
                    Chúng tôi đầu tư vào chất lượng sản phẩm, dịch vụ hậu mãi và nền tảng công
                    nghệ để mọi gia đình dễ dàng tạo dựng không gian sống mơ ước.
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-md bg-white/80 p-4 shadow-soft">
                      <p className="text-sm text-secondary-500">Tầm nhìn</p>
                      <p className="mt-2 font-medium text-secondary-900">
                        Trở thành thương hiệu nội thất dẫn đầu về trải nghiệm mua sắm hiện đại.
                      </p>
                    </div>
                    <div className="rounded-md bg-white/80 p-4 shadow-soft">
                      <p className="text-sm text-secondary-500">Sứ mệnh</p>
                      <p className="mt-2 font-medium text-secondary-900">
                        Kết nối sản phẩm chất lượng với dịch vụ tận tâm cho mọi gia đình Việt.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-4">
                  {highlights.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.title}
                        className="rounded-md border border-secondary-200 bg-white p-4 shadow-soft"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                            <Icon className="h-5 w-5" />
                          </span>
                          <div>
                            <p className="text-xs uppercase tracking-widest text-secondary-400">
                              {item.metricLabel}
                            </p>
                            <p className="text-xl font-semibold text-secondary-900">{item.metric}</p>
                          </div>
                        </div>
                        <p className="mt-3 font-medium text-secondary-900">{item.title}</p>
                        <p className="mt-1 text-sm text-secondary-600">{item.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Giá trị cốt lõi</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`${textPresets.body} text-secondary-600`}>
                  Chúng tôi xây dựng thương hiệu dựa trên sự tin cậy, thấu hiểu khách hàng và
                  cam kết chất lượng xuyên suốt hành trình mua sắm.
                </p>
              </CardContent>
            </Card>
            <div className="grid gap-4 sm:grid-cols-2">
              {values.map((value) => (
                <Card key={value.title} hoverable>
                  <CardContent className="p-6">
                    <p className="text-lg font-semibold text-secondary-900">{value.title}</p>
                    <p className="mt-2 text-sm text-secondary-600">{value.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>
    </PageShell>
  );
}
