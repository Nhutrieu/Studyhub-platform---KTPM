"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import PageShell from "@/components/layouts/PageShell";
import ProductGrid from "@/components/product/ProductGrid";
import { productService } from "@/services/productService";
import { categoryService } from "@/services/categoryService";
import { settingsService } from "@/services/settingsService";
import { reviewService } from "@/services/reviewService";
import ErrorState from "@/components/ui/ErrorState";
import Section from "@/components/ui/Section";
import Heading from "@/components/ui/Heading";
import { normalizeImageUrl } from "@/lib/imageUtils";
import { FiSearch, FiArrowRight, FiStar, FiTruck, FiShield, FiCreditCard, FiHeadphones } from "react-icons/fi";

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  // Data Fetching
  const {
    data: featuredData,
    isLoading: featuredLoading,
    isError: featuredError,
  } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => productService.getFeaturedProducts(8),
  });

  const { data: bestsellingData, isLoading: bestsellingLoading } = useQuery({
    queryKey: ["products", "bestselling"],
    queryFn: () => productService.getProducts({ limit: 4, page: 1 }),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["categories", "home"],
    queryFn: () => categoryService.getCategories(),
  });

  const { data: heroSettings } = useQuery({
    queryKey: ["heroSettings"],
    queryFn: () => settingsService.getHeroSettings(),
  });

  const { data: recentReviews } = useQuery({
    queryKey: ["reviews", "recent"],
    queryFn: async () => {
      const products = featuredData?.items?.slice(0, 3) || [];
      const reviewsPromises = products.map((p) =>
        reviewService.getProductReviews(p.id).catch(() => [])
      );
      const reviewsArrays = await Promise.all(reviewsPromises);
      return reviewsArrays.flat().slice(0, 3);
    },
    enabled: !!featuredData,
  });

  const featuredProducts = featuredData?.items || [];
  const bestsellingProducts = bestsellingData?.items || [];
  const categories = categoriesData?.slice(0, 8) || [];

  // Normalize hero image URL - keep public paths as-is, only normalize API paths
  // Default hero image from Unsplash - Modern furniture/living room
  const defaultHeroImage = "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2158&q=80";
  const heroImageUrlRaw = heroSettings?.imageUrl || defaultHeroImage;
  const heroImageUrl = heroImageUrlRaw.startsWith("/images/") 
    ? heroImageUrlRaw 
    : (normalizeImageUrl(heroImageUrlRaw) || defaultHeroImage);
  const heroButtonText = heroSettings?.buttonText || "Mua Sắm Ngay";
  const heroButtonLink = heroSettings?.buttonLink || "/products";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white font-sans">
      {/* 1. HERO SECTION - Clean & Modern with Excellent Contrast */}
      <section className="relative bg-gradient-to-br from-primary-50 via-white to-secondary-50 overflow-hidden">
        <PageShell className="relative z-10 py-16 md:py-24 lg:py-32">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            {/* Left Content - Text */}
            <div className="space-y-8 text-secondary-900">
              <div className="space-y-4">
                <span className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-sm font-bold text-white shadow-lg">
                  🔥 GIẢM 10%
                </span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-secondary-900">
                  {heroSettings?.title || "Kiến tạo không gian sống đẳng cấp"}
                </h1>
                <p className="text-lg md:text-xl text-secondary-700 font-medium max-w-xl leading-relaxed">
                  {heroSettings?.subtitle ||
                    "Hệ thống thương mại nội thất đa chi nhánh hàng đầu. Trải nghiệm mua sắm 3D, giao hàng nhanh chóng và dịch vụ hậu mãi chuyên nghiệp."}
                </p>
              </div>

              {/* Search Bar - New Feature */}
              <form onSubmit={handleSearch} className="relative max-w-xl">
                <div className="flex items-center bg-white rounded-full shadow-lg border-2 border-secondary-200 focus-within:border-primary-500 transition-all">
                  <FiSearch className="w-5 h-5 text-secondary-400 ml-5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm sofa, bàn ăn, đèn trang trí..."
                    className="flex-1 px-4 py-4 text-secondary-900 placeholder-secondary-400 focus:outline-none"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    className="rounded-full m-2 px-6"
                  >
                    Tìm kiếm
                  </Button>
                </div>
              </form>

              {/* Trust Signals */}
              <div className="flex flex-wrap gap-6 pt-4">
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-xl font-bold text-primary-700">15k+</span>
                  </div>
                  <span className="text-sm font-semibold text-secondary-700">Sản phẩm</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-xl font-bold text-primary-700">50+</span>
                  </div>
                  <span className="text-sm font-semibold text-secondary-700">Chi nhánh</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-xl font-bold text-primary-700">24/7</span>
                  </div>
                  <span className="text-sm font-semibold text-secondary-700">Hỗ trợ</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-2">
                <Link href={heroButtonLink}>
                  <Button size="lg" className="px-8 shadow-lg">
                    {heroButtonText}
                  </Button>
                </Link>
                <Link href="/categories">
                  <Button variant="outline" size="lg" className="px-8">
                    Khám phá danh mục
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right Content - Hero Image */}
            <div className="relative h-[400px] md:h-[500px] lg:h-[600px] rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-secondary-100 to-secondary-200">
              <Image
                src={heroImageUrl}
                alt="FurniMart hero - Modern furniture collection"
                fill
                className="object-cover"
                priority
                unoptimized={heroImageUrl.startsWith("http")}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
          </div>
        </PageShell>
      </section>

      {/* 2. TRUST SIGNALS - Clean Cards */}
      <section className="bg-white border-y border-secondary-200">
        <PageShell className="py-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: FiShield,
                title: "Bảo hành dài hạn",
                description: "2 năm cho toàn bộ sản phẩm",
                color: "text-blue-600",
                bgColor: "bg-blue-50",
              },
              {
                icon: FiTruck,
                title: "Giao hàng thông minh",
                description: "Miễn phí đơn từ 5 triệu",
                color: "text-green-600",
                bgColor: "bg-green-50",
              },
              {
                icon: FiCreditCard,
                title: "Thanh toán linh hoạt",
                description: "Trả góp 0% - xử lý nhanh",
                color: "text-purple-600",
                bgColor: "bg-purple-50",
              },
              {
                icon: FiHeadphones,
                title: "Tư vấn tận tâm",
                description: "KTS hỗ trợ 24/7",
                color: "text-orange-600",
                bgColor: "bg-orange-50",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="flex flex-col items-center text-center p-6 rounded-2xl border border-secondary-200 bg-white hover:shadow-lg transition-all duration-300"
                >
                  <div className={`w-16 h-16 rounded-full ${item.bgColor} flex items-center justify-center mb-4`}>
                    <Icon className={`w-8 h-8 ${item.color}`} />
                  </div>
                  <h4 className="font-bold text-base text-secondary-900 mb-2">
                    {item.title}
                  </h4>
                  <p className="text-sm text-secondary-600 font-medium">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </PageShell>
      </section>

      {/* 3. CATEGORIES - Modern Grid */}
      {categories.length > 0 && (
        <Section>
          <div className="text-center mb-12">
            <Heading level={2} className="text-secondary-900 font-bold text-3xl md:text-4xl mb-4">
              Khám phá theo không gian
            </Heading>
            <p className="text-secondary-700 max-w-2xl mx-auto font-medium text-lg">
              Tìm kiếm nội thất hoàn hảo cho từng góc nhỏ trong ngôi nhà của bạn, từ phòng khách sang trọng đến phòng ngủ ấm áp.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/categories/${category.slug || category.id}`}
                className="group relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-secondary-200 hover:border-primary-500"
              >
                <div className="aspect-square bg-gradient-to-br from-secondary-50 to-secondary-100 flex items-center justify-center p-6">
                  {category.image ? (
                    <Image
                      src={normalizeImageUrl(category.image) || category.image}
                      alt={category.name}
                      width={120}
                      height={120}
                      className="object-contain transition-transform duration-300 group-hover:scale-110"
                    />
                  ) : (
                    <span className="text-6xl">🛋️</span>
                  )}
                </div>
                <div className="p-5 text-center bg-white">
                  <h3 className="font-bold text-secondary-900 text-lg group-hover:text-primary-700 transition-colors">
                    {category.name}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* 4. FEATURED PRODUCTS */}
      <Section background="stone">
        <div className="text-center mb-12">
          <span className="text-primary-600 font-bold tracking-widest text-xs uppercase mb-2 block">
            Weekly selection
          </span>
          <Heading level={2} className="mb-4 text-secondary-900 font-bold">
            Thiết kế mới nhất
          </Heading>
          <p className="text-secondary-700 max-w-2xl mx-auto font-medium">
            Nâng cấp không gian sống với những thiết kế vừa cập bến FurniMart.
          </p>
        </div>

        {featuredError ? (
          <ErrorState title="Không thể tải sản phẩm" />
        ) : (
          <ProductGrid
            products={featuredProducts}
            isLoading={featuredLoading}
            columns={4}
          />
        )}

        <div className="text-center mt-10">
          <Link href="/products">
            <Button variant="outline" size="lg" className="px-8">
              Xem tất cả sản phẩm <FiArrowRight className="inline ml-2" />
            </Button>
          </Link>
        </div>
      </Section>

      {/* 5. PROMOTION BANNER - Vibrant Yellow */}
      <section className="py-20 relative overflow-hidden bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-64 h-64 bg-yellow-600 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 left-10 w-80 h-80 bg-yellow-500 rounded-full blur-3xl"></div>
        </div>

        <PageShell className="relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-sm font-bold text-white shadow-lg">
                🔥 GIẢM 10%
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-secondary-900 leading-tight">
                Siêu Sale Mùa Hè
                <br />
                <span className="text-primary-700">Giảm 50%</span>
              </h2>
              <div className="flex items-center gap-2 text-secondary-800 font-semibold">
                <span>Mã giảm giá:</span>
                <span className="bg-white px-3 py-1.5 rounded-md border-2 border-secondary-900 font-bold">PROMO100</span>
              </div>
              <p className="text-lg text-secondary-800 font-medium max-w-xl">
                Chương trình khuyến mãi đặc biệt Siêu Sale Mùa Hè - Giảm 50%. Áp dụng cho toàn bộ hệ thống cửa hàng FurniMart.
              </p>
              <div className="flex items-center gap-2 text-secondary-700 font-semibold">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Hết hạn: 8/2/2026</span>
              </div>
              <div className="flex gap-4 pt-2">
                <Link href="/promotions">
                  <Button
                    variant="primary"
                    size="lg"
                    className="bg-primary-600 text-white hover:bg-primary-700 shadow-xl font-semibold px-8"
                  >
                    Mua ngay <FiArrowRight className="inline ml-2" />
                  </Button>
                </Link>
                <Link href="/policy">
                  <Button
                    variant="outline"
                    size="lg"
                    className="bg-white border-2 border-secondary-900 text-secondary-900 hover:bg-secondary-50 font-semibold px-8"
                  >
                    Điều khoản
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative h-96 lg:h-[500px] flex items-center justify-center">
              <h3 className="text-8xl lg:text-9xl font-black text-yellow-600/20 select-none pointer-events-none">
                Summer Sale
                <br />
                50% Off
              </h3>
            </div>
          </div>
        </PageShell>
      </section>

      {/* 6. BEST SELLING */}
      <Section>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-4 space-y-6">
            <span className="text-error font-bold tracking-widest text-xs uppercase">
              Best sellers
            </span>
            <Heading level={2} className="leading-tight text-secondary-900 font-bold">
              Được yêu thích nhất tháng
            </Heading>
            <p className="text-secondary-700 leading-relaxed font-medium">
              Những sản phẩm được khách hàng tin dùng và đánh giá cao nhất. Đừng bỏ lỡ các lựa chọn must-have cho tổ ấm.
            </p>
            <Link href="/products?sort=rating">
              <Button
                variant="primary"
                size="lg"
                className="mt-4 shadow-lg shadow-primary-500/30"
              >
                Mua ngay <FiArrowRight className="inline ml-2" />
              </Button>
            </Link>
          </div>

          <div className="lg:col-span-8">
            <ProductGrid
              products={bestsellingProducts}
              isLoading={bestsellingLoading}
              columns={2}
              showActions={false}
            />
          </div>
        </div>
      </Section>

      {/* 7. REVIEWS */}
      {recentReviews && recentReviews.length > 0 && (
        <Section background="stone">
          <Heading level={2} className="text-center mb-12 text-secondary-900 font-bold">
            Khách hàng nói gì?
          </Heading>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {recentReviews.slice(0, 3).map((review) => (
              <div
                key={review.id}
                className="bg-white p-8 rounded-2xl shadow-md border border-secondary-200 relative"
              >
                <span className="text-6xl text-secondary-200 absolute top-4 left-4 font-serif leading-none">
                  &ldquo;
                </span>
                <div className="relative z-10">
                  <div className="flex text-yellow-500 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <FiStar
                        key={i}
                        className={`w-5 h-5 ${i < review.rating ? "fill-current" : ""}`}
                      />
                    ))}
                  </div>
                  <p className="text-secondary-900 mb-6 italic leading-relaxed font-medium">
                    {review.comment}
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center font-bold text-primary-700">
                      {(review.user?.name || "K").charAt(0)}
                    </div>
                    <div>
                      <h5 className="font-bold text-sm text-secondary-900">
                        {review.user?.name || "Khách hàng"}
                      </h5>
                      <p className="text-xs text-secondary-500">
                        Verified Buyer
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 8. NEWSLETTER */}
      <Section>
        <div className="rounded-3xl border-2 border-secondary-200 bg-gradient-to-br from-primary-50 to-white p-10 md:p-14 text-center shadow-lg">
          <span className="text-primary-600 font-bold tracking-widest text-xs uppercase mb-3 block">
            Cập nhật xu hướng
          </span>
          <Heading level={2} className="mb-4 text-secondary-900 font-bold">
            Nhận bộ sưu tập mới mỗi tuần
          </Heading>
          <p className="text-secondary-700 max-w-2xl mx-auto mb-8 font-medium">
            Đăng ký email để nhận ưu đãi độc quyền, ý tưởng decor và dự án mới nhất từ FurniMart.
          </p>
          <form className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <input
              type="email"
              placeholder="Email của bạn"
              className="flex-1 rounded-full border-2 border-secondary-200 bg-white px-5 py-3 text-sm text-secondary-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <Button size="lg" className="px-8 rounded-full">
              Đăng ký ngay
            </Button>
          </form>
        </div>
      </Section>
    </div>
  );
}
