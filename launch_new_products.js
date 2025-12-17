
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// 1. Manually parse .env to get credentials
const envPath = path.resolve('.env');
if (!fs.existsSync(envPath)) {
    console.error('Error: .env file not found');
    process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envVars[key.trim()] = value.trim();
    }
});

const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
const SUPABASE_KEY = envVars.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Error: Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. Define Products
const products = [
    {
        name: 'Creatina Monohidratada 200g',
        description: 'Creatina Monohidratada 200g. Auxilia no aumento de força e massa muscular. Fórmula pura e sem sabor. Contém 200g (pó).',
        price: 0,
        imagePath: 'C:/Users/thale/.gemini/antigravity/brain/d6efee8b-0b8d-4a8d-a305-6ef1a1a7e540/uploaded_image_1765959758422.png'
    }
];

// 3. Execution Function
async function launchProducts() {
    console.log('🚀 Starting product launch...');

    for (const product of products) {
        try {
            console.log(`Processing: ${product.name}...`);

            // Check if exists
            const { data: existing } = await supabase
                .from('produtos')
                .select('id')
                .eq('name', product.name)
                .single();

            if (existing) {
                console.log(`⚠️ ${product.name} already exists. Skipping.`);
                continue;
            }

            // Read Image
            if (!fs.existsSync(product.imagePath)) {
                console.error(`❌ Image not found: ${product.imagePath}`);
                continue;
            }
            const fileContent = fs.readFileSync(product.imagePath);
            const fileExt = path.extname(product.imagePath).substring(1); // jpg
            const fileName = `product_launch_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

            // Upload Image
            console.log('  - Uploading image...');
            const { error: uploadError } = await supabase.storage
                .from('receitas')
                .upload(fileName, fileContent, {
                    contentType: `image/${fileExt}`
                });

            if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

            // Get URL
            const { data: urlData } = supabase.storage
                .from('receitas')
                .getPublicUrl(fileName);

            const imageUrl = urlData.publicUrl;
            console.log('  - Image uploaded:', imageUrl);

            // Insert Product
            console.log('  - Inserting database record...');
            const { error: insertError } = await supabase
                .from('produtos')
                .insert([{
                    name: product.name,
                    description: product.description,
                    price: 0, // Explicitly 0
                    image_url: imageUrl
                }]);

            if (insertError) throw new Error(`DB Insert failed: ${insertError.message}`);

            console.log(`✅ ${product.name} launched successfully!\n`);

        } catch (error) {
            console.error(`❌ Failed to launch ${product.name}:`, error.message, '\n');
        }
    }

    console.log('🏁 All done!');
}

launchProducts();
