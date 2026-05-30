"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  FiUpload,
  FiX,
  FiImage,
  FiSave,
  FiPlus,
  FiTrash2,
  FiChevronDown,
} from "react-icons/fi";
import { toast } from "react-toastify";
import {
  settingsService,
  HeaderSettings,
  HeroSettings,
} from "@/services/settingsService";
import { uploadService } from "@/services/uploadService";
import Image from "next/image";
import Logo from "@/components/common/Logo";
import { notifications } from "@/lib/notifications";
import { logger } from "@/lib/logger";
import { normalizeImageUrl } from "@/lib/imageUtils";

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();

  // Load header settings
  const { data: headerSettings, isLoading: headerLoading } = useQuery({
    queryKey: ["headerSettings"],
    queryFn: () => settingsService.getHeaderSettings(),
  });

  // Load hero settings
  const { data: heroSettings, isLoading: heroLoading } = useQuery({
    queryKey: ["heroSettings"],
    queryFn: () => settingsService.getHeroSettings(),
  });

  const [headerFormData, setHeaderFormData] = useState<HeaderSettings>({
    logoText: "FurniMart",
    logoUrl: null,
    logoSvg: null,
    searchPlaceholder: "Tìm kiếm sản phẩm...",
    showSearch: true,
    navigationItems: [],
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [heroFormData, setHeroFormData] = useState<HeroSettings>({
    imageUrl: null,
    title: "Hệ Thống Nội Thất",
    subtitle: "Lưu Giữ Hồn Việt Trong Đường Nét Hiện Đại",
    buttonText: "Xem Chi Tiết",
    buttonLink: "/products",
  });

  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);
  const [uploadingHero, setUploadingHero] = useState(false);

  useEffect(() => {
    if (headerSettings) {
      setHeaderFormData({
        logoText: headerSettings.logoText || "FurniMart",
        logoUrl: headerSettings.logoUrl || null,
        logoSvg: headerSettings.logoSvg || null,
        searchPlaceholder:
          headerSettings.searchPlaceholder || "Tìm kiếm sản phẩm...",
        showSearch: headerSettings.showSearch !== false,
        navigationItems: headerSettings.navigationItems || [],
      });
      if (headerSettings.logoUrl) {
        const normalized = normalizeImageUrl(headerSettings.logoUrl);
        setLogoPreview(normalized || headerSettings.logoUrl);
      }
    }
  }, [headerSettings]);

  useEffect(() => {
    if (heroSettings) {
      setHeroFormData({
        imageUrl: heroSettings.imageUrl || null,
        title: heroSettings.title || "Hệ Thống Nội Thất",
        subtitle:
          heroSettings.subtitle || "Lưu Giữ Hồn Việt Trong Đường Nét Hiện Đại",
        buttonText: heroSettings.buttonText || "Xem Chi Tiết",
        buttonLink: heroSettings.buttonLink || "/products",
      });
      if (heroSettings.imageUrl) {
        const normalized = normalizeImageUrl(heroSettings.imageUrl);
        setHeroPreview(normalized || heroSettings.imageUrl);
      }
    }
  }, [heroSettings]);

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Vui lòng chọn file ảnh");
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile) {
      toast.error("Vui lòng chọn file logo");
      return;
    }
    setUploadingLogo(true);
    try {
      const result = await uploadService.uploadImage(logoFile);
      // Store the API endpoint URL instead of raw file path
      const apiUrl = normalizeImageUrl(result.url) || result.url;
      setHeaderFormData((prev) => ({
        ...prev,
        logoUrl: apiUrl,
        logoSvg: null,
      }));
      setLogoPreview(apiUrl);
      notifications.upload.success(logoFile.name);
    } catch (error: unknown) {
      const errorMessage =
        (
          error as {
            message?: string;
            response?: { data?: { message?: string } };
          }
        )?.message ||
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ||
        "Không thể upload logo";
      toast.error(errorMessage);
      logger.error("Upload logo error:", error);
      notifications.upload.error();
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setHeaderFormData((prev) => ({ ...prev, logoUrl: null, logoSvg: null }));
    setLogoPreview(null);
    setLogoFile(null);
  };

  const handleHeroFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Vui lòng chọn file ảnh");
        return;
      }
      setHeroFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setHeroPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleHeroUpload = async () => {
    if (!heroFile) {
      toast.error("Vui lòng chọn file ảnh");
      return;
    }
    setUploadingHero(true);
    try {
      const result = await uploadService.uploadImage(heroFile);
      // Store the API endpoint URL instead of raw file path
      const apiUrl = normalizeImageUrl(result.url) || result.url;
      setHeroFormData((prev) => ({ ...prev, imageUrl: apiUrl }));
      setHeroPreview(apiUrl);
      notifications.upload.success(heroFile.name);
    } catch (error: unknown) {
      const errorMessage =
        (
          error as {
            message?: string;
            response?: { data?: { message?: string } };
          }
        )?.message ||
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ||
        "Không thể upload hero image";
      toast.error(errorMessage);
      logger.error("Upload hero image error:", error);
      notifications.upload.error();
    } finally {
      setUploadingHero(false);
    }
  };

  const handleRemoveHero = () => {
    setHeroFormData((prev) => ({ ...prev, imageUrl: null }));
    setHeroPreview(null);
    setHeroFile(null);
  };

  const addNavigationItem = () => {
    setHeaderFormData((prev) => ({
      ...prev,
      navigationItems: [
        ...(prev.navigationItems || []),
        { label: "Menu mới", href: "/", dropdown: [] },
      ],
    }));
  };

  const removeNavigationItem = (index: number) => {
    setHeaderFormData((prev) => ({
      ...prev,
      navigationItems:
        prev.navigationItems?.filter((_, i) => i !== index) || [],
    }));
  };

  const updateNavigationItem = (
    index: number,
    field: string,
    value: unknown
  ) => {
    setHeaderFormData((prev) => {
      const items = [...(prev.navigationItems || [])];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, navigationItems: items };
    });
  };

  const addDropdownItem = (navIndex: number) => {
    setHeaderFormData((prev) => {
      const items = [...(prev.navigationItems || [])];
      items[navIndex] = {
        ...items[navIndex],
        dropdown: [
          ...(items[navIndex].dropdown || []),
          { label: "Submenu", href: "/" },
        ],
      };
      return { ...prev, navigationItems: items };
    });
  };

  const removeDropdownItem = (navIndex: number, dropdownIndex: number) => {
    setHeaderFormData((prev) => {
      const items = [...(prev.navigationItems || [])];
      items[navIndex] = {
        ...items[navIndex],
        dropdown:
          items[navIndex].dropdown?.filter((_, i) => i !== dropdownIndex) || [],
      };
      return { ...prev, navigationItems: items };
    });
  };

  const updateDropdownItem = (
    navIndex: number,
    dropdownIndex: number,
    field: string,
    value: string
  ) => {
    setHeaderFormData((prev) => {
      const items = [...(prev.navigationItems || [])];
      const dropdown = [...(items[navIndex].dropdown || [])];
      dropdown[dropdownIndex] = { ...dropdown[dropdownIndex], [field]: value };
      items[navIndex] = { ...items[navIndex], dropdown };
      return { ...prev, navigationItems: items };
    });
  };

  const saveHeaderMutation = useMutation({
    mutationFn: (data: HeaderSettings) =>
      settingsService.updateHeaderSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["headerSettings"] });
      notifications.general.success("Đã cập nhật logo và header thành công");
    },
    onError: () => {
      notifications.general.error("Không thể cập nhật cài đặt");
    },
  });

  const saveHeroMutation = useMutation({
    mutationFn: (data: HeroSettings) =>
      settingsService.updateHeroSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["heroSettings"] });
      notifications.general.success("Đã cập nhật hero image thành công");
    },
    onError: () => {
      notifications.general.error("Không thể cập nhật hero settings");
    },
  });

  const handleSaveHeader = (e: React.FormEvent) => {
    e.preventDefault();
    saveHeaderMutation.mutate(headerFormData);
  };

  const handleSaveHero = (e: React.FormEvent) => {
    e.preventDefault();
    saveHeroMutation.mutate(heroFormData);
  };

  if (headerLoading || heroLoading) {
    return (
      <PageShell>
        <PageHeader
          title="Cài đặt"
          breadcrumbs={[
            { label: "Dashboard", href: "/admin" },
            { label: "Cài đặt" },
          ]}
        />
        <main className="space-y-6">
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-stone-500">Đang tải...</div>
            </CardContent>
          </Card>
        </main>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Cài đặt hệ thống"
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Cài đặt" },
        ]}
      />
      <main className="space-y-6">
        {/* Logo Section */}
        <form onSubmit={handleSaveHeader}>
          <Card variant="outline">
            <CardHeader>
              <CardTitle>Cài đặt Logo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Preview */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Preview Logo
                </label>
                <div className="p-6 bg-secondary-50 rounded-lg border border-secondary-200">
                  <Logo size="lg" showText={true} />
                </div>
              </div>

              {/* Logo Text */}
              <Input
                label="Tên logo (Text)"
                value={headerFormData.logoText || ""}
                onChange={(e) =>
                  setHeaderFormData((prev) => ({
                    ...prev,
                    logoText: e.target.value,
                  }))
                }
                placeholder="FurniMart"
              />

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Upload Logo Image
                </label>
                <div className="space-y-4">
                  {logoPreview && (
                    <div className="relative w-32 h-32 border border-secondary-200 rounded-lg overflow-hidden bg-white">
                      <Image
                        src={logoPreview}
                        alt="Logo preview"
                        fill
                        className="object-contain p-2"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <FiX className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    <label
                      htmlFor="logo-upload"
                      className="flex items-center gap-2 px-4 py-2 border border-secondary-300 rounded-lg cursor-pointer hover:bg-secondary-50 transition-colors"
                    >
                      <FiUpload className="w-4 h-4" />
                      <span className="text-sm">Chọn file logo</span>
                    </label>
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileChange}
                      className="hidden"
                      disabled={uploadingLogo}
                    />
                    {logoFile && !logoPreview?.startsWith("http") && (
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={handleLogoUpload}
                        isLoading={uploadingLogo}
                      >
                        Upload
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-secondary-500">
                    Hỗ trợ: PNG, JPG, SVG. Kích thước khuyến nghị: 200x200px
                  </p>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t border-secondary-200">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={saveHeaderMutation.isPending}
                >
                  <FiSave className="w-4 h-4 mr-2" />
                  Lưu cài đặt logo
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>

        {/* Header & Navigation Section */}
        <form onSubmit={handleSaveHeader}>
          <Card variant="outline">
            <CardHeader>
              <CardTitle>Cài đặt Header & Navigation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Search Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showSearch"
                    checked={headerFormData.showSearch}
                    onChange={(e) =>
                      setHeaderFormData((prev) => ({
                        ...prev,
                        showSearch: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="showSearch" className="text-sm font-medium">
                    Hiển thị thanh tìm kiếm
                  </label>
                </div>
                {headerFormData.showSearch && (
                  <Input
                    label="Placeholder cho thanh tìm kiếm"
                    value={headerFormData.searchPlaceholder || ""}
                    onChange={(e) =>
                      setHeaderFormData((prev) => ({
                        ...prev,
                        searchPlaceholder: e.target.value,
                      }))
                    }
                    placeholder="Tìm kiếm sản phẩm..."
                  />
                )}
              </div>

              {/* Navigation Items */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium">
                    Menu Navigation
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addNavigationItem}
                  >
                    <FiPlus className="w-4 h-4 mr-2" />
                    Thêm menu
                  </Button>
                </div>
                <div className="space-y-4">
                  {headerFormData.navigationItems?.map((item, index) => (
                    <div
                      key={index}
                      className="p-4 border border-secondary-200 rounded-lg space-y-3"
                    >
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Tên menu"
                          value={item.label}
                          onChange={(e) =>
                            updateNavigationItem(index, "label", e.target.value)
                          }
                          className="flex-1"
                        />
                        <Input
                          placeholder="URL (ví dụ: /products)"
                          value={item.href}
                          onChange={(e) =>
                            updateNavigationItem(index, "href", e.target.value)
                          }
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeNavigationItem(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      {/* Dropdown Items */}
                      <div className="ml-4 space-y-2 border-l-2 border-secondary-200 pl-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-secondary-600">
                            Submenu:
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => addDropdownItem(index)}
                            className="text-xs"
                          >
                            <FiPlus className="w-3 h-3 mr-1" />
                            Thêm submenu
                          </Button>
                        </div>
                        {item.dropdown?.map((subItem, subIndex) => (
                          <div
                            key={subIndex}
                            className="flex items-center gap-2"
                          >
                            <Input
                              placeholder="Tên submenu"
                              value={subItem.label}
                              onChange={(e) =>
                                updateDropdownItem(
                                  index,
                                  subIndex,
                                  "label",
                                  e.target.value
                                )
                              }
                              className="flex-1 text-sm"
                            />
                            <Input
                              placeholder="URL"
                              value={subItem.href}
                              onChange={(e) =>
                                updateDropdownItem(
                                  index,
                                  subIndex,
                                  "href",
                                  e.target.value
                                )
                              }
                              className="flex-1 text-sm"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                removeDropdownItem(index, subIndex)
                              }
                              className="text-red-600 hover:text-red-700"
                            >
                              <FiX className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {(!headerFormData.navigationItems ||
                    headerFormData.navigationItems.length === 0) && (
                    <div className="text-center py-8 text-secondary-500 text-sm">
                      Chưa có menu nào. Nhấn &quot;Thêm menu&quot; để bắt đầu.
                    </div>
                  )}
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t border-secondary-200">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={saveHeaderMutation.isPending}
                >
                  <FiSave className="w-4 h-4 mr-2" />
                  Lưu cài đặt header
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>

        {/* Hero Image Section */}
        <form onSubmit={handleSaveHero}>
          <Card variant="outline">
            <CardHeader>
              <CardTitle>Cài đặt Hero Image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Hero Image Preview */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Preview Hero Image
                </label>
                <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-stone-100 to-stone-200 rounded-lg overflow-hidden border border-secondary-200">
                  {heroPreview ? (
                    <Image
                      src={heroPreview}
                      alt="Hero preview"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-9xl mb-4">🛋️</div>
                        <p className="text-secondary-500 text-sm">
                          Furniture Collection
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Hero Image Upload */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Upload Hero Image
                </label>
                <div className="space-y-4">
                  {heroPreview && (
                    <div className="relative w-full max-w-md aspect-[4/3] border border-secondary-200 rounded-lg overflow-hidden bg-white">
                      <Image
                        src={heroPreview}
                        alt="Hero preview"
                        fill
                        className="object-cover"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveHero}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    <label
                      htmlFor="hero-upload"
                      className="flex items-center gap-2 px-4 py-2 border border-secondary-300 rounded-lg cursor-pointer hover:bg-secondary-50 transition-colors"
                    >
                      <FiUpload className="w-4 h-4" />
                      <span className="text-sm">Chọn file ảnh hero</span>
                    </label>
                    <input
                      id="hero-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleHeroFileChange}
                      className="hidden"
                      disabled={uploadingHero}
                    />
                    {heroFile && !heroPreview?.startsWith("http") && (
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={handleHeroUpload}
                        isLoading={uploadingHero}
                      >
                        Upload
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-secondary-500">
                    Hỗ trợ: PNG, JPG, WEBP. Tỷ lệ khuyến nghị: 4:3 hoặc 16:9
                  </p>
                </div>
              </div>

              {/* Hero Text Settings */}
              <div className="space-y-4">
                <Input
                  label="Tiêu đề Hero"
                  value={heroFormData.title || ""}
                  onChange={(e) =>
                    setHeroFormData((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  placeholder="Hệ Thống Nội Thất"
                />
                <Input
                  label="Phụ đề Hero"
                  value={heroFormData.subtitle || ""}
                  onChange={(e) =>
                    setHeroFormData((prev) => ({
                      ...prev,
                      subtitle: e.target.value,
                    }))
                  }
                  placeholder="Lưu Giữ Hồn Việt Trong Đường Nét Hiện Đại"
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Text nút"
                    value={heroFormData.buttonText || ""}
                    onChange={(e) =>
                      setHeroFormData((prev) => ({
                        ...prev,
                        buttonText: e.target.value,
                      }))
                    }
                    placeholder="Xem Chi Tiết"
                  />
                  <Input
                    label="Link nút"
                    value={heroFormData.buttonLink || ""}
                    onChange={(e) =>
                      setHeroFormData((prev) => ({
                        ...prev,
                        buttonLink: e.target.value,
                      }))
                    }
                    placeholder="/products"
                  />
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t border-secondary-200">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={saveHeroMutation.isPending}
                >
                  <FiSave className="w-4 h-4 mr-2" />
                  Lưu cài đặt hero
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>

        {/* System Info */}
        <Card variant="outline">
          <CardHeader>
            <CardTitle>Thông tin hệ thống</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-secondary-500">Phiên bản</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-500">Môi trường</span>
                <span className="font-medium">Development</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-500">Cập nhật cuối</span>
                <span className="font-medium">
                  {new Date().toLocaleDateString("vi-VN")}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </PageShell>
  );
}
