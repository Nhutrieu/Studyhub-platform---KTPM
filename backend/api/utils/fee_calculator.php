<?php
// backend/api/utils/fee_calculator.php

function calculatePlatformFee($totalAmount) {
    $fee = 0;
    
    // Logic phí bậc thang:
    // < 3tr: 8%
    // 3tr - 50tr: 6%
    // > 50tr: 4%
    
    if ($totalAmount < 3000000) {
        $fee = $totalAmount * 0.08; 
    } elseif ($totalAmount <= 50000000) {
        $fee = $totalAmount * 0.06; 
    } else {
        $fee = $totalAmount * 0.04; 
    }

    // Mức trần (Max Cap): Tối đa 5 triệu
    $maxFee = 5000000; 
    if ($fee > $maxFee) {
        $fee = $maxFee;
    }

    return $fee;
}
?>