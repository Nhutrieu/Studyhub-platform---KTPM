import { Review, Product, User } from '../utils/models';

const reviewTemplates = [
    {
        ratings: [5, 5, 5, 4, 4],
        comments: [
            "Sản phẩm rất đẹp và chất lượng tốt. Giao hàng nhanh, đóng gói cẩn thận. Tôi rất hài lòng với sản phẩm này!",
            "Tuyệt vời! Sản phẩm đúng như mô tả, chất lượng vượt mong đợi. Gia đình tôi rất thích. Sẽ mua thêm trong tương lai.",
            "Rất ấn tượng với chất lượng sản phẩm. Màu sắc đẹp, thiết kế hiện đại. Phù hợp với không gian phòng khách của tôi.",
            "Sản phẩm tốt, giá cả hợp lý. Tuy nhiên cần cải thiện thêm về phần đóng gói để tránh trầy xước nhẹ khi vận chuyển.",
            "Chất lượng ổn định, thiết kế đẹp. Phù hợp với nội thất hiện đại. Giao hàng đúng hẹn, nhân viên thân thiện.",
        ],
    },
    {
        ratings: [5, 4, 5, 5, 4],
        comments: [
            "Sản phẩm đẹp, chất lượng cao cấp. Màu sắc chính xác như hình ảnh. Rất đáng giá tiền!",
            "Tốt, nhưng cần thời gian để lắp đặt. Sau khi hoàn thành thì rất hài lòng với kết quả.",
            "Xuất sắc! Sản phẩm vượt quá mong đợi. Chất liệu tốt, bền đẹp. Khuyến nghị mọi người nên mua.",
            "Rất hài lòng! Sản phẩm đẹp, chắc chắn. Phù hợp với không gian sống hiện đại. Giao hàng nhanh chóng.",
            "Chất lượng tốt, thiết kế tinh tế. Tuy nhiên giá hơi cao so với một số sản phẩm tương tự trên thị trường.",
        ],
    },
    {
        ratings: [5, 5, 4, 5, 4],
        comments: [
            "Tuyệt vời! Sản phẩm đúng như mô tả, chất lượng vượt mong đợi. Gia đình tôi rất thích. Sẽ mua thêm trong tương lai.",
            "Rất ấn tượng với chất lượng sản phẩm. Màu sắc đẹp, thiết kế hiện đại. Phù hợp với không gian phòng khách của tôi.",
            "Sản phẩm tốt, giá cả hợp lý. Tuy nhiên cần cải thiện thêm về phần đóng gói để tránh trầy xước nhẹ khi vận chuyển.",
            "Chất lượng ổn định, thiết kế đẹp. Phù hợp với nội thất hiện đại. Giao hàng đúng hẹn, nhân viên thân thiện.",
            "Sản phẩm đẹp, chất lượng cao cấp. Màu sắc chính xác như hình ảnh. Rất đáng giá tiền!",
        ],
    },
    {
        ratings: [4, 5, 5, 4, 5],
        comments: [
            "Sản phẩm đẹp, chất lượng tốt. Giao hàng nhanh, đóng gói cẩn thận. Tôi rất hài lòng với sản phẩm này!",
            "Tuyệt vời! Sản phẩm đúng như mô tả, chất lượng vượt mong đợi. Gia đình tôi rất thích. Sẽ mua thêm trong tương lai.",
            "Rất ấn tượng với chất lượng sản phẩm. Màu sắc đẹp, thiết kế hiện đại. Phù hợp với không gian phòng khách của tôi.",
            "Sản phẩm tốt, giá cả hợp lý. Tuy nhiên cần cải thiện thêm về phần đóng gói để tránh trầy xước nhẹ khi vận chuyển.",
            "Chất lượng ổn định, thiết kế đẹp. Phù hợp với nội thất hiện đại. Giao hàng đúng hẹn, nhân viên thân thiện.",
        ],
    },
    {
        ratings: [5, 4, 5, 5, 4],
        comments: [
            "Sản phẩm đẹp, chất lượng cao cấp. Màu sắc chính xác như hình ảnh. Rất đáng giá tiền!",
            "Tốt, nhưng cần thời gian để lắp đặt. Sau khi hoàn thành thì rất hài lòng với kết quả.",
            "Xuất sắc! Sản phẩm vượt quá mong đợi. Chất liệu tốt, bền đẹp. Khuyến nghị mọi người nên mua.",
            "Rất hài lòng! Sản phẩm đẹp, chắc chắn. Phù hợp với không gian sống hiện đại. Giao hàng nhanh chóng.",
            "Chất lượng tốt, thiết kế tinh tế. Tuy nhiên giá hơi cao so với một số sản phẩm tương tự trên thị trường.",
        ],
    },
];

const customerNames = [
    "Nguyễn Văn An",
    "Trần Thị Bình",
    "Lê Minh Cường",
    "Phạm Thị Dung",
    "Hoàng Văn Đức",
    "Vũ Thị Hoa",
    "Đặng Văn Hùng",
    "Bùi Thị Lan",
    "Ngô Văn Long",
    "Đỗ Thị Mai",
    "Võ Văn Nam",
    "Lý Thị Oanh",
    "Phan Văn Phúc",
    "Trương Thị Quỳnh",
    "Đinh Văn Sơn",
    "Cao Thị Tâm",
    "Lưu Văn Tuấn",
    "Dương Thị Uyên",
    "Tạ Văn Việt",
    "Lâm Thị Xuân",
];

export async function seedReviews() {
    console.log('⭐ Seeding Reviews...');

    const products = await Product.find({ isActive: true });
    const customers = await User.find({ role: 'customer' });

    if (products.length === 0) {
        console.log('⚠️  No products found. Skipping reviews seed.');
        return [];
    }

    if (customers.length === 0) {
        console.log('⚠️  No customers found. Skipping reviews seed.');
        return [];
    }

    await Review.deleteMany({});
    console.log('🗑️  Cleared existing reviews.');

    const results = [];
    let reviewIndex = 0;

    for (const product of products) {
        const reviewCount = Math.floor(Math.random() * 6) + 3;
        const templateIndex = Math.floor(Math.random() * reviewTemplates.length);
        const template = reviewTemplates[templateIndex];

        for (let i = 0; i < reviewCount; i++) {
            const customer = customers[Math.floor(Math.random() * customers.length)];
            const ratingIndex = i % template.ratings.length;
            const rating = template.ratings[ratingIndex];
            const comment = template.comments[ratingIndex];
            const customerName = customerNames[reviewIndex % customerNames.length] || customer.name || 'Khách hàng';

            const review = await Review.create({
                productId: product._id,
                customerId: customer._id,
                customerName: customerName,
                rating: rating,
                comment: comment,
                images: [],
                isVerified: Math.random() > 0.3,
            });

            results.push(review);
            reviewIndex++;
        }
    }

    for (const product of products) {
        const productReviews = await Review.find({ productId: product._id });
        
        if (productReviews.length > 0) {
            const avgRating = productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length;
            const roundedRating = Math.round(avgRating * 10) / 10;

            await Product.findByIdAndUpdate(product._id, {
                rating: roundedRating,
                reviewCount: productReviews.length,
            });
        }
    }

    console.log(`✅ Seeded ${results.length} reviews for ${products.length} products.`);
    return results;
}


