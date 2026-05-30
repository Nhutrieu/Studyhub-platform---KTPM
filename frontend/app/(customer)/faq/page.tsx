"use client";

import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { FiHelpCircle, FiShoppingBag, FiCreditCard, FiTruck } from "react-icons/fi";

const faqItems = [
  {
    title: "Làm thế nào để đặt hàng?",
    description:
      "Bạn có thể duyệt sản phẩm, thêm vào giỏ hàng và tiến hành thanh toán. Hệ thống sẽ xác nhận qua email hoặc SMS.",
    icon: FiShoppingBag,
  },
  {
    title: "Tôi có thể xem sản phẩm tại chi nhánh không?",
    description:
      "Có, bạn có thể xem tồn kho và địa chỉ các chi nhánh trên trang web. Vui lòng liên hệ trực tiếp để giữ hàng.",
    icon: FiHelpCircle,
  },
  {
    title: "Phương thức thanh toán nào được chấp nhận?",
    description:
      "Chúng tôi hỗ trợ COD, thẻ ngân hàng, VNPay, MoMo và các ví điện tử phổ biến khác.",
    icon: FiCreditCard,
  },
  {
    title: "Thời gian giao hàng là bao lâu?",
    description:
      "Thời gian giao hàng phụ thuộc vào địa chỉ và tồn kho. Bạn sẽ nhận được lịch giao chi tiết sau khi đặt hàng.",
    icon: FiTruck,
  },
];

export default function FAQPage() {
  return (
    <PageShell>
      <PageHeader
        title="Câu hỏi thường gặp"
        description="Tổng hợp những thông tin quan trọng để bạn mua sắm nhanh chóng và dễ dàng hơn."
        breadcrumbs={[
          { label: "Trang chủ", href: "/" },
          { label: "FAQ" },
        ]}
      />
      <main className="space-y-8">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Hướng dẫn nhanh</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {["Chọn sản phẩm", "Xác nhận thanh toán", "Theo dõi giao hàng"].map((step, index) => (
                <div
                  key={step}
                  className="flex items-center gap-3 rounded-md border border-secondary-200 bg-white p-4"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600 font-semibold">
                    0{index + 1}
                  </span>
                  <p className="text-sm font-medium text-secondary-900">{step}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {faqItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} hoverable>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary-100 text-secondary-700">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold text-secondary-900">{item.title}</h3>
                      <p className="mt-2 text-sm text-secondary-600">{item.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </PageShell>
  );
}

