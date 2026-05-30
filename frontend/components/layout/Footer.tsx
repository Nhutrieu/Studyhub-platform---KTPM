"use client";

import Link from "next/link";
import PageShell from "@/components/layouts/PageShell";
import { useQuery } from "@tanstack/react-query";
import { settingsService } from "@/services/settingsService";
import { FiFacebook, FiInstagram, FiYoutube, FiMail, FiPhone, FiMapPin } from "react-icons/fi";

export default function Footer() {
  const { data: generalSettings } = useQuery({
    queryKey: ["generalSettings"],
    queryFn: () => settingsService.getGeneralSettings(),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <footer className="bg-gradient-to-br from-secondary-900 via-secondary-950 to-secondary-900 text-white mt-auto w-full max-w-full overflow-x-hidden border-t border-secondary-800/50">
      <PageShell className="py-16 md:py-20 w-full max-w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 md:gap-8 w-full max-w-full">
          {/* Company Info */}
          <div>
            <h3 className="text-white text-xl font-bold mb-4 tracking-tight">
              {generalSettings?.siteName || "FurniMart"}
            </h3>
            <p className="text-sm text-white/90 leading-relaxed mb-6 font-medium">
              {generalSettings?.siteDescription || "Hệ thống mua sắm nội thất đa chi nhánh tại TP.HCM"}
            </p>
            {/* Social Media Links */}
            <div className="flex gap-4 mt-6">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 hover:text-white hover:bg-white/15 p-2 rounded-lg transition-all duration-300"
                aria-label="Facebook"
              >
                <FiFacebook className="w-5 h-5" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 hover:text-white hover:bg-white/15 p-2 rounded-lg transition-all duration-300"
                aria-label="Instagram"
              >
                <FiInstagram className="w-5 h-5" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 hover:text-white hover:bg-white/15 p-2 rounded-lg transition-all duration-300"
                aria-label="YouTube"
              >
                <FiYoutube className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Thông tin */}
          <div>
            <h4 className="text-white font-semibold mb-5 text-sm tracking-wider uppercase">THÔNG TIN</h4>
            <ul className="space-y-3.5 text-sm">
              <li>
                <Link href="/about" className="text-white/85 hover:text-white transition-all duration-300 inline-block hover:translate-x-1 font-medium">
                  Về FurniMart
                </Link>
              </li>
              <li>
                <Link href="/policy" className="text-white/85 hover:text-white transition-all duration-300 inline-block hover:translate-x-1 font-medium">
                  Chính sách bảo mật
                </Link>
              </li>
              <li>
                <Link href="/policy" className="text-white/85 hover:text-white transition-all duration-300 inline-block hover:translate-x-1 font-medium">
                  Điều khoản sử dụng
                </Link>
              </li>
              <li>
                <Link href="/policy" className="text-white/85 hover:text-white transition-all duration-300 inline-block hover:translate-x-1 font-medium">
                  Chính sách đổi trả
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-white/85 hover:text-white transition-all duration-300 inline-block hover:translate-x-1 font-medium">
                  Câu hỏi thường gặp
                </Link>
              </li>
            </ul>
          </div>

          {/* Sản phẩm */}
          <div>
            <h4 className="text-white font-semibold mb-5 text-sm tracking-wider uppercase">SẢN PHẨM</h4>
            <ul className="space-y-3.5 text-sm">
              <li>
                <Link href="/products" className="text-white/85 hover:text-white transition-all duration-300 inline-block hover:translate-x-1 font-medium">
                  Tất cả sản phẩm
                </Link>
              </li>
              <li>
                <Link href="/categories" className="text-white/85 hover:text-white transition-all duration-300 inline-block hover:translate-x-1 font-medium">
                  Danh mục
                </Link>
              </li>
              <li>
                <Link href="/promotions" className="text-white/85 hover:text-white transition-all duration-300 inline-block hover:translate-x-1 font-medium">
                  Khuyến mãi
                </Link>
              </li>
              <li>
                <Link href="/branches" className="text-white/85 hover:text-white transition-all duration-300 inline-block hover:translate-x-1 font-medium">
                  Chi nhánh
                </Link>
              </li>
            </ul>
          </div>

          {/* Thông tin liên hệ */}
          <div>
            <h4 className="text-white font-semibold mb-5 text-sm tracking-wider uppercase">Thông tin liên hệ</h4>
            <ul className="space-y-3.5 text-sm">
              {generalSettings?.address && (
                <li className="flex items-start gap-3 text-white/85">
                  <FiMapPin className="w-5 h-5 flex-shrink-0 mt-0.5 text-primary-300" />
                  <span className="hover:text-white transition-colors duration-300 font-medium">{generalSettings.address}</span>
                </li>
              )}
              {generalSettings?.contactPhone && (
                <li className="flex items-center gap-3 text-white/85">
                  <FiPhone className="w-5 h-5 flex-shrink-0 text-primary-300" />
                  <a href={`tel:${generalSettings.contactPhone}`} className="hover:text-white transition-colors duration-300 font-medium">
                    {generalSettings.contactPhone}
                  </a>
                </li>
              )}
              {generalSettings?.contactEmail && (
                <li className="flex items-center gap-3 text-white/85">
                  <FiMail className="w-5 h-5 flex-shrink-0 text-primary-300" />
                  <a href={`mailto:${generalSettings.contactEmail}`} className="hover:text-white transition-colors duration-300 font-medium">
                    {generalSettings.contactEmail}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-white/10 text-center text-sm text-white/70">
          <p>&copy; {new Date().getFullYear()} {generalSettings?.siteName || "FurniMart"}. All rights reserved.</p>
        </div>
      </PageShell>
    </footer>
  );
}

