"use client";

import { useQuery } from "@tanstack/react-query";
import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import { settingsService } from "@/services/settingsService";
import { FiMail, FiPhone, FiMapPin, FiClock, FiMessageSquare } from "react-icons/fi";

export default function ContactPage() {
  const { data: generalSettings } = useQuery({
    queryKey: ["generalSettings"],
    queryFn: () => settingsService.getGeneralSettings(),
  });

  return (
    <PageShell>
      <PageHeader
        title="Liên hệ"
        description="Chúng tôi luôn sẵn sàng hỗ trợ bạn. Hãy liên hệ với chúng tôi qua các kênh sau:"
        breadcrumbs={[
          { label: "Trang chủ", href: "/" },
          { label: "Liên hệ" },
        ]}
      />
      <main className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FiMapPin className="w-5 h-5 text-primary-600" />
                Địa chỉ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-secondary-600">
                {generalSettings?.address || "Đang cập nhật"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FiPhone className="w-5 h-5 text-primary-600" />
                Điện thoại
              </CardTitle>
            </CardHeader>
            <CardContent>
              <a 
                href={`tel:${generalSettings?.contactPhone || ""}`}
                className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
              >
                {generalSettings?.contactPhone || "Đang cập nhật"}
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FiMail className="w-5 h-5 text-primary-600" />
                Email
              </CardTitle>
            </CardHeader>
            <CardContent>
              <a 
                href={`mailto:${generalSettings?.contactEmail || ""}`}
                className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
              >
                {generalSettings?.contactEmail || "Đang cập nhật"}
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FiClock className="w-5 h-5 text-primary-600" />
                Giờ làm việc
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-secondary-600">
                Thứ 2 - Chủ nhật: 8:00 - 22:00
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Hỗ trợ khách hàng</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-secondary-600 mb-4">
              Đội ngũ hỗ trợ của chúng tôi sẵn sàng phục vụ bạn từ 8:00 đến 22:00 hàng ngày.
              Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi qua email hoặc điện thoại.
            </p>
            <div className="space-y-2 text-sm text-secondary-600">
              <p>• Hỗ trợ đặt hàng và thanh toán</p>
              <p>• Tư vấn sản phẩm</p>
              <p>• Xử lý khiếu nại và đổi trả</p>
              <p>• Hỗ trợ kỹ thuật</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Gửi yêu cầu hỗ trợ</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                }}
                className="space-y-4"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="Họ và tên" placeholder="Nguyễn Văn A" required />
                  <Input label="Số điện thoại" placeholder="09xx xxx xxx" required />
                </div>
                <Input label="Email" type="email" placeholder="ban@email.com" required />
                <Input label="Chủ đề" placeholder="Yêu cầu hỗ trợ đơn hàng" />
                <Textarea
                  label="Nội dung"
                  placeholder="Hãy mô tả chi tiết vấn đề bạn gặp phải..."
                  rows={5}
                  required
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-secondary-500">
                    Chúng tôi sẽ phản hồi trong vòng 24 giờ làm việc.
                  </p>
                  <Button type="submit" variant="primary" className="sm:min-w-[180px]">
                    Gửi yêu cầu
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Kênh hỗ trợ nhanh</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-secondary-600">
                <div className="flex items-start gap-3">
                  <span className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                    <FiMessageSquare className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold text-secondary-900">Chat trực tuyến</p>
                    <p>Phản hồi nhanh trong giờ làm việc.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                    <FiPhone className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold text-secondary-900">Hotline ưu tiên</p>
                    <p>{generalSettings?.contactPhone || "0900 000 000"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                    <FiMail className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold text-secondary-900">Email hỗ trợ</p>
                    <p>{generalSettings?.contactEmail || "support@furnimart.vn"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                    <FiClock className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold text-secondary-900">Khung giờ hỗ trợ</p>
                    <p>Thứ 2 - Chủ nhật, 8:00 - 22:00</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lưu ý khi liên hệ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-secondary-600">
                <p>• Chuẩn bị mã đơn hàng (nếu có) để được hỗ trợ nhanh hơn.</p>
                <p>• Ưu tiên mô tả chi tiết để đội ngũ xử lý chính xác.</p>
                <p>• Với yêu cầu bảo hành, vui lòng đính kèm hình ảnh sản phẩm.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </PageShell>
  );
}

