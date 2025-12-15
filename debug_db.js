
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ctuuxrtthiiytnyonqri.supabase.co';
// Correct Key from file
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0dXV4cnR0aGlpeXRueW9ucXJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3NTA0ODIsImV4cCI6MjA4MTMyNjQ4Mn0.BUyUt_BUPYFk4_X-Ws_F6CWV2DUBdigwZ4pBwTydl9Y';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
    console.log("Testing connection into 'produtos' table...");

    const dummyProduct = {
        name: 'Test Product',
        description: 'Debug description',
        price: 10.50
    };

    const { data, error } = await supabase
        .from('produtos')
        .insert([dummyProduct])
        .select();

    if (error) {
        console.error("❌ ERROR FOUND:");
        console.error(JSON.stringify(error, null, 2));
    } else {
        console.log("✅ SUCCESS! Table exists and is writable.");
        // Cleanup if possible, otherwise it catches next time
        if (data) await supabase.from('produtos').delete().eq('id', data[0].id);
    }
}

testConnection();
