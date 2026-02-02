import { Queue, Worker } from 'bullmq';
import { createClient } from '@/lib/supabase/client';

// Redis connection configuration
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

// Queue names
export const QUEUE_NAMES = {
  PDF_GENERATION: 'pdf-generation',
  EMAIL: 'email',
  MPESA_VERIFICATION: 'mpesa-verification',
  REPORT_EXPORT: 'report-export',
} as const;

// Queue instances
const queues: Record<string, Queue> = {};

// Initialize a queue
function getQueue(name: string): Queue {
  if (!queues[name]) {
    queues[name] = new Queue(name, { connection });
  }
  return queues[name];
}

// Job processors
const jobProcessors: Record<string, (job: any) => Promise<any>> = {
  [QUEUE_NAMES.PDF_GENERATION]: async (job) => {
    const { billId } = job.data;
    // Implementation for PDF generation
    const supabase = createClient();
    
    try {
      // 1. Fetch bill data
      const { data: bill } = await supabase
        .from('bills')
        .select('*, bill_items(*), patient:patients(*)')
        .eq('id', billId)
        .single();

      if (!bill) throw new Error('Bill not found');

      // 2. Generate PDF (implementation depends on PDF library used)
      // const pdfBuffer = await generatePDF(bill);

      // 3. Upload to storage
      // const { data: file } = await supabase.storage
      //   .from('invoices')
      //   .upload(`${billId}.pdf`, pdfBuffer);

      // 4. Update bill with PDF URL
      await supabase
        .from('bills')
        .update({ invoice_url: undefined }) // Remove file path until PDF generation is implemented
        .eq('id', billId);

      return { success: true, billId };
    } catch (error) {
      console.error('PDF Generation failed:', error);
      throw error;
    }
  },

  [QUEUE_NAMES.EMAIL]: async (job) => {
    const { to, subject, template, data } = job.data;
    // Implementation for email sending
    // Example: await sendEmail(to, subject, template, data);
    return { success: true };
  },

  [QUEUE_NAMES.MPESA_VERIFICATION]: async (job) => {
    const { transactionId } = job.data;
    // Implementation for M-PESA verification
    // Example: await verifyMpesaTransaction(transactionId);
    return { success: true };
  },

  [QUEUE_NAMES.REPORT_EXPORT]: async (job) => {
    const { reportType, filters, userId } = job.data;
    // Implementation for report export
    // Example: await generateAndUploadReport(reportType, filters);
    return { success: true };
  },
};

// Initialize workers for each queue
Object.entries(QUEUE_NAMES).forEach(([name, queueName]) => {
  const worker = new Worker(queueName, jobProcessors[queueName], { connection });
  
  worker.on('completed', (job) => {
    console.log(`Job ${job.id} in queue ${queueName} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} in queue ${queueName} failed:`, err);
  });
});

// Helper functions to add jobs to queues
export async function generateInvoicePDF(billId: string) {
  const queue = getQueue(QUEUE_NAMES.PDF_GENERATION);
  return queue.add('generate-pdf', { billId }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  });
}

export async function sendEmailAsync(to: string, subject: string, template: string, data: any) {
  const queue = getQueue(QUEUE_NAMES.EMAIL);
  return queue.add('send-email', { to, subject, template, data }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  });
}

export async function verifyMpesaPayment(transactionId: string) {
  const queue = getQueue(QUEUE_NAMES.MPESA_VERIFICATION);
  return queue.add('verify-payment', { transactionId }, {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });
}

export async function exportReport(reportType: string, filters: any, userId: string) {
  const queue = getQueue(QUEUE_NAMES.REPORT_EXPORT);
  return queue.add('export-report', { reportType, filters, userId }, {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  });
}

// Cleanup function to gracefully shut down queues and workers
export async function closeQueues() {
  await Promise.all(Object.values(queues).map(queue => queue.close()));
}