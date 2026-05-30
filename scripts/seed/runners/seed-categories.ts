
import { Category } from '../utils/models';

export const categoriesData = [
    {
        name: 'Sofa',
        slug: 'sofa',
        description: 'Comfortable sofas for your living room',
        image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
        sortOrder: 1,
        isActive: true,
    },
    {
        name: 'Table',
        slug: 'table',
        description: 'Dining tables, coffee tables, and more',
        image: 'https://images.unsplash.com/photo-1577140917170-285929fb55b7?auto=format&fit=crop&w=800&q=80',
        sortOrder: 2,
        isActive: true,
    },
    {
        name: 'Chair',
        slug: 'chair',
        description: 'Chairs for dining, office, and relaxing',
        image: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?auto=format&fit=crop&w=800&q=80',
        sortOrder: 3,
        isActive: true,
    },
    {
        name: 'Bed',
        slug: 'bed',
        description: 'Premium beds for a good night sleep',
        image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80',
        sortOrder: 4,
        isActive: true,
    },
    {
        name: 'Office',
        slug: 'office',
        description: 'Office furniture for productivity',
        image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80',
        sortOrder: 5,
        isActive: true,
    },
    {
        name: 'Decor',
        slug: 'decor',
        description: 'Decoration items to style your home',
        image: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=800&q=80',
        sortOrder: 6,
        isActive: true,
    },
];

export async function seedCategories() {
    console.log('📂 Seeding Categories...');
    const results = [];
    for (const cat of categoriesData) {
        const c = await Category.findOneAndUpdate(
            { slug: cat.slug },
            cat,
            { upsert: true, new: true }
        );
        results.push(c);
    }
    console.log(`✅ Seeded ${results.length} categories.`);
    return results;
}
