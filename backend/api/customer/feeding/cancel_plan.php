<?php
header('Content-Type: application/json; charset=utf-8');
require_once '../../../../includes/db.php';
if (empty($_POST['plan_id'])) { echo json_encode(['success'=>false,'error'=>'plan_id required']); exit; }
$pid = intval($_POST['plan_id']);
$conn->query("UPDATE FeedingPlan SET Status='cancelled' WHERE PlanID=$pid");
echo json_encode(['success'=>true]);
