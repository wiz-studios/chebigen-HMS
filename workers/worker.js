// workers/worker.js
const { Worker } = require('bullmq');
const { createClient } = require('@supabase/supabase-js');
const { PDFDocument, rgb } = require('@pdf-lib/core');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Redis connection config
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

// PDF Generation Worker
const pdfWorker = new Worker('pdf-generation', async (job) => {
  console.log(`Processing PDF generation job ${job.id} for bill ${job.data.billId}`);
  
  try {
    // Fetch bill data
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .select(`
        *,
        bill_items (*),
        patient:patients (
          first_name,
          last_name,
          mrn
        )
      `)
      .eq('id', job.data.billId)
      .single();

    if (billError) throw billError;
    if (!bill) throw new Error('Bill not found');

    // Generate PDF
    const pdfDoc = await PDFDocument.create();
    // Add PDF content (implementation depends on your needs)
    // ...

    // Upload to Supabase Storage
    const pdfBytes = await pdfDoc.save();
    const { data: file, error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(`bills/${job.data.billId}.pdf`, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Update bill with PDF URL
    const { error: updateError } = await supabase
      .from('bills')
      .update({ invoice_url: file.path })
      .eq('id', job.data.billId);

    if (updateError) throw updateError;

    return { success: true, billId: job.data.billId, path: file.path };
  } catch (error) {
    console.error('PDF Generation failed:', error);
    throw error;
  }
}, { connection });

// Email Worker
const emailWorker = new Worker('email', async (job) => {
  console.log(`Processing email job ${job.id}`);
  const { to, subject, template, data } = job.data;

  try {
    // Implement email sending logic here
    // Example: use nodemailer or other email service
    console.log(`Sending email to ${to}: ${subject}`);
    return { success: true };
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
}, { connection });

// M-PESA Verification Worker
const mpesaWorker = new Worker('mpesa-verification', async (job) => {
  console.log(`Processing M-PESA verification job ${job.id}`);
  const { transactionId } = job.data;

  try {
    // Implement M-PESA verification logic here
    console.log(`Verifying M-PESA transaction ${transactionId}`);
    return { success: true };
  } catch (error) {
    console.error('M-PESA verification failed:', error);
    throw error;
  }
}, { connection });

// Report Export Worker
const reportWorker = new Worker('report-export', async (job) => {
  console.log(`Processing report export job ${job.id}`);
  const { reportType, filters, userId } = job.data;

  try {
    // Implement report generation logic here
    console.log(`Generating ${reportType} report for user ${userId}`);
    return { success: true };
  } catch (error) {
    console.error('Report generation failed:', error);
    throw error;
  }
}, { connection });

// Error handling for workers
[pdfWorker, emailWorker, mpesaWorker, reportWorker].forEach(worker => {
  worker.on('completed', job => {
    console.log(`Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err);
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await Promise.all([
    pdfWorker.close(),
    emailWorker.close(),
    mpesaWorker.close(),
    reportWorker.close(),
  ]);
  process.exit(0);
});