<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\frontend\shop\orders_manage.php
session_start();
require_once '../../includes/db.php';
require_once '../../includes/check_login.php';

// Chỉ cho Shop hoặc Admin truy cập
if ($_SESSION['role'] !== 'Shop' && $_SESSION['role'] !== 'Admin') {
    header("Location: /HeThongChamSocCaKoi/index.php");
    exit;
}

$shopId = $_SESSION['userid'];
$currentTab = isset($_GET['tab']) ? $_GET['tab'] : 'Pending';

// ===============================================
// QUERY LẤY DANH SÁCH ĐƠN HÀNG
// ===============================================

$tabs = [
    'Pending'       => 'Chờ xác nhận',
    'Processing'    => 'Chuẩn bị hàng',
    'Shipped'       => 'Đang vận chuyển',
    'Completed'     => 'Hoàn thành',
    'Dispute'       => 'Đang khiếu nại', 
    'AdminReview'   => 'Chờ Admin xử lý',
    'Refunded'      => 'Đã hoàn tiền', 
    'Cancelled'     => 'Đã hủy'
];

$page_title = "Quản lý đơn hàng";
// Giả định header.php và footer.php có cấu trúc tiêu chuẩn
include '../../includes/header.php';

$mock_orders_json = json_encode([
    'currentTab' => $currentTab
]);
?>

<!-- ========================================================= -->
<!-- BẮT ĐẦU DASHBOARD HTML MỚI -->
<!-- ========================================================= -->

<!-- Tải Tailwind CSS -->
<script src="https://cdn.tailwindcss.com"></script>
<!-- Tải Lucide Icons -->
<script src="https://unpkg.com/lucide@latest"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
    :root {
        --color-primary: 3 105 161; /* Tailwind sky-700 */
    }
    body {
        font-family: 'Inter', sans-serif;
        background-color: #f1f5f9; /* slate-100 */
    }
    /* Custom scrollbar */
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #e2e8f0; }

    /* Modal backdrop fix */
    .modal-overlay {
        display: none;
        position: fixed;
        z-index: 1000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(15, 23, 42, 0.7); /* slate-900/70 */
        overflow-y: auto;
        align-items: center;
        justify-content: center;
    }

    /* Animation for modal */
    .modal-content-animation {
        animation: fadeInScale 0.3s ease-out;
    }

    @keyframes fadeInScale {
        from { opacity: 0; transform: scale(0.98) translateY(-10px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
    }

    .btn-action {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 10px 16px;
        border-radius: 12px;
        font-weight: 600;
        font-size: 0.875rem;
        transition: all 0.2s;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }

    /* Toast Styles */
    #toast-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1010;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    .toast-item {
        background-color: white;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        animation: slideIn 0.3s ease-out, fadeOut 0.5s 2.5s forwards;
        min-width: 250px;
    }
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
</style>

<body onload="initApp()">

<!-- Toast Container -->
<div id="toast-container"></div>

<div class="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <header class="mb-6">
        <h1 class="text-3xl font-extrabold text-slate-800">Quản lý đơn hàng Shop</h1>
        <p class="text-slate-500 mt-1">Tổng quan và xử lý đơn hàng theo thời gian thực.</p>
    </header>

    <!-- Summary Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        <div class="bg-white p-5 rounded-xl shadow-md border border-slate-200">
            <div class="flex items-center justify-between">
                <span class="text-sm font-semibold text-slate-500">Đơn chờ xác nhận</span>
                <i data-lucide="clock" class="w-5 h-5 text-sky-500"></i>
            </div>
            <div class="text-2xl font-bold text-slate-800 mt-1" id="stat-pending">--</div>
            <p class="text-xs text-slate-400 mt-1">Đang chờ bạn xử lý</p>
        </div>
        <div class="bg-white p-5 rounded-xl shadow-md border border-slate-200">
            <div class="flex items-center justify-between">
                <span class="text-sm font-semibold text-slate-500">Tổng doanh thu (Tháng)</span>
                <i data-lucide="wallet" class="w-5 h-5 text-emerald-500"></i>
            </div>
            <div class="text-2xl font-bold text-slate-800 mt-1" id="stat-monthly-revenue">---</div>
            <p class="text-xs text-slate-400 mt-1" id="stat-monthly-growth">+--% so với tháng trước</p>
        </div>
        <div class="bg-white p-5 rounded-xl shadow-md border border-slate-200">
            <div class="flex items-center justify-between">
                <span class="text-sm font-semibold text-slate-500">Đơn đang giao</span>
                <i data-lucide="truck" class="w-5 h-5 text-indigo-500"></i>
            </div>
            <div class="text-2xl font-bold text-slate-800 mt-1" id="stat-shipped">--</div>
            <p class="text-xs text-slate-400 mt-1">Đang trên đường đến khách</p>
        </div>
          <div class="bg-white p-5 rounded-xl shadow-md border border-slate-200">
            <div class="flex items-center justify-between">
                <span class="text-sm font-semibold text-slate-500">Đang khiếu nại</span>
                <i data-lucide="alert-triangle" class="w-5 h-5 text-red-500"></i>
            </div>
            <div class="text-2xl font-bold text-slate-800 mt-1" id="stat-dispute">--</div>
            <p class="text-xs text-slate-400 mt-1 text-red-500">Cần được ưu tiên giải quyết</p>
        </div>
    </div>

    <!-- Status Tabs -->
    <div id="status-tabs" class="flex flex-wrap gap-2 lg:gap-4 bg-white p-4 rounded-xl shadow-md border border-slate-200 mb-6 sticky top-0 z-10 custom-scrollbar">
        <!-- Tabs will be rendered here by JS -->
    </div>

    <!-- Order List -->
    <div id="order-list" class="space-y-4">
        <!-- Order Cards will be rendered here by JS -->
    </div>

    <div id="no-orders" class="hidden text-center p-12 bg-white rounded-xl shadow-md border border-slate-200 mt-6">
        <svg class="mx-auto h-12 w-12 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
        <h3 class="mt-2 text-xl font-medium text-slate-900">Không có đơn hàng nào</h3>
        <p class="mt-1 text-sm text-slate-500">
            Hiện tại, không có đơn hàng nào trong trạng thái <strong id="current-tab-name" class="text-slate-800"></strong>.
        </p>
    </div>

</div>

<!-- ================= MODALS ================= -->

<!-- 1. Modal Hủy Đơn -->
<div id="cancelModal" class="modal-overlay">
    <div class="modal-content-animation bg-white rounded-2xl p-6 lg:p-8 w-11/12 max-w-lg shadow-2xl border border-rose-100">
        <div class="flex justify-between items-start mb-4">
            <h3 class="text-2xl font-bold text-rose-600 flex items-center gap-2">
                <i data-lucide="x-circle" class="w-6 h-6 fill-rose-100 text-rose-600"></i> Xác nhận hủy đơn
            </h3>
            <button class="text-slate-400 hover:text-slate-600" onclick="closeModal('cancelModal')"><i data-lucide="x" class="w-6 h-6"></i></button>
        </div>
        <!-- Warning luôn hiển thị PAID & REFUND -->
        <p id="cancelWarning" class="p-3 mb-4 rounded-xl text-sm font-medium bg-red-50 border border-red-200 text-red-800">
            ⚠️ Đơn này **ĐÃ THANH TOÁN**. Hệ thống sẽ tự động hoàn tiền ví cho khách.
        </p>
        <textarea id="cancelReason" placeholder="Lý do hủy (bắt buộc). Ghi rõ để khách hàng hiểu rõ hơn." class="w-full h-24 p-3 border border-slate-300 rounded-lg focus:ring-rose-500 focus:border-rose-500"></textarea>
        <button id="cancelSubmitBtn" onclick="submitShopCancel()" class="w-full mt-4 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors shadow-lg shadow-rose-500/30">
            <span class="flex items-center justify-center gap-2"><i data-lucide="x" class="w-5 h-5"></i> Xác nhận hủy đơn hàng & Hoàn tiền</span>
        </button>
    </div>
</div>

<!-- 2. Modal Ship -->
<div id="shipModal" class="modal-overlay">
    <div class="modal-content-animation bg-white rounded-2xl p-6 lg:p-8 w-11/12 max-w-xl shadow-2xl border border-sky-100">
        <div class="flex justify-between items-start mb-6">
            <h2 class="text-2xl font-bold text-sky-600 flex items-center gap-2">
                <i data-lucide="truck" class="w-6 h-6 text-sky-600"></i> Cập nhật vận chuyển
            </h2>
            <button class="text-slate-400 hover:text-slate-600" onclick="closeModal('shipModal')"><i data-lucide="x" class="w-6 h-6"></i></button>
        </div>
        <form id="shippingForm" onsubmit="submitShipping(event)">
            <input type="hidden" id="shipOrderId" name="order_id">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-group">
                    <label class="block text-sm font-semibold text-slate-700 mb-1">Đơn vị vận chuyển *</label>
                    <input type="text" name="carrier" placeholder="VD: Nhà xe Phương Trang..." required class="w-full p-2.5 border border-slate-300 rounded-lg">
                </div>
                <div class="form-group">
                    <label class="block text-sm font-semibold text-slate-700 mb-1">Mã vận đơn / Biển số *</label>
                    <input type="text" name="code" placeholder="VD: 51B-1234..." required class="w-full p-2.5 border border-slate-300 rounded-lg">
                </div>
                <div class="form-group">
                    <label class="block text-sm font-semibold text-slate-700 mb-1">Dự kiến đến *</label>
                    <input type="datetime-local" name="estimated_date" required class="w-full p-2.5 border border-slate-300 rounded-lg">
                </div>
                <div class="form-group">
                    <label class="block text-sm font-semibold text-slate-700 mb-1">Phí ship (báo khách)</label>
                    <input type="number" name="fee" class="w-full p-2.5 border border-slate-300 rounded-lg" placeholder="0">
                </div>
            </div>
            <div class="form-group mt-4">
                <label class="block text-sm font-semibold text-slate-700 mb-1">Ghi chú</label>
                <textarea name="shipping_note" placeholder="Hướng dẫn nhận hàng..." class="w-full p-2.5 border border-slate-300 rounded-lg h-20"></textarea>
            </div>
            <div class="form-group">
                <label class="block text-sm font-semibold text-slate-700 mb-1">Ảnh bill / Mã QR</label>
                <input type="file" name="image" accept="image/*" class="w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 transition duration-150">
            </div>
            <button type="submit" id="shipSubmitBtn" class="w-full mt-6 py-3 bg-sky-600 text-white font-bold rounded-xl hover:bg-sky-700 transition-colors shadow-lg shadow-sky-500/30">
                <span class="flex items-center justify-center gap-2"><i data-lucide="send" class="w-5 h-5"></i> Xác nhận đã gửi hàng</span>
            </button>
        </form>
    </div>
</div>

<!-- 3. Modal Resolve Dispute -->
<div id="resolveModal" class="modal-overlay">
    <div class="modal-content-animation bg-white rounded-2xl p-6 lg:p-8 w-11/12 max-w-lg shadow-2xl border border-red-100">
        <div class="flex justify-between items-start mb-6">
            <h2 class="text-2xl font-bold text-red-600 flex items-center gap-2">
                <i data-lucide="alert-triangle" class="w-6 h-6 text-red-600"></i> Giải quyết khiếu nại
            </h2>
            <button class="text-slate-400 hover:text-slate-600" onclick="closeModal('resolveModal')"><i data-lucide="x" class="w-6 h-6"></i></button>
        </div>
        <div class="dispute-info-box bg-red-50 border border-red-200 p-4 rounded-xl mb-4">
            <strong class="text-sm font-semibold text-red-700 flex items-center gap-2 mb-2">
                <i data-lucide="message-square" class="w-4 h-4"></i> Lý do khách báo:
            </strong>
            <p id="disputeReasonText" class="text-red-800 text-sm italic"></p>
            <a id="disputeEvidenceLink" href="#" target="_blank" class="text-xs text-sky-600 hover:underline mt-2 inline-block hidden">🔗 Xem bằng chứng (Nếu có)</a>
        </div>
        <div class="form-group">
            <label for="disputeReply" class="block text-sm font-semibold text-slate-700 mb-1">Phản hồi của Shop:</label>
            <textarea id="disputeReply" rows="3" placeholder="Giải thích lý do từ chối hoặc lời nhắn chấp nhận..." class="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-red-500 focus:border-red-500"></textarea>
        </div>
        <div class="flex gap-4 mt-6">
            <button id="resolveRefundBtn" class="flex-1 py-3 bg-slate-500 text-white font-bold rounded-xl hover:bg-slate-600 transition-colors shadow-lg shadow-slate-500/30" onclick="submitResolve('refund')">
                <span class="flex items-center justify-center gap-2"><i data-lucide="wallet" class="w-5 h-5"></i> Chấp nhận hoàn tiền</span>
            </button>
            <button id="resolveRejectBtn" class="flex-1 py-3 bg-sky-600 text-white font-bold rounded-xl hover:bg-sky-700 transition-colors shadow-lg shadow-sky-500/30" onclick="submitResolve('reject')">
                <span class="flex items-center justify-center gap-2"><i data-lucide="gavel" class="w-5 h-5"></i> Từ chối & Gửi Admin</span>
            </button>
        </div>
    </div>
</div>

<!-- ============================================== -->
<!-- NHÚNG CHAT WIDGET -->
<!-- ============================================== -->
<?php include_once '../../includes/chat_widget_include.php'; ?>

<script src="/HeThongChamSocCaKoi/assets/js/shop/order_manage.js"></script>

</body>

<?php include '../../includes/footer.php'; ?>