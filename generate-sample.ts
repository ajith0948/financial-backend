import PDFDocument from 'pdfkit';
import fs from 'fs';

const generateDummyZerodhaPDF = () => {
    const doc = new PDFDocument();
    const fileName = 'Zerodha_Sample_Q3_2026.pdf';

    doc.pipe(fs.createWriteStream(fileName));

    // 📄 Simulate Zerodha Header
    doc.fontSize(24).font('Helvetica-Bold').text('ZERODHA BROKING LTD.', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).font('Helvetica').text('Tax P&L Statement / Contract Note (Simulated)', { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(12).text('Client Name: Tester Admin');
    doc.text('PAN: ABCDE1234F');
    doc.text('Period: Q3 2026');
    doc.moveDown(2);

    // 🧮 Simulate the Charges Summary Table
    doc.fontSize(16).font('Helvetica-Bold').text('Charges Summary');
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica');

    // These are the exact keywords your worker is likely looking for!
    doc.text('Total Brokerage: 150.50');
    doc.text('Exchange Transaction Charges: 25.00');
    doc.text('STT / CTT: 400.00');
    doc.text('Stamp Duty: 15.75');
    doc.text('SEBI Turnover Fees: 2.50');
    doc.text('GST: 31.59');

    doc.moveDown(2);
    doc.text('This is a simulated document generated for testing the Financial Engine backend.');

    doc.end();
    console.log(`✅ Success! Generated ${fileName} in your backend folder.`);
};

generateDummyZerodhaPDF();