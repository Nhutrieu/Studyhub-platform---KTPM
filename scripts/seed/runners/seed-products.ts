
import { Product, Category } from '../utils/models';

// Mô tả chi tiết sản phẩm bằng tiếng Việt
const productDescriptions: Record<string, string> = {
    'Luxury Leather Sofa': `Sofa da cao cấp với thiết kế sang trọng, mang đến không gian sống đẳng cấp. Sản phẩm được làm từ da thật 100%, đảm bảo độ bền và sự thoải mái tối đa.

**Đặc điểm nổi bật:**
- Chất liệu da thật cao cấp, mềm mại và bền đẹp
- Khung gỗ chắc chắn, chịu lực tốt lên đến 300kg
- Đệm mút cao su tự nhiên, êm ái và đàn hồi tốt
- Thiết kế hiện đại, phù hợp mọi không gian phòng khách
- Màu sắc đa dạng: Đen, Nâu, Xám

**Kích thước:** 200 x 90 x 85 cm
**Bảo hành:** 3 năm chính hãng
**Vận chuyển:** Miễn phí trong nội thành`,

    'Fabric Sectional Sofa': `Bộ sofa góc vải với thiết kế modular linh hoạt, tạo không gian nghỉ ngơi và giải trí lý tưởng cho gia đình. Sản phẩm kết hợp giữa vẻ đẹp và tính năng thực tiễn.

**Đặc điểm nổi bật:**
- Chất liệu vải chống bám bẩn, dễ vệ sinh
- Thiết kế modular, có thể tùy chỉnh theo không gian
- Đệm ngồi và tựa lưng êm ái, thoải mái
- Phù hợp cho phòng khách rộng từ 25m² trở lên
- Màu sắc: Xám, Beige

**Kích thước:** 250 x 150 x 80 cm
**Bảo hành:** 2 năm chính hãng
**Lắp đặt:** Miễn phí tại nhà`,

    'Velvet Armchair': `Ghế bành nhung sang trọng với thiết kế cổ điển hiện đại, tạo điểm nhấn cho không gian sống. Sản phẩm được làm từ nhung cao cấp, mềm mại và sang trọng.

**Đặc điểm nổi bật:**
- Chất liệu nhung cao cấp, mềm mại và bền đẹp
- Khung gỗ chắc chắn, chịu lực tốt
- Đệm ngồi và tựa lưng êm ái, thoải mái
- Thiết kế tinh tế, phù hợp mọi phong cách nội thất
- Màu sắc: Xanh dương, Hồng, Xám

**Kích thước:** 80 x 80 x 90 cm
**Bảo hành:** 2 năm chính hãng
**Vận chuyển:** Miễn phí`,

    'Oak Dining Table': `Bàn ăn gỗ sồi tự nhiên với thiết kế tối giản, tạo điểm nhấn cho không gian phòng ăn. Sản phẩm được chế tác từ gỗ sồi cao cấp, đảm bảo độ bền và tính thẩm mỹ.

**Đặc điểm nổi bật:**
- Mặt bàn gỗ sồi tự nhiên, chống xước và chống ẩm
- Chân bàn kim loại chắc chắn, chịu lực tốt
- Thiết kế tối giản, dễ lau chùi và bảo quản
- Phù hợp cho gia đình 4-8 người
- Màu sắc: Tự nhiên, Óc chó

**Kích thước:** 180 x 90 x 75 cm
**Bảo hành:** 3 năm chính hãng
**Lắp đặt:** Miễn phí tại nhà`,

    'Glass Coffee Table': `Bàn cà phê kính sang trọng với thiết kế hiện đại, tạo không gian sống thanh lịch. Sản phẩm kết hợp giữa kính cường lực và kim loại, đảm bảo độ bền và an toàn.

**Đặc điểm nổi bật:**
- Mặt kính cường lực 8mm, chống vỡ và an toàn
- Chân kim loại chắc chắn, chống gỉ
- Thiết kế tối giản, dễ lau chùi
- Phù hợp mọi không gian phòng khách
- Màu sắc: Trong suốt, Đen

**Kích thước:** 100 x 60 x 45 cm
**Bảo hành:** 2 năm chính hãng
**Vận chuyển:** Miễn phí`,

    'Bedside Table': `Tủ đầu giường gỗ thông với thiết kế nhỏ gọn, tiện lợi cho phòng ngủ. Sản phẩm được làm từ gỗ thông tự nhiên, an toàn cho sức khỏe.

**Đặc điểm nổi bật:**
- Chất liệu gỗ thông tự nhiên, nhẹ và bền
- Ngăn kéo tiện lợi, tổ chức đồ dùng gọn gàng
- Thiết kế nhỏ gọn, tiết kiệm không gian
- Phù hợp mọi phong cách nội thất
- Màu sắc: Trắng, Tự nhiên

**Kích thước:** 45 x 45 x 50 cm
**Bảo hành:** 2 năm chính hãng
**Vận chuyển:** Miễn phí`,

    'Modern Dining Chair': `Ghế ăn hiện đại với thiết kế ergonomic, mang đến sự thoải mái tối đa cho bữa ăn gia đình. Sản phẩm kết hợp giữa vẻ đẹp và tính năng thực tiễn.

**Đặc điểm nổi bật:**
- Lưng tựa cong theo đường cong cơ thể
- Đệm ngồi êm ái, thoáng khí
- Chân kim loại chắc chắn, chống trượt
- Dễ dàng xếp gọn khi không sử dụng
- Màu sắc: Trắng, Đen, Xám

**Kích thước:** 45 x 50 x 85 cm
**Tải trọng:** Lên đến 120kg
**Bảo hành:** 2 năm`,

    'Ergonomic Office Chair': `Ghế văn phòng ergonomic cao cấp với thiết kế hỗ trợ tối đa cho cột sống. Sản phẩm được thiết kế đặc biệt cho người làm việc lâu dài.

**Đặc điểm nổi bật:**
- Lưng tựa lưới thoáng khí, điều chỉnh độ cao
- Đệm ngồi êm ái, chống mỏi
- Tay vịn điều chỉnh được, hỗ trợ tay tối đa
- Bánh xe lăn mượt mà, di chuyển dễ dàng
- Màu sắc: Đen, Xám

**Kích thước:** 65 x 65 x 120 cm
**Tải trọng:** Lên đến 150kg
**Bảo hành:** 3 năm chính hãng`,

    'Bar Stool': `Ghế bar hiện đại với thiết kế tối giản, phù hợp cho quầy bar và bàn ăn cao. Sản phẩm được làm từ kim loại chắc chắn, bền đẹp.

**Đặc điểm nổi bật:**
- Chân kim loại chắc chắn, chống gỉ
- Đệm ngồi êm ái, thoải mái
- Chiều cao phù hợp cho quầy bar và bàn ăn cao
- Thiết kế tối giản, dễ vệ sinh
- Màu sắc: Đen, Bạc

**Kích thước:** 40 x 40 x 75 cm
**Tải trọng:** Lên đến 100kg
**Bảo hành:** 2 năm`,

    'King Size Bed Frame': `Giường ngủ King Size với thiết kế sang trọng, mang đến giấc ngủ ngon và không gian nghỉ ngơi lý tưởng. Sản phẩm được làm từ gỗ óc chó tự nhiên, an toàn cho sức khỏe.

**Đặc điểm nổi bật:**
- Khung giường gỗ óc chó tự nhiên chắc chắn
- Đầu giường có đệm tựa êm ái
- Thiết kế hiện đại, tiết kiệm không gian
- Có thể kết hợp với tủ đầu giường
- Màu sắc: Óc chó, Sồi

**Kích thước:** 210 x 190 x 100 cm
**Bảo hành:** 5 năm chính hãng
**Lắp đặt:** Miễn phí và chuyên nghiệp`,

    'Queen Upholstered Bed': `Giường ngủ Queen với thiết kế bọc vải sang trọng, mang đến không gian nghỉ ngơi ấm cúng. Sản phẩm được làm từ vải cao cấp và gỗ tự nhiên.

**Đặc điểm nổi bật:**
- Đầu giường bọc vải cao cấp, êm ái
- Khung gỗ chắc chắn, chịu lực tốt
- Thiết kế hiện đại, phù hợp mọi phong cách
- Dễ dàng vệ sinh và bảo quản
- Màu sắc: Xám, Beige

**Kích thước:** 210 x 160 x 110 cm
**Bảo hành:** 3 năm chính hãng
**Lắp đặt:** Miễn phí`,

    'Standing Desk': `Bàn làm việc đứng hiện đại với khả năng điều chỉnh độ cao điện tử. Sản phẩm được thiết kế đặc biệt cho người làm việc tại nhà và văn phòng.

**Đặc điểm nổi bật:**
- Điều chỉnh độ cao điện tử, dễ dàng sử dụng
- Mặt bàn rộng rãi, đủ không gian làm việc
- Chân bàn chắc chắn, chịu lực tốt
- Thiết kế tối giản, dễ vệ sinh
- Màu sắc: Đen, Trắng

**Kích thước:** 140 x 70 x 120 cm (điều chỉnh được)
**Tải trọng:** Lên đến 80kg
**Bảo hành:** 3 năm chính hãng`,

    'Filing Cabinet': `Tủ hồ sơ văn phòng với thiết kế chắc chắn, tổ chức tài liệu gọn gàng. Sản phẩm được làm từ thép cao cấp, bền đẹp và an toàn.

**Đặc điểm nổi bật:**
- Chất liệu thép cao cấp, chống gỉ và bền đẹp
- Ngăn kéo rộng rãi, tổ chức tài liệu gọn gàng
- Khóa an toàn, bảo vệ tài liệu quan trọng
- Thiết kế tối giản, phù hợp mọi văn phòng
- Màu sắc: Xám, Đen

**Kích thước:** 40 x 50 x 60 cm
**Bảo hành:** 2 năm chính hãng
**Vận chuyển:** Miễn phí`,

    'Floor Lamp': `Đèn sàn hiện đại với thiết kế tinh tế, tạo ánh sáng ấm áp cho không gian sống. Sản phẩm được làm từ kim loại cao cấp, bền đẹp.

**Đặc điểm nổi bật:**
- Chân kim loại chắc chắn, chống gỉ
- Bóng đèn LED tiết kiệm điện, tuổi thọ cao
- Thiết kế tối giản, phù hợp mọi không gian
- Điều chỉnh độ cao và góc chiếu sáng
- Màu sắc: Đen, Vàng

**Kích thước:** 30 x 30 x 160 cm
**Bảo hành:** 1 năm chính hãng
**Vận chuyển:** Miễn phí`,

    'Ceramic Vase': `Lọ hoa gốm sứ tinh tế với thiết kế cổ điển hiện đại, tạo điểm nhấn cho không gian sống. Sản phẩm được làm từ gốm sứ cao cấp, bền đẹp.

**Đặc điểm nổi bật:**
- Chất liệu gốm sứ cao cấp, bền đẹp
- Thiết kế tinh tế, phù hợp mọi phong cách
- Dễ dàng vệ sinh và bảo quản
- Phù hợp để cắm hoa hoặc trang trí
- Màu sắc: Trắng, Xanh dương

**Kích thước:** 15 x 15 x 30 cm
**Bảo hành:** 1 năm
**Vận chuyển:** Miễn phí`,
};

const productList = [
    // Sofa
    { name: 'Luxury Leather Sofa', slug: 'luxury-leather-sofa', category: 'sofa', price: 15000000, materials: ['Leather', 'Wood'], colors: ['Black', 'Brown'], stock: 100, dimensions: { length: 200, width: 90, height: 85, unit: 'cm' }, images: ['https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=800&q=80'], isFeatured: true },
    { name: 'Fabric Sectional Sofa', slug: 'fabric-sectional-sofa', category: 'sofa', price: 12000000, materials: ['Fabric', 'Wood'], colors: ['Gray', 'Beige'], stock: 100, dimensions: { length: 250, width: 150, height: 80, unit: 'cm' }, images: ['https://images.unsplash.com/photo-1550254478-ead40cc54513?auto=format&fit=crop&w=800&q=80'] },
    { name: 'Velvet Armchair', slug: 'velvet-armchair', category: 'sofa', price: 5000000, materials: ['Velvet', 'Wood'], colors: ['Blue', 'Pink', 'Gray'], stock: 100, dimensions: { length: 80, width: 80, height: 90, unit: 'cm' }, images: ['https://images.unsplash.com/photo-1580480055273-228ff5388ef8?auto=format&fit=crop&w=800&q=80'] },

    // Table
    { name: 'Oak Dining Table', slug: 'oak-dining-table', category: 'table', price: 8000000, materials: ['Oak Wood'], colors: ['Natural', 'Walnut'], stock: 100, dimensions: { length: 180, width: 90, height: 75, unit: 'cm' }, images: ['https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=800&q=80'], isFeatured: true },
    { name: 'Glass Coffee Table', slug: 'glass-coffee-table', category: 'table', price: 3000000, materials: ['Glass', 'Metal'], colors: ['Clear', 'Black'], stock: 100, dimensions: { length: 100, width: 60, height: 45, unit: 'cm' }, images: ['https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?auto=format&fit=crop&w=800&q=80'] },
    { name: 'Bedside Table', slug: 'bedside-table', category: 'table', price: 1500000, materials: ['Pine Wood'], colors: ['White', 'Natural'], stock: 100, dimensions: { length: 45, width: 45, height: 50, unit: 'cm' }, images: ['https://images.unsplash.com/photo-1532372320572-cda25653a26d?auto=format&fit=crop&w=800&q=80'] },

    // Chair
    { name: 'Modern Dining Chair', slug: 'modern-dining-chair', category: 'chair', price: 1200000, materials: ['Plastic', 'Wood'], colors: ['White', 'Black', 'Gray'], stock: 100, dimensions: { length: 45, width: 50, height: 85, unit: 'cm' }, images: ['https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=800&q=80'] },
    { name: 'Ergonomic Office Chair', slug: 'ergonomic-office-chair', category: 'chair', price: 4500000, materials: ['Mesh', 'Metal'], colors: ['Black', 'Gray'], stock: 100, dimensions: { length: 65, width: 65, height: 120, unit: 'cm' }, images: ['https://images.unsplash.com/photo-1688578735352-9a6f2ac3b70a?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'], isFeatured: true },
    { name: 'Bar Stool', slug: 'bar-stool', category: 'chair', price: 1800000, materials: ['Metal'], colors: ['Black', 'Silver'], stock: 100, dimensions: { length: 40, width: 40, height: 75, unit: 'cm' }, images: ['https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=800&q=80'] },

    // Bed
    { name: 'King Size Bed Frame', slug: 'king-size-bed-frame', category: 'bed', price: 18000000, materials: ['Walnut Wood'], colors: ['Walnut', 'Oak'], stock: 100, dimensions: { length: 210, width: 190, height: 100, unit: 'cm' }, images: ['https://images.unsplash.com/photo-1505693314120-0d443867891c?auto=format&fit=crop&w=800&q=80'], isFeatured: true },
    { name: 'Queen Upholstered Bed', slug: 'queen-upholstered-bed', category: 'bed', price: 14000000, materials: ['Fabric', 'Wood'], colors: ['Gray', 'Beige'], stock: 100, dimensions: { length: 210, width: 160, height: 110, unit: 'cm' }, images: ['https://images.unsplash.com/photo-1715100749228-ae2033bc3ac2?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'] },

    // Office
    { name: 'Standing Desk', slug: 'standing-desk', category: 'office', price: 7500000, materials: ['Metal', 'Wood'], colors: ['Black', 'White'], stock: 100, dimensions: { length: 140, width: 70, height: 120, unit: 'cm' }, images: ['https://images.unsplash.com/photo-1595515106969-1ce29566ff1c?auto=format&fit=crop&w=800&q=80'] },
    { name: 'Filing Cabinet', slug: 'filing-cabinet', category: 'office', price: 2000000, materials: ['Steel'], colors: ['Gray', 'Black'], stock: 100, dimensions: { length: 40, width: 50, height: 60, unit: 'cm' }, images: ['https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=800&q=80'] },

    // Decor
    { name: 'Floor Lamp', slug: 'floor-lamp', category: 'decor', price: 1800000, materials: ['Metal'], colors: ['Black', 'Gold'], stock: 100, dimensions: { length: 30, width: 30, height: 160, unit: 'cm' }, images: ['https://images.unsplash.com/photo-1675767528117-963ce219b52a?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'] },
    { name: 'Ceramic Vase', slug: 'ceramic-vase', category: 'decor', price: 500000, materials: ['Ceramic'], colors: ['White', 'Blue'], stock: 100, dimensions: { length: 15, width: 15, height: 30, unit: 'cm' }, images: ['https://plus.unsplash.com/premium_photo-1668620539031-3966e75b6f13?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'] },
];

export async function seedProducts() {
    console.log('🛋️ Seeding Products...');

    const categories = await Category.find({});
    const results = [];

    for (const p of productList) {
        const cat = categories.find(c => c.slug === p.category);
        if (!cat) continue;

        // Lấy mô tả chi tiết từ mapping hoặc tạo mô tả mặc định
        let description = productDescriptions[p.name];
        if (!description) {
            // Tạo mô tả mặc định dựa trên category
            const categoryDescriptions: Record<string, string> = {
                'sofa': `Bộ sofa hiện đại với thiết kế tinh tế, mang đến không gian sống sang trọng và tiện nghi. Sản phẩm được làm từ chất liệu cao cấp, đảm bảo độ bền và sự thoải mái tối đa.

**Đặc điểm nổi bật:**
- Chất liệu ${p.materials.join(', ')} cao cấp
- Thiết kế hiện đại, phù hợp mọi không gian
- Màu sắc đa dạng: ${p.colors.join(', ')}
- Bảo hành 2 năm chính hãng
- Vận chuyển miễn phí trong nội thành`,
                'table': `Bàn ăn sang trọng với thiết kế hiện đại, tạo điểm nhấn cho không gian phòng ăn của bạn. Sản phẩm được chế tác từ ${p.materials.join(', ')} cao cấp, đảm bảo độ bền và tính thẩm mỹ.

**Đặc điểm nổi bật:**
- Chất liệu ${p.materials.join(', ')} cao cấp
- Thiết kế tối giản, dễ lau chùi
- Màu sắc: ${p.colors.join(', ')}
- Bảo hành 3 năm chính hãng
- Lắp đặt miễn phí tại nhà`,
                'chair': `Ghế ăn hiện đại với thiết kế ergonomic, mang đến sự thoải mái tối đa cho bữa ăn gia đình. Sản phẩm kết hợp giữa vẻ đẹp và tính năng thực tiễn.

**Đặc điểm nổi bật:**
- Chất liệu ${p.materials.join(', ')} cao cấp
- Thiết kế ergonomic, thoải mái
- Màu sắc: ${p.colors.join(', ')}
- Tải trọng lên đến 120kg
- Bảo hành 2 năm`,
                'bed': `Giường ngủ cao cấp với thiết kế sang trọng, mang đến giấc ngủ ngon và không gian nghỉ ngơi lý tưởng. Sản phẩm được làm từ ${p.materials.join(', ')} tự nhiên, an toàn cho sức khỏe.

**Đặc điểm nổi bật:**
- Chất liệu ${p.materials.join(', ')} cao cấp
- Thiết kế hiện đại, tiết kiệm không gian
- Màu sắc: ${p.colors.join(', ')}
- Bảo hành 5 năm chính hãng
- Lắp đặt miễn phí và chuyên nghiệp`,
                'office': `Bàn làm việc hiện đại với thiết kế tối ưu cho không gian văn phòng. Sản phẩm kết hợp giữa tính năng và thẩm mỹ, tạo môi trường làm việc chuyên nghiệp.

**Đặc điểm nổi bật:**
- Chất liệu ${p.materials.join(', ')} cao cấp
- Thiết kế tối giản, dễ vệ sinh
- Màu sắc: ${p.colors.join(', ')}
- Bảo hành 3 năm chính hãng
- Lắp đặt miễn phí`,
                'decor': `Đồ trang trí nội thất tinh tế, tạo điểm nhấn cho không gian sống của bạn. Sản phẩm được thiết kế độc đáo, mang đến vẻ đẹp hiện đại và sang trọng.

**Đặc điểm nổi bật:**
- Chất liệu ${p.materials.join(', ')} cao cấp
- Thiết kế độc đáo, tinh tế
- Màu sắc: ${p.colors.join(', ')}
- Bảo hành 1 năm
- Vận chuyển miễn phí`,
            };
            description = categoryDescriptions[p.category] || `Sản phẩm ${p.name} với thiết kế hiện đại và chất lượng cao cấp. 

**Đặc điểm nổi bật:**
- Chất liệu ${p.materials.join(', ')} cao cấp
- Thiết kế tinh tế, sang trọng
- Màu sắc: ${p.colors.join(', ')}
- Bảo hành chính hãng
- Vận chuyển miễn phí`;
        }

        const productData = {
            name: p.name,
            slug: p.slug,
            categoryId: cat._id,
            category: cat.name, // Denormalized name
            description: description,
            price: p.price,
            images: p.images,
            materials: p.materials, // Array, matched schema
            colors: p.colors,
            dimensions: p.dimensions,
            // tags: [p.category, ...p.materials],
            stock: p.stock,
            isActive: true,
            isFeatured: p.isFeatured || false,
            rating: 0, // Sẽ được cập nhật sau khi seed reviews
            reviewCount: 0, // Sẽ được cập nhật sau khi seed reviews
        };

        const product = await Product.findOneAndUpdate(
            { name: p.name }, // Use name as unique identifier
            productData,
            { upsert: true, new: true }
        );
        results.push(product);
    }
    console.log(`✅ Seeded ${results.length} products.`);
    return results;
}
