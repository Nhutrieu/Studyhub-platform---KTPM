<?php
// /HeThongChamSocCaKoi/backend/api/customer/water_params/lastest.php
header('Content-Type: application/json; charset=utf-8');
if (session_status()===PHP_SESSION_NONE) session_start();
require_once '../../../../includes/db.php';

function bail($m,$c=400){ http_response_code($c); echo json_encode(['success'=>false,'error'=>$m], JSON_UNESCAPED_UNICODE); exit; }

if (empty($_GET['pond_id'])) bail('pond_id required');
$pondId = (int)$_GET['pond_id'];
if ($pondId<=0) bail('pond_id invalid');

if (empty($_SESSION['username'])) bail('Unauthorized',401);
$u = $_SESSION['username'];
$st = $conn->prepare("SELECT UserID FROM Users WHERE Username=?");
$st->bind_param("s",$u); $st->execute();
$uid = ($st->get_result()->fetch_assoc()['UserID'] ?? null);
if (!$uid) bail('Unauthorized',401);

// verify pond ownership
$chk = $conn->prepare("SELECT PondID FROM Pond WHERE PondID=? AND UserID=?");
$chk->bind_param("ii",$pondId,$uid);
$chk->execute();
if (!$chk->get_result()->fetch_assoc()) bail('Forbidden',403);

$sql = "SELECT ParameterID, PondID, RecordedAt, Salt
        FROM WaterParameter
        WHERE PondID=?
        ORDER BY RecordedAt DESC, ParameterID DESC
        LIMIT 1";
$stm = $conn->prepare($sql);
$stm->bind_param("i",$pondId);
$stm->execute();
$row = $stm->get_result()->fetch_assoc();

echo json_encode(['success'=>true,'item'=>$row ?: null], JSON_UNESCAPED_UNICODE);
