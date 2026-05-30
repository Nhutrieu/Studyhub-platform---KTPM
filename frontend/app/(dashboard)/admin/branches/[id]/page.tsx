"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { branchService } from "@/services/branchService";
import { userService } from "@/services/userService";
import { warehouseService } from "@/services/warehouseService";
import PageHeader from "@/components/layouts/PageHeader";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import DataTable from "@/components/dashboard/DataTable";
import ErrorState from "@/components/ui/ErrorState";
import { FiEdit, FiMapPin, FiPhone, FiMail, FiUsers, FiBox, FiDollarSign, FiShoppingBag } from "react-icons/fi";
import { formatCurrency } from "@/lib/format";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function BranchDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const router = useRouter();
    const [selectedTab, setSelectedTab] = useState<'employees' | 'inventory'>('employees');

    const { data: branch, isLoading: loadingBranch, isError: errorBranch } = useQuery({
        queryKey: ["admin", "branch", id],
        queryFn: () => branchService.getBranch(id),
    });

    const { data: users, isLoading: loadingUsers } = useQuery({
        queryKey: ["admin", "branch-users", id],
        queryFn: () => userService.getUsers({ branchId: id }),
        enabled: !!id,
    });

    const { data: inventory, isLoading: loadingInventory } = useQuery({
        queryKey: ["admin", "branch-inventory", id],
        queryFn: () => warehouseService.getInventory(id),
        enabled: !!id,
    });

    if (loadingBranch) return <div className="p-8 flex justify-center"><LoadingSpinner /></div>;
    if (errorBranch || !branch) return <ErrorState title="Không tìm thấy chi nhánh" description="Chi nhánh này không tồn tại hoặc đã bị xóa" action={{ label: "Quay lại", onClick: () => router.push("/admin/branches") }} />;

    const employees = users || [];
    const inventoryItems = inventory || [];

    const employeeColumns = [
        {
            key: "name",
            header: "Họ và tên",
            render: (item: any) => (
                <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-stone-500">{item.email}</p>
                </div>
            ),
        },
        {
            key: "role",
            header: "Vai trò",
            render: (item: any) => {
                const roles: Record<string, string> = {
                    branch_manager: "Quản lý",
                    employee: "Nhân viên",
                    shipper: "Shipper",
                };
                return <Badge variant="info">{roles[item.role] || item.role}</Badge>;
            },
        },
        {
            key: "phone",
            header: "Số điện thoại",
            render: (item: any) => <span className="text-sm">{item.phone}</span>,
        },
    ];

    const inventoryColumns = [
        {
            key: "product",
            header: "Sản phẩm",
            render: (item: any) => (
                <div className="max-w-[200px] truncate" title={item.product?.name}>
                    <p className="font-medium">{item.product?.name || "Unknown Product"}</p>
                    <p className="text-xs text-stone-500">{item.productId}</p>
                </div>
            ),
        },
        {
            key: "quantity",
            header: "Số lượng",
            render: (item: any) => <span className="font-medium">{item.quantity}</span>,
        },
        {
            key: "reserved",
            header: "Đang giữ",
            render: (item: any) => <span className="text-stone-500">{item.reservedQuantity || 0}</span>,
        },
        {
            key: "available",
            header: "Có sẵn",
            render: (item: any) => <span className="text-emerald-600 font-medium">{item.availableQuantity || item.quantity - (item.reservedQuantity || 0)}</span>,
        },
    ];

    const addressString = typeof branch.address === 'string'
        ? branch.address
        : `${branch.address?.street}, ${branch.address?.ward}, ${branch.address?.district}, ${branch.address?.city}`;

    return (
        <div className="space-y-6">
            <PageHeader
                title={branch.name}
                breadcrumbs={[
                    { label: "Dashboard", href: "/admin" },
                    { label: "Chi nhánh", href: "/admin/branches" },
                    { label: branch.name },
                ]}
                actions={
                    <Button variant="outline" onClick={() => { }}>
                        <FiEdit className="w-4 h-4 mr-2" />
                        Chỉnh sửa
                    </Button>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2 space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <FiMapPin className="text-primary-600" /> Thông tin liên hệ
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-stone-500">Địa chỉ</label>
                            <p className="font-medium">{addressString}</p>
                        </div>
                        <div>
                            <label className="text-sm text-stone-500">Số điện thoại</label>
                            <p className="font-medium flex items-center gap-2">
                                <FiPhone className="text-stone-400" /> {branch.phone}
                            </p>
                        </div>
                        <div>
                            <label className="text-sm text-stone-500">Email</label>
                            <p className="font-medium flex items-center gap-2">
                                <FiMail className="text-stone-400" /> {branch.email || "N/A"}
                            </p>
                        </div>
                        <div>
                            <label className="text-sm text-stone-500">Trạng thái</label>
                            <div className="mt-1">
                                <Badge variant={branch.status === 'active' ? 'success' : 'default'}>{branch.status}</Badge>
                            </div>
                        </div>
                    </div>
                    {branch.description && (
                        <div>
                            <label className="text-sm text-stone-500">Mô tả</label>
                            <p className="text-stone-700 mt-1">{branch.description}</p>
                        </div>
                    )}
                </Card>

                <Card className="space-y-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <FiDollarSign className="text-emerald-600" /> Hiệu suất
                    </h3>
                    <div className="space-y-4">
                        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm text-emerald-600 font-medium">Tổng doanh thu</p>
                                    <p className="text-2xl font-bold text-emerald-700">{formatCurrency(branch.totalRevenue || 0)}</p>
                                </div>
                                <FiDollarSign className="text-emerald-400 w-6 h-6" />
                            </div>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm text-blue-600 font-medium">Tổng đơn hàng</p>
                                    <p className="text-2xl font-bold text-blue-700">{branch.totalOrders || 0}</p>
                                </div>
                                <FiShoppingBag className="text-blue-400 w-6 h-6" />
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="w-full">
                <div className="flex space-x-1 rounded-xl bg-stone-100 p-1 max-w-md mb-4">
                    <button
                        className={cn(
                            'w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all',
                            'focus:outline-none focus:ring-2 ring-offset-2 ring-primary-400',
                            selectedTab === 'employees'
                                ? 'bg-white text-primary-700 shadow'
                                : 'text-stone-500 hover:bg-white/[0.12] hover:text-stone-700'
                        )}
                        onClick={() => setSelectedTab('employees')}
                    >
                        Nhân viên
                    </button>
                    <button
                        className={cn(
                            'w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all',
                            'focus:outline-none focus:ring-2 ring-offset-2 ring-primary-400',
                            selectedTab === 'inventory'
                                ? 'bg-white text-primary-700 shadow'
                                : 'text-stone-500 hover:bg-white/[0.12] hover:text-stone-700'
                        )}
                        onClick={() => setSelectedTab('inventory')}
                    >
                        Kho hàng
                    </button>
                </div>

                <div>
                    {selectedTab === 'employees' && (
                        <Card>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <FiUsers className="text-primary-600" /> Danh sách nhân viên
                                </h3>
                                {/* Add User Button could go here */}
                            </div>
                            <DataTable
                                columns={employeeColumns}
                                data={employees}
                                isLoading={loadingUsers}
                                emptyState={<div className="p-4 text-center text-stone-500">Chưa có nhân viên nào</div>}
                            />
                        </Card>
                    )}
                    {selectedTab === 'inventory' && (
                        <Card>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <FiBox className="text-primary-600" /> Tồn kho hiện tại
                                </h3>
                                {/* Add Inventory Button could go here */}
                            </div>
                            <DataTable
                                columns={inventoryColumns}
                                data={inventoryItems}
                                isLoading={loadingInventory}
                                emptyState={<div className="p-4 text-center text-stone-500">Kho hàng trống</div>}
                            />
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
