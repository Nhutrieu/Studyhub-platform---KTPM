"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { FiShoppingCart, FiUser, FiMenu, FiX, FiSearch, FiChevronDown, FiTrash2, FiPlus, FiMinus } from "react-icons/fi";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import Logo from "@/components/common/Logo";
import Input from "@/components/ui/Input";
import { settingsService } from "@/services/settingsService";
import { productService } from "@/services/productService";
import { useDebounce } from "@/hooks/useDebounce";
import Image from "next/image";
import { formatCurrency } from "@/lib/format";
import { getDashboardRoute } from "@/lib/auth/roles";
import { toast } from "react-toastify";

export default function Navbar() {
  const pathname = usePathname();
  const { isAuthenticated, logout, role, user } = useAuthStore();
  const { items: cartItems, totalItems, totalAmount, removeItem, updateQuantity } = useCartStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [productsMenuOpen, setProductsMenuOpen] = useState(false);
  const [searchResultsOpen, setSearchResultsOpen] = useState(false);
  const [cartMenuOpen, setCartMenuOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchFormRef = useRef<HTMLFormElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const productsMenuRef = useRef<HTMLDivElement>(null);
  const cartMenuRef = useRef<HTMLDivElement>(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Load header settings
  const { data: headerSettings } = useQuery({
    queryKey: ["headerSettings"],
    queryFn: () => settingsService.getHeaderSettings(),
    staleTime: 5 * 60 * 1000,
  });

  // Search autocomplete
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["search", debouncedSearchQuery],
    queryFn: () => productService.searchProducts(debouncedSearchQuery, { limit: 5 }),
    enabled: debouncedSearchQuery.length >= 2 && searchResultsOpen,
    staleTime: 30000,
  });

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        userMenuRef.current && !userMenuRef.current.contains(target) &&
        productsMenuRef.current && !productsMenuRef.current.contains(target) &&
        ((searchRef.current && !searchRef.current.contains(target)) || (searchFormRef.current && !searchFormRef.current.contains(target))) &&
        cartMenuRef.current && !cartMenuRef.current.contains(target)
      ) {
        setUserMenuOpen(false);
        setProductsMenuOpen(false);
        setSearchResultsOpen(false);
        setCartMenuOpen(false);
      }
    };
    if (typeof window !== "undefined") {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, []);

  // Navbar scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const navbar = document.getElementById("main-navbar");
      if (navbar) {
        if (window.scrollY > 20) {
          navbar.classList.add("navbar-scrolled");
        } else {
          navbar.classList.remove("navbar-scrolled");
        }
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
    }
  }, []);

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  const getDashboardLink = () => getDashboardRoute(role || undefined);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/products?search=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-lg border-b border-secondary-200/60 shadow-soft transition-all duration-300" id="main-navbar" role="navigation" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {/* Top Bar - Logo, Search, User Actions */}
        <div className="flex justify-between items-center h-20 gap-6">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Logo size="md" />
          </div>

          {/* Search Bar - Center */}
          {headerSettings?.showSearch !== false && (
            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-2xl mx-auto">
              <div className="relative w-full group" ref={searchRef}>
                <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-secondary-400 w-5 h-5 z-10 transition-colors group-focus-within:text-primary-600" />
                <Input
                  type="text"
                  placeholder={headerSettings?.searchPlaceholder || "Tìm kiếm sản phẩm..."}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchResultsOpen(true);
                  }}
                  onFocus={() => {
                    if (searchQuery.length >= 2) {
                      setSearchResultsOpen(true);
                    }
                  }}
                  className="pl-12 pr-4 py-2.5 w-full bg-secondary-50/80 border-transparent focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all duration-300" // Custom input style for navbar
                />
                {/* Search Results Dropdown */}
                {searchResultsOpen && debouncedSearchQuery.length >= 2 && (
                  <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-float border border-secondary-200/60 z-[100] max-h-96 overflow-y-auto animate-fade-in backdrop-blur-sm">
                    {isSearching ? (
                      <div className="p-6 text-center text-secondary-500">
                        <p className="text-sm font-medium">Đang tìm kiếm...</p>
                      </div>
                    ) : searchResults && searchResults.items && searchResults.items.length > 0 ? (
                      <>
                        <div className="p-2 space-y-1">
                          {searchResults.items.map((product) => (
                            <Link
                              key={product.id}
                              href={`/products/${product.id}`}
                              onClick={() => {
                                setSearchResultsOpen(false);
                                setSearchQuery("");
                              }}
                              className="flex items-center gap-4 p-3 rounded-xl hover:bg-primary-50/50 transition-all duration-300 group/item border border-transparent hover:border-primary-100"
                            >
                              {product.images && product.images[0] && (
                                <div className="relative w-12 h-12 flex-shrink-0 rounded-md overflow-hidden bg-secondary-100 border border-secondary-200">
                                  <Image
                                    src={product.images[0]}
                                    alt={product.name}
                                    fill
                                    className="object-cover group-hover/item:scale-110 transition-transform duration-300"
                                    sizes="48px"
                                  />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-secondary-900 truncate group-hover/item:text-primary-700 transition-colors">
                                  {product.name}
                                </h4>
                                <p className="text-sm font-bold text-primary-600">
                                  {formatCurrency(product.price)}
                                </p>
                              </div>
                            </Link>
                          ))}
                        </div>
                        <div className="border-t border-secondary-100 p-3 bg-secondary-50/50">
                          <Link
                            href={`/products?search=${encodeURIComponent(debouncedSearchQuery)}`}
                            onClick={() => setSearchResultsOpen(false)}
                            className="block text-center text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
                          >
                            Xem tất cả kết quả ({searchResults.total})
                          </Link>
                        </div>
                      </>
                    ) : debouncedSearchQuery.length >= 2 ? (
                      <div className="p-6 text-center text-secondary-500">
                        <p className="text-sm">Không tìm thấy sản phẩm</p>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </form>
          )}

          {/* Right Actions */}
          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated && (
              <div className="relative" ref={cartMenuRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCartMenuOpen(!cartMenuOpen);
                  }}
                  className={cn(
                    "relative p-2.5 text-secondary-600 rounded-lg",
                    "transition-all duration-200 ease-out",
                    "hover:text-primary-600 hover:bg-primary-50",
                    "active:scale-95"
                  )}
                  aria-label="Giỏ hàng"
                  aria-expanded={cartMenuOpen}
                >
                  <FiShoppingCart className="w-6 h-6" />
                  {totalItems > 0 && (
                    <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold ring-2 ring-white">
                      {totalItems}
                    </span>
                  )}
                </button>
                {/* Cart Dropdown (Simplified for brevity, keep existing logic) */}
                {cartMenuOpen && (
                  <div className="absolute right-0 mt-3 w-96 bg-white rounded-2xl shadow-float border border-secondary-200/60 z-[100] animate-fade-in origin-top-right backdrop-blur-sm">
                    <div className="p-4 border-b border-secondary-200 flex justify-between items-center bg-gradient-to-r from-secondary-50 to-white rounded-t-2xl">
                      <h3 className="font-semibold text-secondary-900">Giỏ hàng ({totalItems})</h3>
                      <Link href="/cart" onClick={() => setCartMenuOpen(false)} className="text-xs font-medium text-primary-600 hover:text-primary-700">Xem chi tiết</Link>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto p-2">
                      {cartItems.length === 0 ? (
                        <div className="p-8 text-center">
                          <div className="w-16 h-16 bg-secondary-50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <FiShoppingCart className="w-8 h-8 text-secondary-300" />
                          </div>
                          <p className="text-sm text-secondary-500">Giỏ hàng trống</p>
                          <Button variant="primary" size="sm" className="mt-4" onClick={() => setCartMenuOpen(false)}>Mua sắm ngay</Button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {cartItems.slice(0, 5).map(item => (
                            <div key={item.id} className="flex gap-3 p-3 rounded-xl hover:bg-primary-50/50 transition-all duration-300 group border border-transparent hover:border-primary-100">
                              <div className="relative w-16 h-16 rounded-md overflow-hidden bg-secondary-100 flex-shrink-0 border border-secondary-200">
                                {item.product.images?.[0] && <Image src={item.product.images[0]} alt={item.product.name} fill className="object-cover" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-secondary-900 truncate">{item.product.name}</h4>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-secondary-500 text-xs">SL: {item.quantity}</span>
                                  <span className="text-sm font-bold text-primary-600">{formatCurrency(item.price * item.quantity)}</span>
                                </div>
                              </div>
                              <button onClick={() => removeItem(item.id)} className="p-1.5 text-secondary-400 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-all">
                                <FiTrash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {cartItems.length > 0 && (
                      <div className="p-4 border-t border-secondary-200 bg-gradient-to-r from-secondary-50 to-white rounded-b-2xl">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-sm text-secondary-600">Tổng cộng</span>
                          <span className="text-lg font-bold text-primary-600">{formatCurrency(totalAmount)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Link href="/cart" onClick={() => setCartMenuOpen(false)} className="w-full">
                            <Button variant="outline" className="w-full justify-center">Giỏ hàng</Button>
                          </Link>
                          <Button 
                            variant="primary" 
                            className="w-full justify-center"
                            onClick={(e) => {
                              e.preventDefault();
                              setCartMenuOpen(false);
                              // Validate cart before redirecting
                              if (cartItems.length === 0) {
                                toast.error("Giỏ hàng trống");
                                return;
                              }
                              // Check if all items have branch selected
                              const hasMissingBranch = cartItems.some((item) => !item.branchId);
                              if (hasMissingBranch) {
                                toast.error("Vui lòng chọn chi nhánh cho tất cả sản phẩm");
                                return;
                              }
                              // Navigate to checkout
                              window.location.href = "/checkout";
                            }}
                          >
                            Thanh toán
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {isAuthenticated ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setUserMenuOpen(!userMenuOpen);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-secondary-700 rounded-lg hover:bg-secondary-50 transition-all duration-200",
                    userMenuOpen && "bg-secondary-50 text-secondary-900"
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-sm">
                    {user?.name?.charAt(0) || user?.fullName?.charAt(0) || "U"}
                  </div>
                  <div className="text-left hidden lg:block">
                    <p className="text-xs text-secondary-500 font-medium">Xin chào,</p>
                    <p className="text-sm font-semibold leading-none">{user?.name || "Member"}</p>
                  </div>
                  <FiChevronDown className={cn("w-4 h-4 transition-transform duration-200", userMenuOpen && "rotate-180")} />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-float border border-secondary-200/60 overflow-hidden z-[100] animate-fade-in origin-top-right backdrop-blur-sm">
                    <div className="p-4 border-b border-secondary-200 bg-gradient-to-r from-secondary-50 to-white">
                      <p className="text-sm font-semibold text-secondary-900 truncate">{user?.name || user?.fullName}</p>
                      <p className="text-xs text-secondary-500 truncate">{user?.email}</p>
                    </div>
                    <div className="p-2">
                      <Link href={getDashboardLink()} onClick={() => setUserMenuOpen(false)} className="block px-3 py-2.5 text-sm text-secondary-700 rounded-lg hover:bg-primary-50 hover:text-primary-700 transition-all duration-300 font-medium">
                        Dashboard
                      </Link>
                      <Link href="/orders" onClick={() => setUserMenuOpen(false)} className="block px-3 py-2.5 text-sm text-secondary-700 rounded-lg hover:bg-primary-50 hover:text-primary-700 transition-all duration-300 font-medium">
                        Đơn hàng của tôi
                      </Link>
                      <Link href="/account" onClick={() => setUserMenuOpen(false)} className="block px-3 py-2.5 text-sm text-secondary-700 rounded-lg hover:bg-primary-50 hover:text-primary-700 transition-all duration-300 font-medium">
                        Tài khoản
                      </Link>
                    </div>
                    <div className="border-t border-secondary-200 p-2 bg-secondary-50/50">
                      <button onClick={handleLogout} className="w-full text-left px-3 py-2.5 text-sm text-red-600 rounded-lg hover:bg-red-50 transition-all duration-300 flex items-center gap-2 font-medium">
                        <FiX className="w-4 h-4" /> Đăng xuất
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 ml-2">
                <Link href="/auth/login" className="text-sm font-medium text-secondary-600 hover:text-primary-600 transition-colors">Đăng nhập</Link>
                <Link href="/auth/register">
                  <Button variant="primary" size="sm">Đăng ký</Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Menu Bar */}
        <div className="hidden md:flex items-center justify-center gap-8 py-0">
          {/* Main Links - With smooth underline animation */}
          <Link href="/" className={cn("text-sm font-semibold py-3 relative nav-link-underline transition-colors duration-300", pathname === "/" ? "text-primary-700 active" : "text-secondary-600 hover:text-primary-600")}>Trang chủ</Link>
          <Link href="/products" className={cn("text-sm font-semibold py-3 relative nav-link-underline transition-colors duration-300", pathname === "/products" ? "text-primary-700 active" : "text-secondary-600 hover:text-primary-600")}>Sản phẩm</Link>
          <Link href="/categories" className={cn("text-sm font-semibold py-3 relative nav-link-underline transition-colors duration-300", pathname === "/categories" ? "text-primary-700 active" : "text-secondary-600 hover:text-primary-600")}>Danh mục</Link>
          <Link href="/branches" className={cn("text-sm font-semibold py-3 relative nav-link-underline transition-colors duration-300", pathname === "/branches" ? "text-primary-700 active" : "text-secondary-600 hover:text-primary-600")}>Chi nhánh</Link>
          <Link href="/promotions" className={cn("text-sm font-semibold py-3 relative nav-link-underline transition-colors duration-300", pathname === "/promotions" ? "text-primary-700 active" : "text-secondary-600 hover:text-primary-600")}>Khuyến mãi</Link>
        </div>

        {/* Mobile Menu Button - Kept similar but styled */}
        <div className="md:hidden absolute top-5 right-4 flex items-center gap-3">
          <button onClick={() => setMobileMenuOpen(true)} className="p-2 text-secondary-900">
            <FiMenu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay - Simplified */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[200] bg-white animate-fade-in flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-secondary-100">
            <Logo />
            <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-secondary-500 rounded-full hover:bg-secondary-100">
              <FiX className="w-6 h-6" />
            </button>
          </div>
          <div className="p-4 flex-1 overflow-y-auto">
            <nav className="space-y-4">
              <Link href="/" onClick={() => setMobileMenuOpen(false)} className="block text-lg font-medium text-secondary-900 border-b border-secondary-100 pb-2">Trang chủ</Link>
              <Link href="/products" onClick={() => setMobileMenuOpen(false)} className="block text-lg font-medium text-secondary-900 border-b border-secondary-100 pb-2">Sản phẩm</Link>
              {/* ... other mobile links ... */}
            </nav>
          </div>
        </div>
      )}
    </nav>
  );
}
