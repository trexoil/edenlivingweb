import { v4 as uuidv4 } from 'uuid'
import { ServiceRequest, ServiceInvoice, Profile } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { EmailNotificationService } from '@/lib/notifications/email'

const emailService = new EmailNotificationService()

interface ServiceCostCalculation {
  base_cost: number
  tax: number
  total: number
  breakdown: {
    service_fee: number
    materials?: number
    labor?: number
    tax_rate: number
    tax_amount: number
  }
}

/**
 * Service pricing configuration
 */
const SERVICE_PRICING = {
  meal: {
    base_cost: 15.00,
    materials: 0,
    labor: 5.00
  },
  laundry: {
    base_cost: 8.00,
    materials: 2.00,
    labor: 3.00
  },
  housekeeping: {
    base_cost: 25.00,
    materials: 5.00,
    labor: 15.00
  },
  transportation: {
    base_cost: 20.00,
    materials: 10.00,
    labor: 10.00
  },
  maintenance: {
    base_cost: 35.00,
    materials: 15.00,
    labor: 20.00
  },
  home_care: {
    base_cost: 45.00,
    materials: 5.00,
    labor: 35.00
  },
  medical: {
    base_cost: 60.00,
    materials: 10.00,
    labor: 40.00
  }
}

const TAX_RATE = 0.06 // 6% tax rate

/**
 * Calculate service cost based on service type and actual usage
 */
export function calculateServiceCost(serviceRequest: ServiceRequest): ServiceCostCalculation {
  const pricing = SERVICE_PRICING[serviceRequest.type] || SERVICE_PRICING.meal
  
  // Use actual cost if available, otherwise use pricing
  let serviceFee = serviceRequest.actual_cost || serviceRequest.estimated_cost || pricing.base_cost
  
  // If no actual/estimated cost, calculate from components
  if (!serviceRequest.actual_cost && !serviceRequest.estimated_cost) {
    serviceFee = pricing.base_cost
  }
  
  const materials = pricing.materials || 0
  const labor = pricing.labor || 0
  const baseCost = serviceFee + materials + labor
  
  const taxAmount = baseCost * TAX_RATE
  const total = baseCost + taxAmount
  
  return {
    base_cost: baseCost,
    tax: taxAmount,
    total: total,
    breakdown: {
      service_fee: serviceFee,
      materials,
      labor,
      tax_rate: TAX_RATE,
      tax_amount: taxAmount
    }
  }
}

/**
 * Generate automated draft invoice when service is completed
 */
export async function generateDraftInvoice(serviceRequestId: string): Promise<ServiceInvoice | null> {
  const supabase = createClient()
  
  try {
    // Get service request details
    const { data: serviceRequest, error: requestError } = await supabase
      .from('service_requests')
      .select('*')
      .eq('id', serviceRequestId)
      .single()
    
    if (requestError || !serviceRequest) {
      console.error('Error fetching service request:', requestError)
      return null
    }
    
    // Get resident details
    const { data: resident, error: residentError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', serviceRequest.resident_id)
      .single()
    
    if (residentError || !resident) {
      console.error('Error fetching resident:', residentError)
      return null
    }
    
    // Calculate service cost
    const serviceCost = calculateServiceCost(serviceRequest)
    
    // Create invoice record
    const invoice: Partial<ServiceInvoice> = {
      id: uuidv4(),
      service_request_id: serviceRequestId,
      resident_id: serviceRequest.resident_id,
      site_id: serviceRequest.site_id || resident.site_id,
      amount: serviceCost.base_cost,
      tax_amount: serviceCost.tax,
      total_amount: serviceCost.total,
      description: generateInvoiceDescription(serviceRequest, serviceCost),
      status: 'draft',
      created_by: 'system',
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    // Insert invoice into database
    const { data: insertedInvoice, error: insertError } = await supabase
      .from('service_invoices')
      .insert(invoice)
      .select()
      .single()
    
    if (insertError) {
      console.error('Error creating invoice:', insertError)
      return null
    }
    
    // Update service request with invoice ID
    await supabase
      .from('service_requests')
      .update({ 
        invoice_id: insertedInvoice.id,
        status: 'invoiced',
        updated_at: new Date().toISOString()
      })
      .eq('id', serviceRequestId)
    
    // Update resident's balance
    const newBalance = (resident.current_balance || 0) + serviceCost.total
    await supabase
      .from('profiles')
      .update({ 
        current_balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', resident.id)
    
    // Notify admin about invoice generation
    await notifyAdminInvoiceReady(insertedInvoice, serviceRequest)
    
    console.log(`Draft invoice ${insertedInvoice.id} generated for service request ${serviceRequestId}`)
    return insertedInvoice as ServiceInvoice
    
  } catch (error) {
    console.error('Error generating draft invoice:', error)
    return null
  }
}

/**
 * Generate invoice description based on service details
 */
function generateInvoiceDescription(
  serviceRequest: ServiceRequest,
  serviceCost: ServiceCostCalculation
): string {
  const serviceType = serviceRequest.type.charAt(0).toUpperCase() + serviceRequest.type.slice(1).replace('_', ' ')
  const completedDate = serviceRequest.completed_date 
    ? new Date(serviceRequest.completed_date).toLocaleDateString()
    : new Date().toLocaleDateString()
  
  let description = `${serviceType} Service - ${serviceRequest.title}\n`
  description += `Completed: ${completedDate}\n\n`
  description += `Cost Breakdown:\n`
  description += `- Service Fee: RM ${serviceCost.breakdown.service_fee.toFixed(2)}\n`
  
  if (serviceCost.breakdown.materials && serviceCost.breakdown.materials > 0) {
    description += `- Materials: RM ${serviceCost.breakdown.materials.toFixed(2)}\n`
  }
  
  if (serviceCost.breakdown.labor && serviceCost.breakdown.labor > 0) {
    description += `- Labor: RM ${serviceCost.breakdown.labor.toFixed(2)}\n`
  }
  
  description += `- Tax (${(serviceCost.breakdown.tax_rate * 100).toFixed(1)}%): RM ${serviceCost.breakdown.tax_amount.toFixed(2)}\n`
  description += `\nTotal: RM ${serviceCost.total.toFixed(2)}`
  
  if (serviceRequest.description) {
    description += `\n\nService Details: ${serviceRequest.description}`
  }
  
  return description
}

/**
 * Notify admin when invoice is ready for review
 */
async function notifyAdminInvoiceReady(
  invoice: ServiceInvoice,
  serviceRequest: ServiceRequest
): Promise<void> {
  const supabase = createClient()
  
  try {
    // Get admin users for the site
    const { data: admins, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('site_id', invoice.site_id)
      .in('role', ['admin', 'site_admin', 'superadmin'])
    
    if (!error && admins && admins.length > 0) {
      // Send notification to the first admin (could be enhanced to send to all)
      const admin = admins[0]
      await emailService.sendInvoiceNotification(serviceRequest, invoice.id, admin)
    }
  } catch (error) {
    console.error('Error notifying admin about invoice:', error)
  }
}

/**
 * Approve and send invoice to resident
 */
export async function approveAndSendInvoice(
  invoiceId: string,
  approvedBy: string
): Promise<boolean> {
  const supabase = createClient()
  
  try {
    // Update invoice status
    const { data: invoice, error: updateError } = await supabase
      .from('service_invoices')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)
      .select(`
        *,
        service_requests!inner(
          title,
          type,
          description,
          profiles!inner(
            first_name,
            last_name,
            email
          )
        )
      `)
      .single()
    
    if (updateError || !invoice) {
      console.error('Error updating invoice:', updateError)
      return false
    }
    
    // Here you would integrate with your billing system to actually send the invoice
    // For now, we'll just log it
    console.log(`Invoice ${invoiceId} approved and sent to resident`)
    
    // You could also send an email to the resident here
    // await sendInvoiceToResident(invoice, resident)
    
    return true
  } catch (error) {
    console.error('Error approving and sending invoice:', error)
    return false
  }
}

/**
 * Cancel an invoice
 */
export async function cancelInvoice(
  invoiceId: string,
  cancelledBy: string,
  reason: string
): Promise<boolean> {
  const supabase = createClient()
  
  try {
    // Get invoice details first
    const { data: invoice, error: fetchError } = await supabase
      .from('service_invoices')
      .select('*')
      .eq('id', invoiceId)
      .single()
    
    if (fetchError || !invoice) {
      console.error('Error fetching invoice:', fetchError)
      return false
    }
    
    // Update invoice status
    const { error: updateError } = await supabase
      .from('service_invoices')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)
    
    if (updateError) {
      console.error('Error cancelling invoice:', updateError)
      return false
    }
    
    // Adjust resident balance if invoice was sent
    if (invoice.status === 'sent') {
      const { data: resident } = await supabase
        .from('profiles')
        .select('current_balance')
        .eq('id', invoice.resident_id)
        .single()
      
      if (resident) {
        const adjustedBalance = (resident.current_balance || 0) - invoice.total_amount
        await supabase
          .from('profiles')
          .update({ 
            current_balance: Math.max(0, adjustedBalance), // Don't allow negative balance
            updated_at: new Date().toISOString()
          })
          .eq('id', invoice.resident_id)
      }
    }
    
    console.log(`Invoice ${invoiceId} cancelled by ${cancelledBy}. Reason: ${reason}`)
    return true
  } catch (error) {
    console.error('Error cancelling invoice:', error)
    return false
  }
}

/**
 * Get pricing for a service type
 */
export function getServicePricing(serviceType: string) {
  return SERVICE_PRICING[serviceType as keyof typeof SERVICE_PRICING] || SERVICE_PRICING.meal
}

/**
 * Estimate service cost before completion
 */
export function estimateServiceCost(serviceType: string, customAmount?: number): number {
  if (customAmount) {
    return customAmount
  }
  
  const pricing = getServicePricing(serviceType)
  const baseCost = pricing.base_cost + (pricing.materials || 0) + (pricing.labor || 0)
  const total = baseCost * (1 + TAX_RATE)
  
  return Math.round(total * 100) / 100 // Round to 2 decimal places
}