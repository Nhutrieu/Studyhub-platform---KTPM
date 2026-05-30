"use client";

import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Section from "@/components/ui/Section";
import Heading from "@/components/ui/Heading";
import { 
  FiRefreshCw, 
  FiTruck, 
  FiShield, 
  FiCreditCard, 
  FiCheckCircle,
  FiClock,
  FiPackage,
  FiHeadphones,
  FiMail,
  FiPhone,
  FiMapPin
} from "react-icons/fi";

const policyItems = [
  {
    title: "Chính sách đổi trả",
    description:
      "Đổi trả trong 7 ngày nếu sản phẩm còn nguyên vẹn, chưa qua sử dụng và đầy đủ phụ kiện.",
    highlights: [
      "Đặt lịch đổi trả online",
      "Hỗ trợ thu hồi tận nhà",
      "Theo dõi tiến trình 24/7",
      "Hoàn tiền trong 3-5 ngày làm việc"
    ],
    icon: FiRefreshCw,
    color: "primary",
    details: [
      {
        title: "Điều kiện đổi trả",
        items: [
          "Sản phẩm còn nguyên vẹn, chưa qua sử dụng",
          "Còn đầy đủ phụ kiện, hộp đựng và tem nhãn",
          "Có hóa đơn mua hàng hoặc mã đơn hàng",
          "Thời gian đổi trả: 7 ngày kể từ ngày nhận hàng"
        ]
      },
      {
        title: "Quy trình đổi trả",
        items: [
          "Đăng nhập tài khoản và vào mục 'Đơn hàng của tôi'",
          "Chọn đơn hàng cần đổi trả và điền lý do",
          "Nhân viên sẽ liên hệ xác nhận trong 24h",
          "Nhận hàng thu hồi và hoàn tiền tự động"
        ]
      }
    ]
  },
  {
    title: "Chính sách vận chuyển",
    description:
      "Phí vận chuyển tối ưu theo khoảng cách và kích thước. Miễn phí nội thành cho đơn từ 500.000đ.",
    highlights: [
      "Giao nhanh 24-48h",
      "Hẹn giờ giao linh hoạt",
      "Có nhân viên lắp đặt",
      "Theo dõi đơn hàng real-time"
    ],
    icon: FiTruck,
    color: "emerald",
    details: [
      {
        title: "Phí vận chuyển",
        items: [
          "Miễn phí vận chuyển cho đơn hàng từ 500.000đ (nội thành)",
          "Phí vận chuyển liên tỉnh: 30.000đ - 150.000đ tùy khu vực",
          "Phí lắp đặt: 200.000đ - 500.000đ (tùy sản phẩm)",
          "Giao hàng nhanh 24h: +50.000đ"
        ]
      },
      {
        title: "Thời gian giao hàng",
        items: [
          "Nội thành: 24-48 giờ",
          "Liên tỉnh: 3-5 ngày làm việc",
          "Vùng sâu vùng xa: 5-7 ngày làm việc",
          "Có thể hẹn giờ giao hàng theo yêu cầu"
        ]
      }
    ]
  },
  {
    title: "Chính sách bảo hành",
    description:
      "Sản phẩm được bảo hành chính hãng. Hệ thống nhắc lịch bảo dưỡng định kỳ.",
    highlights: [
      "Bảo hành điện tử",
      "Hỗ trợ kỹ thuật tận nơi",
      "Linh kiện thay thế chính hãng",
      "Bảo hành từ 12-24 tháng"
    ],
    icon: FiShield,
    color: "blue",
    details: [
      {
        title: "Thời gian bảo hành",
        items: [
          "Nội thất gỗ: 24 tháng",
          "Nội thất kim loại: 18 tháng",
          "Đồ trang trí: 12 tháng",
          "Phụ kiện: 6 tháng"
        ]
      },
      {
        title: "Dịch vụ bảo hành",
        items: [
          "Bảo hành miễn phí trong thời hạn",
          "Hỗ trợ kỹ thuật tận nơi (nội thành)",
          "Thay thế linh kiện chính hãng",
          "Nhắc lịch bảo dưỡng định kỳ qua email/SMS"
        ]
      }
    ]
  },
  {
    title: "Chính sách thanh toán",
    description:
      "Hỗ trợ COD, thẻ ngân hàng, chuyển khoản và các ví điện tử phổ biến.",
    highlights: [
      "Bảo mật 3D Secure",
      "Trả góp linh hoạt",
      "Thông báo giao dịch tức thì",
      "Hỗ trợ đa phương thức"
    ],
    icon: FiCreditCard,
    color: "purple",
    details: [
      {
        title: "Phương thức thanh toán",
        items: [
          "Thanh toán khi nhận hàng (COD)",
          "Thẻ tín dụng/ghi nợ (Visa, Mastercard)",
          "Chuyển khoản ngân hàng",
          "Ví điện tử (MoMo, ZaloPay, VNPay)"
        ]
      },
      {
        title: "Bảo mật thanh toán",
        items: [
          "Mã hóa SSL 256-bit",
          "Xác thực 3D Secure",
          "Không lưu trữ thông tin thẻ",
          "Tuân thủ chuẩn PCI DSS"
        ]
      }
    ]
  },
];

const supportContacts = [
  {
    icon: FiHeadphones,
    title: "Hotline",
    content: "1900 1234",
    description: "Hỗ trợ 24/7",
    bgColor: "bg-primary-50",
    borderColor: "border-primary-200",
    iconColor: "text-primary-600"
  },
  {
    icon: FiMail,
    title: "Email",
    content: "support@furnimart.com",
    description: "Phản hồi trong 24h",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    iconColor: "text-emerald-600"
  },
  {
    icon: FiMapPin,
    title: "Văn phòng",
    content: "123 Đường ABC, Quận XYZ",
    description: "TP. Hồ Chí Minh",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    iconColor: "text-blue-600"
  }
];

export default function PolicyPage() {
  return (
    <PageShell>
      <PageHeader
        title="Chính sách"
        description="Minh bạch trong mọi trải nghiệm mua sắm của bạn tại FurniMart."
        breadcrumbs={[
          { label: "Trang chủ", href: "/" },
          { label: "Chính sách" },
        ]}
      />
      
      <main className="space-y-12">
        {/* Hero Section */}
        <Section>
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-8 md:p-12 text-white">
            <div className="max-w-3xl">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Cam kết phục vụ khách hàng
              </h2>
              <p className="text-lg text-primary-50 leading-relaxed">
                FurniMart áp dụng các tiêu chuẩn dịch vụ thống nhất trên toàn hệ thống, 
                đảm bảo quyền lợi rõ ràng và hỗ trợ kịp thời trong suốt hành trình mua sắm của bạn.
              </p>
              <div className="mt-6 flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <FiCheckCircle className="w-5 h-5" />
                  <span>Đổi trả miễn phí 7 ngày</span>
                </div>
                <div className="flex items-center gap-2">
                  <FiCheckCircle className="w-5 h-5" />
                  <span>Giao hàng nhanh 24-48h</span>
                </div>
                <div className="flex items-center gap-2">
                  <FiCheckCircle className="w-5 h-5" />
                  <span>Bảo hành chính hãng</span>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Policy Cards */}
        <Section>
          <Heading level={2} className="mb-8">
            Chính sách chi tiết
          </Heading>
          <div className="grid gap-8 lg:grid-cols-2">
            {policyItems.map((item) => {
              const Icon = item.icon;
              const colorClasses = {
                primary: "bg-primary-100 text-primary-600",
                emerald: "bg-emerald-100 text-emerald-600",
                blue: "bg-blue-100 text-blue-600",
                purple: "bg-purple-100 text-purple-600",
              };
              
              return (
                <Card key={item.title} hoverable className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className={`p-6 ${colorClasses[item.color as keyof typeof colorClasses]}`}>
                      <div className="flex items-start gap-4">
                        <span className={`flex h-14 w-14 items-center justify-center rounded-xl ${colorClasses[item.color as keyof typeof colorClasses]}`}>
                          <Icon className="h-7 w-7" />
                        </span>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-secondary-900 mb-2">{item.title}</h3>
                          <p className="text-sm text-secondary-700 leading-relaxed">{item.description}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6 space-y-6">
                      <div>
                        <h4 className="text-sm font-semibold text-secondary-900 mb-3 flex items-center gap-2">
                          <FiPackage className="w-4 h-4" />
                          Điểm nổi bật
                        </h4>
                        <div className="grid gap-2">
                          {item.highlights.map((highlight) => (
                            <div key={highlight} className="flex items-center gap-2 text-sm text-secondary-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary-500 flex-shrink-0" />
                              <span>{highlight}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {item.details && (
                        <div className="space-y-4 pt-4 border-t border-secondary-200">
                          {item.details.map((detail, idx) => (
                            <div key={idx}>
                              <h5 className="text-sm font-semibold text-secondary-900 mb-2">
                                {detail.title}
                              </h5>
                              <ul className="space-y-1.5">
                                {detail.items.map((detailItem, itemIdx) => (
                                  <li key={itemIdx} className="flex items-start gap-2 text-sm text-secondary-600">
                                    <FiClock className="w-4 h-4 mt-0.5 text-primary-500 flex-shrink-0" />
                                    <span>{detailItem}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </Section>

        {/* Support Section */}
        <Section>
          <Heading level={2} className="mb-8">
            Liên hệ hỗ trợ
          </Heading>
          <div className="grid gap-6 md:grid-cols-3">
            {supportContacts.map((contact) => {
              const Icon = contact.icon;
              
              return (
                <Card key={contact.title} className={`${contact.bgColor} ${contact.borderColor} border-2`}>
                  <CardContent className="p-6 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white mb-4">
                      <Icon className={`w-6 h-6 ${contact.iconColor}`} />
                    </div>
                    <h3 className="font-semibold text-secondary-900 mb-1">{contact.title}</h3>
                    <p className="text-lg font-bold text-secondary-900 mb-1">{contact.content}</p>
                    <p className="text-sm text-secondary-500">{contact.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </Section>

        {/* FAQ Section */}
        <Section>
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Câu hỏi thường gặp</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-secondary-900">
                  Tôi có thể đổi trả sản phẩm sau bao lâu?
                </h4>
                <p className="text-sm text-secondary-600">
                  Bạn có thể đổi trả sản phẩm trong vòng 7 ngày kể từ ngày nhận hàng, 
                  với điều kiện sản phẩm còn nguyên vẹn và đầy đủ phụ kiện.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-secondary-900">
                  Phí vận chuyển được tính như thế nào?
                </h4>
                <p className="text-sm text-secondary-600">
                  Miễn phí vận chuyển cho đơn hàng từ 500.000đ trong nội thành. 
                  Đơn hàng liên tỉnh sẽ được tính phí từ 30.000đ - 150.000đ tùy khu vực.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-secondary-900">
                  Sản phẩm được bảo hành trong bao lâu?
                </h4>
                <p className="text-sm text-secondary-600">
                  Tùy loại sản phẩm, thời gian bảo hành từ 6-24 tháng. 
                  Chi tiết được ghi rõ trong phiếu bảo hành kèm theo sản phẩm.
                </p>
              </div>
            </CardContent>
          </Card>
        </Section>
      </main>
    </PageShell>
  );
}

