import Link from "next/link";
import Image from "next/image";
import Logo from "@/components/common/Logo";
import { cn } from "@/lib/utils";

const AUTH_BG_IMAGE =
    "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?q=80&w=2000&auto=format&fit=crop";

interface AuthLayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle: string;
    className?: string;
}

export default function AuthLayout({ children, title, subtitle, className }: AuthLayoutProps) {
    return (
        <div className="min-h-screen w-full flex bg-gradient-to-br from-secondary-50 via-white to-primary-50">
            {/* Left Column - Image & Branding (Desktop Only) */}
            <div className="hidden lg:flex w-1/2 relative overflow-hidden">
                <Image
                    src={AUTH_BG_IMAGE}
                    alt="FurniMart Interior"
                    fill
                    className="object-cover blur-[1.5px] opacity-95 scale-105"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-br from-secondary-900/80 via-secondary-900/50 to-secondary-900/20" />
                <div className="absolute inset-0 flex flex-col justify-center items-center text-white p-12 text-center z-10">
                    <div className="pointer-events-none">
                        <Logo size="lg" />
                    </div>
                    <h2 className="text-4xl font-bold tracking-tight mt-6 drop-shadow-md">
                        Không gian sống tinh tế
                    </h2>
                    <p className="text-lg font-medium tracking-wide drop-shadow-md opacity-95 mt-3 max-w-md">
                        Đăng nhập để khám phá hàng nghìn sản phẩm nội thất, ưu đãi thành viên & dịch vụ hậu mãi chuẩn mực.
                    </p>
                    <ul className="mt-8 space-y-3 text-left text-base font-medium text-white/90">
                        <li className="flex items-center gap-3">
                            <span className="h-2.5 w-2.5 rounded-full bg-primary-300 shadow-sm" />
                            Miễn phí tư vấn thiết kế nội thất
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="h-2.5 w-2.5 rounded-full bg-primary-300 shadow-sm" />
                            Giao hàng nhanh tại 63 tỉnh thành
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="h-2.5 w-2.5 rounded-full bg-primary-300 shadow-sm" />
                            Bảo hành minh bạch, hỗ trợ 24/7
                        </li>
                    </ul>
                </div>
            </div>

            {/* Right Column - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 lg:p-12">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center lg:text-left">
                        <Link href="/" className="inline-block mb-3 lg:hidden">
                            <Logo size="md" />
                        </Link>
                        <span className="inline-flex items-center gap-2 rounded-full bg-primary-50 text-primary-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em]">
                            Bảo mật chuẩn SSL
                        </span>
                        <h1 className="text-3xl font-bold text-secondary-900 tracking-tight">
                            {title}
                        </h1>
                        <p className="text-secondary-500 mt-2 text-sm sm:text-base">
                            {subtitle}
                        </p>
                    </div>

                    <div
                        className={cn(
                            "bg-white/90 backdrop-blur rounded-2xl lg:p-5 border border-white/60 shadow-xl shadow-secondary-900/5",
                            className
                        )}
                    >
                        {children}
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center text-xs text-secondary-500">
                        <div className="rounded-xl border border-secondary-100 bg-white/70 px-3 py-2">
                            <p className="text-lg font-semibold text-secondary-900">4.9★</p>
                            <p>Đánh giá khách hàng</p>
                        </div>
                        <div className="rounded-xl border border-secondary-100 bg-white/70 px-3 py-2">
                            <p className="text-lg font-semibold text-secondary-900">15K+</p>
                            <p>Đơn hàng tháng</p>
                        </div>
                        <div className="rounded-xl border border-secondary-100 bg-white/70 px-3 py-2">
                            <p className="text-lg font-semibold text-secondary-900">100%</p>
                            <p>Hỗ trợ tận tâm</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
