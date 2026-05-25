<?php
// /HeThongChamSocCaKoi/frontend/community/admin/ban_appeals.php
require_once '../../../includes/auth.php';
require_once '../../../includes/db.php';

// Chỉ admin mới được truy cập
if ($_SESSION['role'] !== 'Admin') {
    header('Location: ../index.php');
    exit;
}

$pageTitle = "Xử lý khiếu nại lệnh cộng đồng";
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $pageTitle; ?> - Hệ thống chăm sóc cá Koi</title>
    
    <!-- XÓA HOÀN TOÀN LINK CSS NGOÀI -->
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    
    <!-- TOÀN BỘ CSS INLINE -->
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f5f7fa;
            color: #333;
            line-height: 1.6;
        }
        
        .appeals-container {
            max-width: 1400px;
            margin: 20px auto;
            padding: 0 20px;
        }
        
        .appeals-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px 30px;
            border-radius: 15px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(102, 126, 234, 0.2);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .appeals-header h1 {
            font-size: 28px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .appeal-stats {
            display: flex;
            gap: 25px;
            background: rgba(255, 255, 255, 0.15);
            padding: 15px 25px;
            border-radius: 10px;
            backdrop-filter: blur(10px);
        }
        
        .stat-item {
            text-align: center;
            min-width: 100px;
        }
        
        .stat-count {
            font-size: 28px;
            font-weight: bold;
            display: block;
            line-height: 1.2;
        }
        
        .stat-label {
            font-size: 13px;
            opacity: 0.9;
            margin-top: 5px;
        }
        
        .appeals-filters {
            display: flex;
            gap: 12px;
            margin-bottom: 25px;
            flex-wrap: wrap;
            padding: 15px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        
        .filter-btn {
            padding: 10px 22px;
            border: 2px solid #e0e0e0;
            background: white;
            border-radius: 25px;
            cursor: pointer;
            transition: all 0.3s;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 8px;
            color: #555;
        }
        
        .filter-btn.active {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border-color: #667eea;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }
        
        .filter-btn:hover:not(.active) {
            background: #f8f9fa;
            border-color: #667eea;
            color: #667eea;
        }
        
        .appeals-table-container {
            background: white;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 8px 30px rgba(0,0,0,0.08);
            margin-bottom: 40px;
            min-height: 400px;
        }
        
        .appeals-table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .appeals-table th {
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            padding: 18px 24px;
            text-align: left;
            font-weight: 600;
            color: #495057;
            border-bottom: 3px solid #dee2e6;
            white-space: nowrap;
            font-size: 14px;
        }
        
        .appeals-table td {
            padding: 18px 24px;
            border-bottom: 1px solid #f1f3f4;
            vertical-align: top;
        }
        
        .appeals-table tr:hover {
            background: #f8f9ff;
        }
        
        .user-info {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .user-avatar {
            width: 45px;
            height: 45px;
            border-radius: 50%;
            object-fit: cover;
            border: 3px solid #e9ecef;
            background: #f8f9fa;
        }
        
        .user-details {
            flex: 1;
        }
        
        .user-name {
            font-weight: 600;
            color: #333;
            margin-bottom: 3px;
        }
        
        .user-username {
            font-size: 13px;
            color: #666;
        }
        
        .user-email {
            font-size: 12px;
            color: #888;
            margin-top: 2px;
        }
        
        .appeal-status {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 25px;
            font-size: 13px;
            font-weight: bold;
            text-align: center;
            min-width: 120px;
            box-shadow: 0 3px 10px rgba(0,0,0,0.1);
        }
        
        .status-pending {
            background: linear-gradient(135deg, #ff9800, #ff5722);
            color: white;
        }
        
        .status-approved {
            background: linear-gradient(135deg, #4caf50, #2e7d32);
            color: white;
        }
        
        .status-rejected {
            background: linear-gradient(135deg, #f44336, #c62828);
            color: white;
        }
        
        .ban-type {
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            display: inline-block;
            margin: 5px 0;
        }
        
        .ban-type-comment_only {
            background: #e3f2fd;
            color: #1976d2;
            border: 1px solid #bbdefb;
        }
        
        .ban-type-post_only {
            background: #f3e5f5;
            color: #7b1fa2;
            border: 1px solid #e1bee7;
        }
        
        .ban-type-full_ban {
            background: #ffebee;
            color: #d32f2f;
            border: 1px solid #ffcdd2;
        }
        
        .reason-truncated {
            max-width: 250px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            color: #555;
            font-size: 14px;
        }
        
        .action-buttons {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        
        .btn-action {
            padding: 8px 16px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s;
            min-width: 80px;
            justify-content: center;
        }
        
        .btn-view {
            background: linear-gradient(135deg, #2196f3, #1976d2);
            color: white;
        }
        
        .btn-view:hover {
            background: linear-gradient(135deg, #1976d2, #1565c0);
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(33, 150, 243, 0.3);
        }
        
        .btn-approve {
            background: linear-gradient(135deg, #4caf50, #388e3c);
            color: white;
        }
        
        .btn-approve:hover {
            background: linear-gradient(135deg, #388e3c, #2e7d32);
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(76, 175, 80, 0.3);
        }
        
        .btn-reject {
            background: linear-gradient(135deg, #f44336, #d32f2f);
            color: white;
        }
        
        .btn-reject:hover {
            background: linear-gradient(135deg, #d32f2f, #c62828);
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(244, 67, 54, 0.3);
        }
        
        .btn-info {
            background: linear-gradient(135deg, #9c27b0, #7b1fa2);
            color: white;
        }
        
        .btn-info:hover {
            background: linear-gradient(135deg, #7b1fa2, #6a1b9a);
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(156, 39, 176, 0.3);
        }
        
        .no-appeals {
            text-align: center;
            padding: 80px 20px;
            color: #666;
        }
        
        .no-appeals-icon {
            font-size: 80px;
            color: #ddd;
            margin-bottom: 20px;
            opacity: 0.5;
        }
        
        .no-appeals h3 {
            font-size: 24px;
            margin-bottom: 10px;
            color: #777;
        }
        
        .no-appeals p {
            font-size: 16px;
            color: #999;
        }
        
        .time-badge {
            font-size: 13px;
            padding: 6px 12px;
            border-radius: 15px;
            background: #f1f3f4;
            display: inline-block;
            margin: 5px 0;
            color: #555;
            border: 1px solid #e0e0e0;
        }
        
        .remaining-time {
            font-size: 12px;
            color: #666;
            margin-top: 8px;
            padding: 4px 8px;
            background: #f8f9fa;
            border-radius: 4px;
            display: inline-block;
        }
        
        .expired {
            color: #f44336;
            background: #ffebee;
            border: 1px solid #ffcdd2;
        }
        
        .loading {
            text-align: center;
            padding: 60px 20px;
        }
        
        .loading-spinner {
            width: 50px;
            height: 50px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
       
        /* ============ NÚT QUAY LẠI ============ */
        .back-to-index-btn {
            position: fixed;
            top: 100px;
            left: 20px;
            z-index: 1000;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            border-radius: 50px;
            padding: 12px 25px;
            cursor: pointer;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 5px 20px rgba(102, 126, 234, 0.3);
            transition: all 0.3s ease;
            text-decoration: none;
        }
        
        .back-to-index-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
            background: linear-gradient(135deg, #764ba2, #667eea);
        }
        
        .back-to-index-btn .material-icons {
            font-size: 20px;
        }
        
        /* ============ MODAL HORIZONTAL LAYOUT - FIX ============ */
        #appeal-modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 10000;
            overflow-y: auto;
        }

        #appeal-modal .modal-content {
            position: relative;
            width: 95%;
            max-width: 1400px;
            min-height: 600px;
            max-height: 90vh;
            background: white;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            display: flex;
            flex-direction: column;
            margin: 30px auto;
        }

        /* Header - FIXED */
        #appeal-modal .modal-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-shrink: 0;
            border-bottom: 3px solid rgba(255,255,255,0.1);
            position: sticky;
            top: 0;
            z-index: 10;
        }

        #appeal-modal .modal-header h2 {
            margin: 0;
            font-size: 22px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        #appeal-modal .modal-close-btn {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            font-size: 30px;
            cursor: pointer;
            color: white;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.3s;
        }

        #appeal-modal .modal-close-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: rotate(90deg);
        }

        /* Body - SCROLLABLE HORIZONTAL LAYOUT */
        #appeal-modal .modal-body {
            flex: 1;
            padding: 0;
            overflow: hidden;
            display: flex;
            min-height: 400px;
        }

        /* LEFT PANEL - User Info */
        #appeal-modal .modal-left-panel {
            width: 35%;
            background: #f8f9fa;
            border-right: 2px solid #e9ecef;
            overflow-y: auto;
            padding: 25px;
            min-height: 100%;
        }

        /* RIGHT PANEL - Ban Details */
        #appeal-modal .modal-right-panel {
            width: 65%;
            overflow-y: auto;
            padding: 25px;
            min-height: 100%;
        }

        /* User Card Compact */
        #appeal-modal .user-card-compact {
            background: white;
            border-radius: 15px;
            padding: 25px;
            text-align: center;
            box-shadow: 0 5px 20px rgba(0,0,0,0.08);
            margin-bottom: 25px;
            min-height: 300px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }

        #appeal-modal .user-avatar-large {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            object-fit: cover;
            border: 5px solid #667eea;
            background: white;
            margin: 0 auto 20px;
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
        }

        #appeal-modal .user-name-large {
            font-size: 28px;
            font-weight: 800;
            color: #333;
            margin-bottom: 5px;
            word-break: break-word;
        }

        #appeal-modal .user-username-large {
            font-size: 18px;
            color: #667eea;
            font-weight: 600;
            margin-bottom: 20px;
            word-break: break-word;
        }

        /* Meta Grid Compact */
        #appeal-modal .meta-grid-compact {
            display: grid;
            grid-template-columns: 1fr;
            gap: 15px;
            margin-top: 20px;
            flex: 1;
        }

        #appeal-modal .meta-item-compact {
            background: white;
            padding: 15px;
            border-radius: 10px;
            border-left: 4px solid #667eea;
            box-shadow: 0 3px 10px rgba(0,0,0,0.05);
            text-align: left;
        }

        #appeal-modal .meta-label-compact {
            font-size: 12px;
            color: #888;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 700;
            margin-bottom: 5px;
        }

        #appeal-modal .meta-value-compact {
            font-size: 16px;
            font-weight: 700;
            color: #333;
            word-break: break-word;
        }

        /* Ban Info Card */
        #appeal-modal .ban-card-compact {
            background: white;
            border-radius: 15px;
            padding: 25px;
            margin-bottom: 25px;
            border: 2px solid #e3e9ff;
            box-shadow: 0 8px 30px rgba(102, 126, 234, 0.1);
            min-height: 300px;
        }

        #appeal-modal .ban-header-compact {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            flex-wrap: wrap;
            gap: 15px;
        }

        #appeal-modal .ban-title-compact {
            font-size: 24px;
            font-weight: 800;
            color: #333;
            display: flex;
            align-items: center;
            gap: 10px;
            word-break: break-word;
        }

        /* Status Grid */
        #appeal-modal .status-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin: 20px 0;
        }

        #appeal-modal .status-item {
            background: white;
            padding: 15px;
            border-radius: 10px;
            text-align: center;
            border: 2px solid #e9ecef;
            min-height: 60px;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }

        #appeal-modal .status-label {
            font-size: 12px;
            color: #888;
            text-transform: uppercase;
            font-weight: 700;
            margin-bottom: 5px;
        }

        #appeal-modal .status-value {
            font-size: 16px;
            font-weight: 800;
            color: #333;
            word-break: break-word;
        }

        /* Reason Box Compact */
        #appeal-modal .reason-box-compact {
            background: #ffebee;
            padding: 20px;
            border-radius: 10px;
            border-left: 5px solid #f44336;
            margin: 20px 0;
        }

        #appeal-modal .reason-title-compact {
            font-size: 16px;
            font-weight: 700;
            color: #d32f2f;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        #appeal-modal .reason-text-compact {
            font-size: 14px;
            line-height: 1.6;
            color: #333;
            padding: 15px;
            background: white;
            border-radius: 8px;
            border: 1px solid #ffcdd2;
            max-height: 150px;
            overflow-y: auto;
        }

        /* Content Sections */
        #appeal-modal .content-section {
            margin: 25px 0;
            padding: 20px;
            border-radius: 10px;
            background: #f8f9fa;
            min-height: 150px;
        }

        #appeal-modal .section-title-compact {
            font-size: 18px;
            font-weight: 700;
            color: #333;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e9ecef;
        }

        #appeal-modal .content-box-compact {
            background: white;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #e9ecef;
            max-height: 150px;
            overflow-y: auto;
            font-size: 14px;
            line-height: 1.6;
            min-height: 80px;
        }

        /* Footer Compact */
        #appeal-modal .modal-footer {
            padding: 20px 30px;
            background: #f8f9fa;
            border-top: 2px solid #e9ecef;
            display: flex;
            gap: 15px;
            justify-content: flex-end;
            flex-shrink: 0;
            flex-wrap: wrap;
        }

        #appeal-modal .btn-modal-compact {
            padding: 12px 25px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-weight: 700;
            font-size: 14px;
            display: inline-flex;
            align-items: center;
            gap: 10px;
            transition: all 0.3s;
            min-width: 150px;
            justify-content: center;
            white-space: nowrap;
        }

        #appeal-modal .btn-modal-compact:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }

        /* Button Colors */
        #appeal-modal .btn-approve-xl {
            background: linear-gradient(135deg, #4caf50, #2e7d32);
            color: white;
        }

        #appeal-modal .btn-reject-xl {
            background: linear-gradient(135deg, #f44336, #c62828);
            color: white;
        }

        #appeal-modal .btn-unban-xl {
            background: linear-gradient(135deg, #ff9800, #ff5722);
            color: white;
        }

        #appeal-modal .btn-close-xl {
            background: #555;
            color: white;
        }

        /* Timeline Compact */
        #appeal-modal .timeline-compact {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin: 20px 0;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 10px;
            flex-wrap: wrap;
            gap: 10px;
        }

        #appeal-modal .timeline-item {
            text-align: center;
            flex: 1;
            min-width: 100px;
        }

        #appeal-modal .timeline-arrow {
            font-size: 24px;
            color: #667eea;
        }

        /* ============ MODAL XÁC NHẬN ============ */
        #confirm-modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            z-index: 20000;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        #confirm-modal .confirm-content {
            background: white;
            border-radius: 15px;
            max-width: 500px;
            width: 100%;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(-30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        #confirm-modal .confirm-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px 30px;
            text-align: center;
        }

        #confirm-modal .confirm-header h3 {
            margin: 0;
            font-size: 22px;
            font-weight: 600;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
        }

        #confirm-modal .confirm-body {
            padding: 30px;
            text-align: center;
            font-size: 16px;
            line-height: 1.6;
            color: #555;
            background: #f9f9f9;
        }

        #confirm-modal .confirm-icon {
            font-size: 60px;
            margin-bottom: 20px;
            display: block;
        }

        #confirm-modal .confirm-icon.warning {
            color: #ff9800;
        }

        #confirm-modal .confirm-icon.success {
            color: #4caf50;
        }

        #confirm-modal .confirm-icon.error {
            color: #f44336;
        }

        #confirm-modal .confirm-info {
            background: white;
            padding: 15px;
            border-radius: 10px;
            margin: 15px 0;
            border-left: 4px solid #667eea;
            text-align: left;
        }

        #confirm-modal .confirm-info strong {
            color: #333;
            display: block;
            margin-bottom: 5px;
        }

        #confirm-modal .confirm-footer {
            padding: 20px 30px;
            background: #f8f9fa;
            display: flex;
            gap: 15px;
            justify-content: center;
            border-top: 1px solid #e9ecef;
        }

        #confirm-modal .confirm-btn {
            padding: 12px 30px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-weight: 600;
            font-size: 15px;
            display: inline-flex;
            align-items: center;
            gap: 10px;
            transition: all 0.3s;
            min-width: 140px;
            justify-content: center;
        }

        #confirm-modal .confirm-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(0,0,0,0.15);
        }

        #confirm-modal .confirm-btn-approve {
            background: linear-gradient(135deg, #4caf50, #2e7d32);
            color: white;
        }

        #confirm-modal .confirm-btn-reject {
            background: linear-gradient(135deg, #f44336, #c62828);
            color: white;
        }

        #confirm-modal .confirm-btn-unban {
            background: linear-gradient(135deg, #ff9800, #ff5722);
            color: white;
        }

        #confirm-modal .confirm-btn-cancel {
            background: #6c757d;
            color: white;
        }

        #confirm-modal .confirm-btn-cancel:hover {
            background: #5a6268;
        }

        /* Responsive */
        @media (max-width: 1200px) {
            #appeal-modal .modal-content {
                width: 98%;
                margin: 20px auto;
            }
            
            #appeal-modal .modal-left-panel {
                width: 40%;
            }
            
            #appeal-modal .modal-right-panel {
                width: 60%;
            }
        }

        @media (max-width: 992px) {
            #appeal-modal .modal-body {
                flex-direction: column;
            }
            
            #appeal-modal .modal-left-panel,
            #appeal-modal .modal-right-panel {
                width: 100%;
                border-right: none;
                border-bottom: 2px solid #e9ecef;
                min-height: auto;
            }
            
            #appeal-modal .modal-left-panel {
                max-height: 50vh;
                overflow-y: auto;
            }
            
            #appeal-modal .modal-right-panel {
                max-height: 50vh;
                overflow-y: auto;
            }
            
            /* Điều chỉnh nút quay lại cho tablet */
            .back-to-index-btn {
                top: 80px;
                left: 15px;
                padding: 10px 20px;
                font-size: 14px;
            }
        }

        @media (max-width: 768px) {
            #appeal-modal .modal-header h2 {
                font-size: 18px;
                flex-wrap: wrap;
            }
            
            #appeal-modal .modal-header {
                padding: 15px 20px;
                flex-direction: column;
                gap: 15px;
                text-align: center;
            }
            
            #appeal-modal .modal-close-btn {
                position: absolute;
                top: 15px;
                right: 15px;
            }
            
            #appeal-modal .modal-body {
                padding: 0;
            }
            
            #appeal-modal .modal-left-panel,
            #appeal-modal .modal-right-panel {
                padding: 20px;
            }
            
            #appeal-modal .user-avatar-large {
                width: 80px;
                height: 80px;
            }
            
            #appeal-modal .user-name-large {
                font-size: 22px;
            }
            
            #appeal-modal .user-username-large {
                font-size: 16px;
            }
            
            #appeal-modal .status-grid {
                grid-template-columns: 1fr;
            }
            
            #appeal-modal .modal-footer {
                flex-direction: column;
                padding: 15px;
                gap: 10px;
            }
            
            #appeal-modal .btn-modal-compact {
                width: 100%;
                min-width: 100%;
            }
            
            #appeal-modal .timeline-compact {
                flex-direction: column;
                gap: 15px;
            }
            
            #appeal-modal .timeline-arrow {
                transform: rotate(90deg);
            }
            
            /* Điều chỉnh nút quay lại cho mobile */
            .back-to-index-btn {
                top: 70px;
                left: 10px;
                padding: 8px 15px;
                font-size: 13px;
                border-radius: 25px;
            }
            
            .back-to-index-btn .material-icons {
                font-size: 16px;
            }
            
            .appeals-header {
                padding: 20px;
                flex-direction: column;
                gap: 20px;
                text-align: center;
            }
            
            .appeals-header h1 {
                font-size: 22px;
            }
            
            .appeal-stats {
                width: 100%;
                justify-content: center;
                flex-wrap: wrap;
            }
            
            /* Confirm modal mobile */
            #confirm-modal {
                padding: 10px;
            }
            
            #confirm-modal .confirm-content {
                max-width: 100%;
            }
            
            #confirm-modal .confirm-footer {
                flex-direction: column;
            }
            
            #confirm-modal .confirm-btn {
                width: 100%;
                min-width: 100%;
            }
        }

        /* Toast Notification Styles */
        .toast-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            background: white;
            border-radius: 10px;
            padding: 15px 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            gap: 15px;
            max-width: 400px;
            transform: translateX(120%);
            transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            border-left: 5px solid;
        }

        .toast-notification.show {
            transform: translateX(0);
        }

        .toast-success {
            border-left-color: #4caf50;
            background: #f1f8e9;
        }

        .toast-error {
            border-left-color: #f44336;
            background: #ffebee;
        }

        .toast-info {
            border-left-color: #2196f3;
            background: #e3f2fd;
        }

        .toast-icon {
            font-size: 24px;
        }

        .toast-success .toast-icon {
            color: #4caf50;
        }

        .toast-error .toast-icon {
            color: #f44336;
        }

        .toast-info .toast-icon {
            color: #2196f3;
        }

        .toast-content {
            flex: 1;
        }

        .toast-title {
            font-weight: 600;
            font-size: 14px;
            margin-bottom: 3px;
            color: #333;
        }

        .toast-message {
            font-size: 13px;
            color: #666;
            line-height: 1.4;
        }

        .toast-close {
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #999;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
    </style>
</head>
<body>
    <?php include '../../../includes/header.php'; ?>
    
    <!-- NÚT QUAY LẠI TRANG INDEX -->
    <a href="../index.php" class="back-to-index-btn">
        <span class="material-icons">arrow_back</span>
        Về Trang Cộng Đồng
    </a>
    
    <div class="appeals-container">
        <div class="appeals-header">
            <h1>
                <span class="material-icons">gavel</span>
                Xử lý khiếu nại cộng đồng
            </h1>
            <div class="appeal-stats">
                <div class="stat-item">
                    <span class="stat-count" id="total-count">0</span>
                    <span class="stat-label">Tổng số</span>
                </div>
                <div class="stat-item">
                    <span class="stat-count" id="pending-count" style="color: #ff9800;">0</span>
                    <span class="stat-label">Đang chờ</span>
                </div>
                <div class="stat-item">
                    <span class="stat-count" id="approved-count" style="color: #4caf50;">0</span>
                    <span class="stat-label">Đã duyệt</span>
                </div>
                <div class="stat-item">
                    <span class="stat-count" id="rejected-count" style="color: #f44336;">0</span>
                    <span class="stat-label">Đã từ chối</span>
                </div>
            </div>
        </div>
        
        <div class="appeals-filters">
            <button class="filter-btn active" data-filter="all">
                <span class="material-icons" style="font-size: 16px;">all_inbox</span>
                Tất cả
            </button>
            <button class="filter-btn" data-filter="pending">
                <span class="material-icons" style="font-size: 16px;">pending</span>
                Đang chờ
            </button>
            <button class="filter-btn" data-filter="approved">
                <span class="material-icons" style="font-size: 16px;">check_circle</span>
                Đã duyệt
            </button>
            <button class="filter-btn" data-filter="rejected">
                <span class="material-icons" style="font-size: 16px;">cancel</span>
                Đã từ chối
            </button>
            <button class="filter-btn" data-filter="active">
                <span class="material-icons" style="font-size: 16px;">lock</span>
                Còn hiệu lực
            </button>
        </div>
        
        <div class="appeals-table-container">
            <table class="appeals-table" id="appeals-table">
                <thead>
                    <tr>
                        <th width="120">Người dùng</th>
                        <th width="150">Lệnh cấm</th>
                        <th width="250">Lý do khiếu nại</th>
                        <th width="120">Trạng thái</th>
                        <th width="150">Thời gian</th>
                        <th width="180">Hành động</th>
                    </tr>
                </thead>
                <tbody id="appeals-tbody">
                    <!-- Dữ liệu sẽ được load bằng JS -->
                    <tr id="loading-row">
                        <td colspan="6">
                            <div class="loading">
                                <div class="loading-spinner"></div>
                                <p>Đang tải danh sách khiếu nại...</p>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
            
            <div id="no-appeals-message" class="no-appeals" style="display: none;">
                <div class="no-appeals-icon">
                    <span class="material-icons">check_circle</span>
                </div>
                <h3>Không có khiếu nại nào</h3>
                <p>Hiện tại không có khiếu nại lệnh cấm nào cần xử lý.</p>
            </div>
        </div>
    </div>
    
    <!-- Modal chi tiết khiếu nại -->
    <div id="appeal-modal" class="modal">
        <div class="modal-content" id="appeal-modal-content">
            <!-- Nội dung modal sẽ được load bằng JS -->
        </div>
    </div>

    <!-- Modal xác nhận hành động -->
    <div id="confirm-modal">
        <div class="confirm-content">
            <div class="confirm-header">
                <h3 id="confirm-title">
                    <span class="material-icons">warning</span>
                    Xác nhận hành động
                </h3>
            </div>
            <div class="confirm-body">
                <span class="material-icons confirm-icon warning" id="confirm-icon">warning</span>
                <p id="confirm-message">Bạn có chắc muốn thực hiện hành động này?</p>
                <div class="confirm-info">
                    <strong>Mã khiếu nại:</strong>
                    <span id="confirm-ban-id">#000</span>
                </div>
                <p id="confirm-note" style="font-size: 14px; color: #666; margin-top: 10px;"></p>
            </div>
            <div class="confirm-footer">
                <button id="confirm-cancel-btn" class="confirm-btn confirm-btn-cancel">
                    <span class="material-icons">close</span>
                    Hủy bỏ
                </button>
                <button id="confirm-action-btn" class="confirm-btn confirm-btn-approve">
                    <span class="material-icons">check</span>
                    Xác nhận
                </button>
            </div>
        </div>
    </div>

    <!-- Toast Notification Container -->
    <div id="toast-container"></div>
    
    <script>
        // Biến global
        const BASE_URL = window.BASE_URL || '/HeThongChamSocCaKoi';
        let currentFilter = 'all';
        
        // Toast Notification System
        function showToast(title, message, type = 'success') {
            const container = document.getElementById('toast-container');
            const toastId = 'toast-' + Date.now();
            
            const toast = document.createElement('div');
            toast.className = `toast-notification toast-${type}`;
            toast.id = toastId;
            
            const icons = {
                success: 'check_circle',
                error: 'error',
                info: 'info'
            };
            
            toast.innerHTML = `
                <span class="material-icons toast-icon">${icons[type]}</span>
                <div class="toast-content">
                    <div class="toast-title">${title}</div>
                    <div class="toast-message">${message}</div>
                </div>
                <button class="toast-close" onclick="removeToast('${toastId}')">
                    <span class="material-icons">close</span>
                </button>
            `;
            
            container.appendChild(toast);
            
            // Show animation
            setTimeout(() => {
                toast.classList.add('show');
            }, 10);
            
            // Auto remove after 5 seconds
            setTimeout(() => {
                removeToast(toastId);
            }, 5000);
        }
        
        function removeToast(toastId) {
            const toast = document.getElementById(toastId);
            if (toast) {
                toast.classList.remove('show');
                setTimeout(() => {
                    toast.remove();
                }, 300);
            }
        }
        
        // ============ MODAL XÁC NHẬN ============
        let pendingAction = null;
        
        function showConfirmModal(actionType, banId, userInfo = {}) {
            const modal = document.getElementById('confirm-modal');
            const title = document.getElementById('confirm-title');
            const message = document.getElementById('confirm-message');
            const note = document.getElementById('confirm-note');
            const banIdElement = document.getElementById('confirm-ban-id');
            const icon = document.getElementById('confirm-icon');
            const actionBtn = document.getElementById('confirm-action-btn');
            const cancelBtn = document.getElementById('confirm-cancel-btn');
            
            // Cấu hình modal dựa trên loại hành động
            let config = {};
            
            switch(actionType) {
                case 'approve':
                    config = {
                        title: 'DUYỆT KHIẾU NẠI',
                        message: `Bạn có chắc muốn duyệt khiếu nại #${banId}?`,
                        note: 'Người dùng sẽ được mở khóa và có thể sử dụng cộng đồng trở lại.',
                        icon: 'check_circle',
                        iconClass: 'success',
                        btnText: 'DUYỆT NGAY',
                        btnClass: 'confirm-btn-approve',
                        action: () => processAppeal(banId, 'approve')
                    };
                    break;
                    
                case 'reject':
                    config = {
                        title: 'TỪ CHỐI KHIẾU NẠI',
                        message: `Bạn có chắc muốn từ chối khiếu nại #${banId}?`,
                        note: 'Khiếu nại sẽ bị từ chối và lệnh cấm vẫn có hiệu lực.',
                        icon: 'cancel',
                        iconClass: 'error',
                        btnText: 'TỪ CHỐI',
                        btnClass: 'confirm-btn-reject',
                        action: () => processAppeal(banId, 'reject')
                    };
                    break;
                    
                case 'unban':
                    config = {
                        title: 'MỞ KHÓA NGƯỜI DÙNG',
                        message: `Bạn có chắc muốn mở khóa người dùng ngay lập tức?`,
                        note: 'Lệnh cấm sẽ bị vô hiệu hóa và người dùng có thể sử dụng cộng đồng trở lại.',
                        icon: 'lock_open',
                        iconClass: 'warning',
                        btnText: 'MỞ KHÓA',
                        btnClass: 'confirm-btn-unban',
                        action: () => removeBan(banId)
                    };
                    break;
            }
            
            // Cập nhật nội dung modal
            title.innerHTML = `<span class="material-icons">${config.icon}</span> ${config.title}`;
            message.textContent = config.message;
            note.textContent = config.note;
            banIdElement.textContent = `#${banId}`;
            icon.textContent = config.icon;
            icon.className = `material-icons confirm-icon ${config.iconClass}`;
            
            // Cập nhật nút xác nhận
            actionBtn.innerHTML = `<span class="material-icons">${config.icon}</span> ${config.btnText}`;
            actionBtn.className = `confirm-btn ${config.btnClass}`;
            
            // Lưu action để thực hiện sau
            pendingAction = config.action;
            
            // Hiển thị modal
            modal.style.display = 'flex';
            
            // Thêm sự kiện
            const confirmAction = () => {
                modal.style.display = 'none';
                if (pendingAction) pendingAction();
            };
            
            const cancelAction = () => {
                modal.style.display = 'none';
                pendingAction = null;
            };
            
            // Gán sự kiện mới
            actionBtn.onclick = confirmAction;
            cancelBtn.onclick = cancelAction;
            
            // Đóng modal khi click bên ngoài
            modal.onclick = function(e) {
                if (e.target === this) cancelAction();
            };
        }
        
        // Load danh sách khiếu nại
        async function loadAppeals(filter = 'all') {
            try {
                currentFilter = filter;
                const tbody = document.getElementById('appeals-tbody');
                const noAppealsMsg = document.getElementById('no-appeals-message');
                
                // Hiển thị loading
                tbody.innerHTML = `
                    <tr id="loading-row">
                        <td colspan="6">
                            <div class="loading">
                                <div class="loading-spinner"></div>
                                <p>Đang tải danh sách khiếu nại...</p>
                            </div>
                        </td>
                    </tr>
                `;
                
                const response = await fetch(`${BASE_URL}/backend/api/community/admin/get_all_appeals.php?filter=${filter}`);
                
                if (!response.ok) {
                    throw new Error('Lỗi kết nối đến máy chủ');
                }
                
                const data = await response.json();
                
                if (data.success && data.data && data.data.length > 0) {
                    // Cập nhật thống kê
                    updateStats(data.data);
                    
                    // Render bảng
                    tbody.innerHTML = data.data.map(appeal => {
                        return `
                        <tr data-ban-id="${appeal.BanID}" data-status="${appeal.AppealStatus}">
                            <td>
                                <div class="user-info">
                                    <img src="${getAvatarUrl(appeal.UserAvatar, appeal.UserUsername)}" 
                                    class="user-avatar" 
                                    alt="${escapeHtml(appeal.UserFullName || appeal.UserUsername)}"
                                    onerror="this.onerror=null; this.src='${getAvatarFallback(appeal.UserUsername)}'">
                                    <div class="user-details">
                                        <div class="user-name">${escapeHtml(getDisplayName(appeal))}</div>
                                        <div class="user-username">@${escapeHtml(appeal.UserUsername || 'unknown')}</div>
                                        ${appeal.UserEmail ? `<div class="user-email">${escapeHtml(appeal.UserEmail)}</div>` : ''}
                                    </div>
                                </div>
                            </td>
                            <td>
                                <div>
                                    <strong>Mã: #${appeal.BanID}</strong>
                                    <div class="ban-type ban-type-${appeal.BanType}">
                                        ${appeal.BanType === 'comment_only' ? 'Chỉ bình luận' : 
                                          appeal.BanType === 'post_only' ? 'Chỉ đăng bài' : 
                                          'Toàn bộ cộng đồng'}
                                    </div>
                                    <div class="reason-truncated" title="${escapeHtml(appeal.Reason)}">
                                        ${escapeHtml(appeal.Reason.length > 50 ? appeal.Reason.substring(0, 50) + '...' : appeal.Reason)}
                                    </div>
                                </div>
                            </td>
                            <td>
                                <div class="reason-truncated" title="${escapeHtml(appeal.AppealReason || 'Không có')}">
                                    ${escapeHtml((appeal.AppealReason || 'Không có').length > 80 ? 
                                        appeal.AppealReason.substring(0, 80) + '...' : 
                                        appeal.AppealReason || 'Không có')}
                                </div>
                            </td>
                            <td>
                                <span class="appeal-status status-${appeal.AppealStatus}">
                                    ${getAppealStatusText(appeal.AppealStatus)}
                                </span>
                                ${appeal.RemainingTime ? `
                                <div class="remaining-time ${appeal.RemainingTime.includes('hết hạn') ? 'expired' : ''}">
                                    ${appeal.RemainingTime}
                                </div>
                                ` : ''}
                            </td>
                            <td>
                                <div class="time-badge">
                                    ${formatDate(appeal.AppealSubmittedAt || appeal.CreatedAt)}
                                </div>
                                <div class="time-badge" style="background: #e8f5e8; margin-top: 5px;">
                                    Cấm: ${formatDate(appeal.BannedAt)}
                                </div>
                            </td>
                            <td>
                                <div class="action-buttons">
                                    <button class="btn-action btn-view" onclick="viewAppealDetail(${appeal.BanID})">
                                        <span class="material-icons" style="font-size: 14px;">visibility</span>
                                        Xem
                                    </button>
                                    ${appeal.AppealStatus === 'pending' ? `
                                    <button class="btn-action btn-approve" onclick="showConfirmModal('approve', ${appeal.BanID})">
                                        <span class="material-icons" style="font-size: 14px;">check</span>
                                        Duyệt
                                    </button>
                                    <button class="btn-action btn-reject" onclick="showConfirmModal('reject', ${appeal.BanID})">
                                        <span class="material-icons" style="font-size: 14px;">close</span>
                                        Từ chối
                                    </button>
                                    ` : ''}
                                    ${appeal.IsActive == 1 ? `
                                    <button class="btn-action btn-info" onclick="showConfirmModal('unban', ${appeal.BanID})">
                                        <span class="material-icons" style="font-size: 14px;">lock_open</span>
                                        Mở cấm
                                    </button>
                                    ` : ''}
                                </div>
                            </td>
                        </tr>
                    `;
                    }).join('');
                    
                    tbody.style.display = '';
                    noAppealsMsg.style.display = 'none';
                    
                } else {
                    tbody.innerHTML = '';
                    tbody.style.display = 'none';
                    noAppealsMsg.style.display = 'block';
                    updateStats([]);
                }
                
            } catch (error) {
                console.error('Error loading appeals:', error);
                showToast('Lỗi tải dữ liệu', 'Không thể tải danh sách khiếu nại. Vui lòng thử lại sau.', 'error');
                
                // Hiển thị thông báo lỗi trong bảng
                const tbody = document.getElementById('appeals-tbody');
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 40px; color: #f44336;">
                            <span class="material-icons" style="font-size: 48px; margin-bottom: 15px; display: block;">error</span>
                            <h3>Lỗi kết nối</h3>
                            <p>Không thể tải danh sách khiếu nại. Vui lòng kiểm tra kết nối và thử lại.</p>
                            <button onclick="loadAppeals(currentFilter)" style="margin-top: 15px; padding: 10px 20px; background: #2196f3; color: white; border: none; border-radius: 5px; cursor: pointer;">
                                <span class="material-icons" style="vertical-align: middle; margin-right: 5px;">refresh</span>
                                Thử lại
                            </button>
                        </td>
                    </tr>
                `;
            }
        }
        
        // Hàm lấy tên hiển thị
        function getDisplayName(appeal) {
            let displayName = appeal.UserFullName || appeal.UserUsername || 'Người dùng';
            
            if (!displayName || displayName === 'Người dùng' || displayName === 'NULL' || displayName === 'null') {
                displayName = appeal.UserUsername || `User #${appeal.UserID}`;
            }
            
            return displayName;
        }
        
        // Cập nhật thống kê
        function updateStats(appeals) {
            const total = appeals.length;
            const pending = appeals.filter(a => a.AppealStatus === 'pending').length;
            const approved = appeals.filter(a => a.AppealStatus === 'approved').length;
            const rejected = appeals.filter(a => a.AppealStatus === 'rejected').length;
            
            document.getElementById('total-count').textContent = total;
            document.getElementById('pending-count').textContent = pending;
            document.getElementById('approved-count').textContent = approved;
            document.getElementById('rejected-count').textContent = rejected;
        }
        
        // Xem chi tiết khiếu nại
        async function viewAppealDetail(banId) {
            try {
                const response = await fetch(`${BASE_URL}/backend/api/community/admin/get_appeal.php?ban_id=${banId}`);
                const data = await response.json();
                
                if (data.success && data.data) {
                    const appeal = data.data.appeal;
                    const user = data.data.user;
                    
                    // Status mapping
                    const statusMap = {
                        'pending': { text: 'ĐANG CHỜ XỬ LÝ', class: 'badge-pending-xl', icon: 'pending', color: '#ff9800' },
                        'approved': { text: 'ĐÃ DUYỆT', class: 'badge-approved-xl', icon: 'check_circle', color: '#4caf50' },
                        'rejected': { text: 'ĐÃ TỪ CHỐI', class: 'badge-rejected-xl', icon: 'cancel', color: '#f44336' }
                    };
                    
                    const statusInfo = statusMap[appeal.AppealStatus] || { 
                        text: appeal.AppealStatus.toUpperCase(), 
                        class: 'badge-pending-xl', 
                        icon: 'help',
                        color: '#666' 
                    };
                    
                    const modalContent = document.getElementById('appeal-modal-content');
                    modalContent.innerHTML = `
                        <!-- Header -->
                        <div class="modal-header">
                            <h2>
                                <span class="material-icons">gavel</span>
                                KHIẾU NẠI LỆNH CẤM #${appeal.BanID}
                            </h2>
                            <button class="modal-close-btn" onclick="closeModal()">×</button>
                        </div>
                        
                        <!-- Body - HORIZONTAL LAYOUT -->
                        <div class="modal-body">
                            <!-- LEFT PANEL - User Info -->
                            <div class="modal-left-panel">
                                <!-- User Card -->
                                <div class="user-card-compact">
                                    <img src="${user.AvatarURL}" 
                                        class="user-avatar-large" 
                                        alt="${escapeHtml(user.FullName)}"
                                        onerror="this.onerror=null; this.src='${getAvatarFallback(user.Username)}'">
                                    <div class="user-name-large">${escapeHtml(user.FullName || user.Username)}</div>
                                    <div class="user-username-large">@${escapeHtml(user.Username)}</div>
                                    
                                    <div class="meta-grid-compact">
                                        <div class="meta-item-compact">
                                            <div class="meta-label-compact">ID NGƯỜI DÙNG</div>
                                            <div class="meta-value-compact">${user.UserID}</div>
                                        </div>
                                        
                                        <div class="meta-item-compact">
                                            <div class="meta-label-compact">VAI TRÒ</div>
                                            <div class="meta-value-compact">${user.Role}</div>
                                        </div>
                                        
                                        <div class="meta-item-compact">
                                            <div class="meta-label-compact">EMAIL</div>
                                            <div class="meta-value-compact">${escapeHtml(user.Email || 'Chưa có')}</div>
                                        </div>
                                        
                                        <div class="meta-item-compact">
                                            <div class="meta-label-compact">THAM GIA</div>
                                            <div class="meta-value-compact">${user.CreatedAt ? formatDate(user.CreatedAt) : 'Không rõ'}</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Quick Stats -->
                                <div class="ban-card-compact">
                                    <h3 class="section-title-compact">
                                        <span class="material-icons">assessment</span>
                                        THỐNG KÊ NHANH
                                    </h3>
                                    
                                    <div class="status-grid">
                                        <div class="status-item">
                                            <div class="status-label">TRẠNG THÁI</div>
                                            <div class="status-value" style="color: ${statusInfo.color};">
                                                ${statusInfo.text}
                                            </div>
                                        </div>
                                        
                                        <div class="status-item">
                                            <div class="status-label">LOẠI CẤM</div>
                                            <div class="status-value">
                                                ${appeal.BanType === 'comment_only' ? 'CHỈ BÌNH LUẬN' : 
                                                appeal.BanType === 'post_only' ? 'CHỈ ĐĂNG BÀI' : 
                                                'TOÀN BỘ'}
                                            </div>
                                        </div>
                                        
                                        <div class="status-item">
                                            <div class="status-label">THỜI HẠN</div>
                                            <div class="status-value">${appeal.BanDuration} ngày</div>
                                        </div>
                                        
                                        <div class="status-item">
                                            <div class="status-label">TRẠNG THÁI CẤM</div>
                                            <div class="status-value" style="color: ${appeal.IsActive == 1 ? '#f44336' : '#4caf50'};">
                                                ${appeal.IsActive == 1 ? 'ĐANG HIỆU LỰC' : 'ĐÃ HẾT HẠN'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- RIGHT PANEL - Ban Details -->
                            <div class="modal-right-panel">
                                <!-- Ban Info -->
                                <div class="ban-card-compact">
                                    <div class="ban-header-compact">
                                        <div class="ban-title-compact">
                                            <span class="material-icons">assignment</span>
                                            LỆNH CẤM #${appeal.BanID}
                                        </div>
                                    </div>
                                    
                                    <!-- Timeline -->
                                    <div style="display: flex; align-items: center; justify-content: space-between; margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 10px;">
                                        <div style="text-align: center;">
                                            <div style="font-size: 12px; color: #888; margin-bottom: 5px;">THỜI ĐIỂM CẤM</div>
                                            <div style="font-weight: 700; color: #333;">${formatDate(appeal.BannedAt)}</div>
                                        </div>
                                        <div style="font-size: 24px; color: #667eea;">→</div>
                                        <div style="text-align: center;">
                                            <div style="font-size: 12px; color: #888; margin-bottom: 5px;">HẾT HẠN</div>
                                            <div style="font-weight: 700; color: #333;">${appeal.ExpiresAt ? formatDate(appeal.ExpiresAt) : 'VĨNH VIỄN'}</div>
                                        </div>
                                        <div style="font-size: 24px; color: #667eea;">→</div>
                                        <div style="text-align: center;">
                                            <div style="font-size: 12px; color: #888; margin-bottom: 5px;">ĐÃ CẤM</div>
                                            <div style="font-weight: 700; color: #333;">${getDaysSince(appeal.BannedAt)} ngày</div>
                                        </div>
                                    </div>
                                    
                                    <!-- Reason -->
                                    <div class="reason-box-compact">
                                        <div class="reason-title-compact">
                                            <span class="material-icons">warning</span>
                                            LÝ DO CẤM
                                        </div>
                                        <div class="reason-text-compact">
                                            ${escapeHtml(appeal.Reason)}
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Violation Content -->
                                ${appeal.ViolationContent ? `
                                <div class="content-section">
                                    <h3 class="section-title-compact">
                                        <span class="material-icons">description</span>
                                        NỘI DUNG VI PHẠM
                                    </h3>
                                    <div class="content-box-compact">
                                        <strong>Loại vi phạm:</strong> ${appeal.ViolationType || 'Không xác định'}<br><br>
                                        ${escapeHtml(appeal.ViolationContent || 'Nội dung không khả dụng')}
                                    </div>
                                </div>
                                ` : ''}
                                
                                <!-- Appeal Content -->
                                ${appeal.AppealReason && appeal.AppealReason !== 'Không có' ? `
                                <div class="content-section">
                                    <h3 class="section-title-compact">
                                        <span class="material-icons">feedback</span>
                                        KHIẾU NẠI CỦA NGƯỜI DÙNG
                                    </h3>
                                    <div class="content-box-compact">
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                            <strong>Thời gian gửi:</strong>
                                            <span>${formatDate(appeal.AppealSubmittedAt)}</span>
                                        </div>
                                        ${escapeHtml(appeal.AppealReason)}
                                    </div>
                                </div>
                                ` : ''}
                                
                                <!-- Admin Response -->
                                ${appeal.AppealResponse && appeal.AppealResponse.trim() !== '' ? `
                                <div class="content-section">
                                    <h3 class="section-title-compact">
                                        <span class="material-icons">admin_panel_settings</span>
                                        PHẢN HỒI QUẢN TRỊ VIÊN
                                    </h3>
                                    <div class="content-box-compact">
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                            <strong>Thời gian phản hồi:</strong>
                                            <span>${formatDate(appeal.AppealReviewedAt)}</span>
                                        </div>
                                        ${escapeHtml(appeal.AppealResponse)}
                                    </div>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                        
                        <!-- Footer -->
                        <div class="modal-footer">
                            ${appeal.AppealStatus === 'pending' ? `
                            <button class="btn-modal-compact btn-approve-xl" onclick="showConfirmModal('approve', ${banId})">
                                <span class="material-icons">check</span>
                                DUYỆT
                            </button>
                            <button class="btn-modal-compact btn-reject-xl" onclick="showConfirmModal('reject', ${banId})">
                                <span class="material-icons">close</span>
                                TỪ CHỐI
                            </button>
                            ` : ''}
                            
                            ${appeal.IsActive == 1 ? `
                            <button class="btn-modal-compact btn-unban-xl" onclick="showConfirmModal('unban', ${banId})">
                                <span class="material-icons">lock_open</span>
                                MỞ KHÓA
                            </button>
                            ` : ''}
                            
                            <button class="btn-modal-compact btn-close-xl" onclick="closeModal()">
                                <span class="material-icons">close</span>
                                ĐÓNG
                            </button>
                        </div>
                    `;
                    
                    // Hiển thị modal
                    document.getElementById('appeal-modal').style.display = 'block';
                    
                } else {
                    showToast('Lỗi tải dữ liệu', 'Không thể tải chi tiết khiếu nại. Vui lòng thử lại.', 'error');
                }
            } catch (error) {
                console.error('Error loading appeal detail:', error);
                showToast('Lỗi kết nối', 'Không thể kết nối đến máy chủ để tải chi tiết.', 'error');
            }
        }

        // Thêm helper function tính số ngày
        function getDaysSince(dateString) {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays;
        }
        
        // Xử lý khiếu nại
        async function processAppeal(banId, action) {
            try {
                const response = await fetch(`${BASE_URL}/backend/api/community/admin/process_appeal.php`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: `ban_id=${banId}&action=${action}`
                });
                
                const text = await response.text();
                let data;
                
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    showToast('Lỗi hệ thống', 'Phản hồi từ máy chủ không đúng định dạng.', 'error');
                    return;
                }
                
                if (data.success) {
                    const successMessage = action === 'approve' 
                        ? `Đã duyệt khiếu nại #${banId} thành công. Người dùng đã được mở chặn.` 
                        : `Đã từ chối khiếu nại #${banId} thành công.`;
                    
                    const toastTitle = action === 'approve' ? '✅ DUYỆT THÀNH CÔNG' : '✅ TỪ CHỐI THÀNH CÔNG';
                    
                    showToast(toastTitle, successMessage, 'success');
                    closeModal();
                    loadAppeals(currentFilter);
                } else {
                    const errorMessage = data.error || 'Không thể xử lý yêu cầu. Vui lòng thử lại sau.';
                    showToast('❌ LỖI XỬ LÝ', errorMessage, 'error');
                }
            } catch (error) {
                console.error('Network error:', error);
                showToast('❌ LỖI KẾT NỐI', 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.', 'error');
            }
        }
        
        // Xóa lệnh cấm
        async function removeBan(banId) {
            try {
                const response = await fetch(`${BASE_URL}/backend/api/community/admin/remove_ban.php`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: `ban_id=${banId}`
                });
                
                const text = await response.text();
                let data;
                
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    showToast('Lỗi hệ thống', 'Phản hồi từ máy chủ không đúng định dạng.', 'error');
                    return;
                }
                
                if (data.success) {
                    showToast('✅ MỞ CHẶN THÀNH CÔNG', `Đã mở chặn cho người dùng thành công. Lệnh cấm #${banId} đã bị vô hiệu hóa.`, 'success');
                    closeModal();
                    loadAppeals(currentFilter);
                } else {
                    const errorMessage = data.error || 'Không thể mở chặn. Vui lòng thử lại sau.';
                    showToast('❌ LỖI MỞ CHẶN', errorMessage, 'error');
                }
            } catch (error) {
                console.error('Network error:', error);
                showToast('❌ LỖI KẾT NỐI', 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.', 'error');
            }
        }
        
        // Đóng modal
        function closeModal() {
            document.getElementById('appeal-modal').style.display = 'none';
        }
        
        // Helper functions
        function escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        function formatDate(dateString) {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            return date.toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        function getAppealStatusText(status) {
            const map = {
                'pending': '⏳ Đang chờ',
                'approved': '✅ Đã duyệt',
                'rejected': '❌ Đã từ chối',
                'none': '❌ Chưa khiếu nại',
                'reviewed': '👁️ Đã xem xét'
            };
            return map[status] || status;
        }
        
        // ============ HÀM XỬ LÝ AVATAR ============
        function getAvatarUrl(avatarPath, username) {
            const avatarFile = avatarPath || '';
            
            // Nếu là tên file avatar mặc định
            if (!avatarFile || 
                avatarFile === 'null' || 
                avatarFile === 'undefined' ||
                avatarFile === 'default.png' ||
                avatarFile === 'default-avatar.png') {
                
                // Tạo avatar từ chữ cái đầu username
                const firstLetter = (username || 'U').charAt(0).toUpperCase();
                const colors = ['667eea', '764ba2', 'f56565', 'ed8936', 'ecc94b'];
                const colorIndex = username ? username.length % colors.length : 0;
                return `https://ui-avatars.com/api/?name=${encodeURIComponent(firstLetter)}&background=${colors[colorIndex]}&color=fff&size=100`;
            }
            
            // Nếu là đường dẫn đầy đủ http/https
            if (avatarFile.startsWith('http://') || avatarFile.startsWith('https://')) {
                return avatarFile;
            }
            
            // Nếu là đường dẫn tương đối bắt đầu bằng /
            if (avatarFile.startsWith('/')) {
                return BASE_URL + avatarFile;
            }
            
            // Nếu chỉ là tên file (không có đường dẫn)
            return BASE_URL + '/uploads/avatars/' + avatarFile;
        }

        function getAvatarFallback(username) {
            const firstLetter = (username || 'U').charAt(0).toUpperCase();
            return `https://ui-avatars.com/api/?name=${encodeURIComponent(firstLetter)}&background=667eea&color=fff&size=100`;
        }
        
        // Setup filters
        document.addEventListener('DOMContentLoaded', () => {
            // Thêm sự kiện cho filter buttons
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    loadAppeals(this.dataset.filter);
                });
            });
            
            // Load lần đầu
            loadAppeals('all');
            
            // Auto refresh mỗi 30 giây
            setInterval(() => {
                loadAppeals(currentFilter);
            }, 30000);
            
            // Đóng modal khi click bên ngoài
            document.getElementById('appeal-modal').addEventListener('click', function(e) {
                if (e.target === this) {
                    closeModal();
                }
            });
        });
    </script>
</body>
</html>