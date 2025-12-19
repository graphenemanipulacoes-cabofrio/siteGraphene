
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ctuuxrtthiiytnyonqri.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0dXV4cnR0aGlpeXRueW9ucXJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3NTA0ODIsImV4cCI6MjA4MTMyNjQ4Mn0.BUyUt_BUPYFk4_X-Ws_F6CWV2DUBdigwZ4pBwTydl9Y';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function debugSolicitacoes() {
    console.log("Checking 'solicitacoes' table...");

    // 1. Fetch one record to see columns
    const { data: fetchResult, error: fetchError } = await supabase
        .from('solicitacoes')
        .select('*')
        .limit(1);

    if (fetchError) {
        console.error("❌ FETCH ERROR:", fetchError.message);
    } else {
        console.log("✅ Columns found:", Object.keys(fetchResult[0] || {}).join(', '));

        if (fetchResult.length > 0) {
            const id = fetchResult[0].id;
            console.log(`Testing UPDATE (moving to trash) for ID: ${id}...`);

            // 2. Test UPDATE (moving to trash)
            const { error: updateError } = await supabase
                .from('solicitacoes')
                .update({ status: 'trash' })
                .eq('id', id);

            if (updateError) {
                console.error("❌ UPDATE ERROR (likely column 'status' missing or policy issue):", updateError.message);
                console.error(JSON.stringify(updateError, null, 2));
            } else {
                console.log("✅ UPDATE SUCCESS!");

                console.log(`Testing DELETE for ID: ${id}...`);
                // 3. Test DELETE (policies might only allow deleting items in trash or all)
                const { error: deleteError } = await supabase
                    .from('solicitacoes')
                    .delete()
                    .eq('id', id);

                if (deleteError) {
                    console.error("❌ DELETE ERROR (policy issue):", deleteError.message);
                } else {
                    console.log("✅ DELETE SUCCESS!");
                }
            }
        } else {
            console.log("⚠️ No records found to test update/delete.");
        }
    }
}

debugSolicitacoes();
