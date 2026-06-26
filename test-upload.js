// test-upload.js
async function fireMockTraffic() {
    console.log('🔫 Preparing to fire 5 mock statements at the server...');

    const form = new FormData();

    // Create 5 dummy files
    for (let i = 1; i <= 5; i++) {
        const mockContent = new Blob([`Mock PDF Content for statement ${i}`], { type: 'application/pdf' });
        form.append('statements', mockContent, `zerodha_statement_Q${i}_2026.pdf`);
    }

    try {
        const response = await fetch('http://localhost:3000/api/upload', {
            method: 'POST',
            body: form
        });

        const data = await response.json();
        console.log('\n✅ Server Response received instantly:');
        console.log(data);
    } catch (err) {
        console.error('🚨 Test failed:', err);
    }
}

fireMockTraffic();