import Link from "next/link";
import { FiHome, FiSearch } from "react-icons/fi";
import Button from "@/components/ui/Button";

export default function NotFound() {
    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center">
            <h1 className="text-9xl font-bold text-secondary-100 mb-4">404</h1>
            <h2 className="text-3xl font-semibold text-secondary-900 mb-4">Trang không tồn tại</h2>
            <p className="text-secondary-500 max-w-md mb-8">
                Xin lỗi, trang bạn đang tìm kiếm có thể đã bị xóa, chuyển hướng hoặc tạm thời không khả dụng.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/">
                    <Button variant="primary" size="lg" className="flex items-center gap-2">
                        <FiHome className="w-5 h-5" />
                        Trang chủ
                    </Button>
                </Link>
                <Link href="/products">
                    <Button variant="outline" size="lg" className="flex items-center gap-2">
                        <FiSearch className="w-5 h-5" />
                        Xem sản phẩm
                    </Button>
                </Link>
            </div>
        </div>
    );
}
