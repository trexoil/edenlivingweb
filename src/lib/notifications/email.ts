import nodemailer from 'nodemailer'
import { ServiceRequest, Profile, Department } from '@/types/database'

interface EmailConfig {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
}

const emailConfig: EmailConfig = {
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  }
}

const transporter = nodemailer.createTransport(emailConfig)

export class EmailNotificationService {
  /**
   * Send notification to admin when service request needs review or is auto-approved
   */
  async sendAdminNotification(
    serviceRequest: ServiceRequest, 
    type: 'auto_approved' | 'manual_review_required',
    admins: Profile[]
  ) {
    const subject = type === 'auto_approved' 
      ? `Service Request Auto-Approved: ${serviceRequest.title}`
      : `Service Request Requires Review: ${serviceRequest.title}`
    
    const htmlContent = this.generateAdminEmailTemplate(serviceRequest, type)
    
    for (const admin of admins) {
      if (admin.notification_preferences?.email !== false) {
        try {
          await transporter.sendMail({
            from: `"Eden Living" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
            to: admin.email,
            subject,
            html: htmlContent,
            text: this.generateAdminTextTemplate(serviceRequest, type)
          })
          
          console.log(`Email sent to admin: ${admin.email}`)
        } catch (error) {
          console.error(`Failed to send email to admin ${admin.email}:`, error)
        }
      }
    }
  }

  /**
   * Send notification to department when service request is assigned
   */
  async sendDepartmentNotification(
    serviceRequest: ServiceRequest,
    department: Department,
    resident: Profile
  ) {
    const subject = `New Service Request Assigned: ${serviceRequest.title}`
    const htmlContent = this.generateDepartmentEmailTemplate(serviceRequest, department, resident)
    
    for (const email of department.email_notifications) {
      try {
        await transporter.sendMail({
          from: `"Eden Living" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
          to: email,
          subject,
          html: htmlContent,
          text: this.generateDepartmentTextTemplate(serviceRequest, department, resident)
        })
        
        console.log(`Email sent to department: ${email}`)
      } catch (error) {
        console.error(`Failed to send email to department ${email}:`, error)
      }
    }
  }

  /**
   * Send invoice notification to admin
   */
  async sendInvoiceNotification(
    serviceRequest: ServiceRequest,
    invoiceId: string,
    admin: Profile
  ) {
    const subject = `Draft Invoice Generated: ${serviceRequest.title}`
    const htmlContent = this.generateInvoiceEmailTemplate(serviceRequest, invoiceId)
    
    try {
      await transporter.sendMail({
        from: `"Eden Living" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: admin.email,
        subject,
        html: htmlContent,
        text: this.generateInvoiceTextTemplate(serviceRequest, invoiceId)
      })
      
      console.log(`Invoice notification sent to admin: ${admin.email}`)
    } catch (error) {
      console.error(`Failed to send invoice notification to admin ${admin.email}:`, error)
    }
  }

  /**
   * Generate HTML template for admin notification
   */
  private generateAdminEmailTemplate(
    serviceRequest: ServiceRequest,
    type: 'auto_approved' | 'manual_review_required'
  ): string {
    const statusColor = type === 'auto_approved' ? '#22c55e' : '#f59e0b'
    const statusText = type === 'auto_approved' ? 'Auto-Approved' : 'Requires Review'
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background-color: #1f2937; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9fafb; }
        .status-badge { 
          display: inline-block; 
          padding: 8px 16px; 
          border-radius: 20px; 
          color: white; 
          font-weight: bold;
          background-color: ${statusColor};
        }
        .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .footer { padding: 20px; text-align: center; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Eden Living Service Request</h1>
      </div>
      <div class="content">
        <h2>Service Request ${statusText}</h2>
        <span class="status-badge">${statusText}</span>
        
        <div class="details">
          <h3>Request Details</h3>
          <p><strong>Title:</strong> ${serviceRequest.title}</p>
          <p><strong>Type:</strong> ${serviceRequest.type}</p>
          <p><strong>Description:</strong> ${serviceRequest.description}</p>
          <p><strong>Priority:</strong> ${serviceRequest.priority}</p>
          <p><strong>Department:</strong> ${serviceRequest.department_assigned || 'Not assigned'}</p>
          <p><strong>Estimated Cost:</strong> RM ${serviceRequest.estimated_cost || 'N/A'}</p>
          <p><strong>Submitted:</strong> ${new Date(serviceRequest.created_at).toLocaleString()}</p>
        </div>
        
        ${type === 'manual_review_required' ? `
        <div class="details">
          <h3>Action Required</h3>
          <p>This service request requires manual review. Please log in to the admin panel to review and approve or reject this request.</p>
        </div>
        ` : `
        <div class="details">
          <h3>Automatic Approval</h3>
          <p>This service request was automatically approved based on the resident's credit limit. It has been forwarded to the appropriate department.</p>
        </div>
        `}
      </div>
      <div class="footer">
        <p>Eden Living Management System</p>
      </div>
    </body>
    </html>
    `
  }

  /**
   * Generate text template for admin notification
   */
  private generateAdminTextTemplate(
    serviceRequest: ServiceRequest,
    type: 'auto_approved' | 'manual_review_required'
  ): string {
    const statusText = type === 'auto_approved' ? 'Auto-Approved' : 'Requires Review'
    
    return `
Eden Living Service Request - ${statusText}

Request Details:
- Title: ${serviceRequest.title}
- Type: ${serviceRequest.type}
- Description: ${serviceRequest.description}
- Priority: ${serviceRequest.priority}
- Department: ${serviceRequest.department_assigned || 'Not assigned'}
- Estimated Cost: RM ${serviceRequest.estimated_cost || 'N/A'}
- Submitted: ${new Date(serviceRequest.created_at).toLocaleString()}

${type === 'manual_review_required' 
  ? 'Action Required: This service request requires manual review. Please log in to the admin panel to review and approve or reject this request.'
  : 'Automatic Approval: This service request was automatically approved based on the resident\'s credit limit. It has been forwarded to the appropriate department.'
}

Eden Living Management System
    `
  }

  /**
   * Generate HTML template for department notification
   */
  private generateDepartmentEmailTemplate(
    serviceRequest: ServiceRequest,
    department: Department,
    resident: Profile
  ): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background-color: #1f2937; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9fafb; }
        .status-badge { 
          display: inline-block; 
          padding: 8px 16px; 
          border-radius: 20px; 
          color: white; 
          font-weight: bold;
          background-color: #3b82f6;
        }
        .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .footer { padding: 20px; text-align: center; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Eden Living - New Service Request</h1>
      </div>
      <div class="content">
        <h2>New Service Request Assigned</h2>
        <span class="status-badge">Assigned to ${department.name}</span>
        
        <div class="details">
          <h3>Request Details</h3>
          <p><strong>Title:</strong> ${serviceRequest.title}</p>
          <p><strong>Type:</strong> ${serviceRequest.type}</p>
          <p><strong>Description:</strong> ${serviceRequest.description}</p>
          <p><strong>Priority:</strong> ${serviceRequest.priority}</p>
          <p><strong>Estimated Cost:</strong> RM ${serviceRequest.estimated_cost || 'N/A'}</p>
          <p><strong>Scheduled:</strong> ${serviceRequest.scheduled_date ? new Date(serviceRequest.scheduled_date).toLocaleString() : 'Not scheduled'}</p>
        </div>
        
        <div class="details">
          <h3>Resident Information</h3>
          <p><strong>Name:</strong> ${resident.first_name} ${resident.last_name}</p>
          <p><strong>Unit:</strong> ${resident.unit_number || 'N/A'}</p>
          <p><strong>Phone:</strong> ${resident.phone_number || 'N/A'}</p>
        </div>
        
        <div class="details">
          <h3>Next Steps</h3>
          <p>Please log in to the department dashboard to acknowledge this request and begin processing.</p>
        </div>
      </div>
      <div class="footer">
        <p>Eden Living Management System</p>
      </div>
    </body>
    </html>
    `
  }

  /**
   * Generate text template for department notification
   */
  private generateDepartmentTextTemplate(
    serviceRequest: ServiceRequest,
    department: Department,
    resident: Profile
  ): string {
    return `
Eden Living - New Service Request Assigned

Assigned to: ${department.name}

Request Details:
- Title: ${serviceRequest.title}
- Type: ${serviceRequest.type}
- Description: ${serviceRequest.description}
- Priority: ${serviceRequest.priority}
- Estimated Cost: RM ${serviceRequest.estimated_cost || 'N/A'}
- Scheduled: ${serviceRequest.scheduled_date ? new Date(serviceRequest.scheduled_date).toLocaleString() : 'Not scheduled'}

Resident Information:
- Name: ${resident.first_name} ${resident.last_name}
- Unit: ${resident.unit_number || 'N/A'}
- Phone: ${resident.phone_number || 'N/A'}

Next Steps: Please log in to the department dashboard to acknowledge this request and begin processing.

Eden Living Management System
    `
  }

  /**
   * Generate HTML template for invoice notification
   */
  private generateInvoiceEmailTemplate(
    serviceRequest: ServiceRequest,
    invoiceId: string
  ): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background-color: #1f2937; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9fafb; }
        .status-badge { 
          display: inline-block; 
          padding: 8px 16px; 
          border-radius: 20px; 
          color: white; 
          font-weight: bold;
          background-color: #10b981;
        }
        .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .footer { padding: 20px; text-align: center; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Eden Living - Invoice Generated</h1>
      </div>
      <div class="content">
        <h2>Draft Invoice Generated</h2>
        <span class="status-badge">Ready for Review</span>
        
        <div class="details">
          <h3>Service Details</h3>
          <p><strong>Title:</strong> ${serviceRequest.title}</p>
          <p><strong>Type:</strong> ${serviceRequest.type}</p>
          <p><strong>Description:</strong> ${serviceRequest.description}</p>
          <p><strong>Completed:</strong> ${serviceRequest.completed_date ? new Date(serviceRequest.completed_date).toLocaleString() : 'Recently'}</p>
        </div>
        
        <div class="details">
          <h3>Invoice Information</h3>
          <p><strong>Invoice ID:</strong> ${invoiceId}</p>
          <p><strong>Amount:</strong> RM ${serviceRequest.actual_cost || serviceRequest.estimated_cost || 'TBD'}</p>
          <p><strong>Status:</strong> Draft (Pending Review)</p>
        </div>
        
        <div class="details">
          <h3>Next Steps</h3>
          <p>Please log in to the admin panel to review and approve this invoice before sending it to the resident.</p>
        </div>
      </div>
      <div class="footer">
        <p>Eden Living Management System</p>
      </div>
    </body>
    </html>
    `
  }

  /**
   * Generate text template for invoice notification
   */
  private generateInvoiceTextTemplate(
    serviceRequest: ServiceRequest,
    invoiceId: string
  ): string {
    return `
Eden Living - Draft Invoice Generated

Service Details:
- Title: ${serviceRequest.title}
- Type: ${serviceRequest.type}
- Description: ${serviceRequest.description}
- Completed: ${serviceRequest.completed_date ? new Date(serviceRequest.completed_date).toLocaleString() : 'Recently'}

Invoice Information:
- Invoice ID: ${invoiceId}
- Amount: RM ${serviceRequest.actual_cost || serviceRequest.estimated_cost || 'TBD'}
- Status: Draft (Pending Review)

Next Steps: Please log in to the admin panel to review and approve this invoice before sending it to the resident.

Eden Living Management System
    `
  }

  /**
   * Test email configuration
   */
  async testEmailConnection(): Promise<boolean> {
    try {
      await transporter.verify()
      console.log('Email server connection is ready')
      return true
    } catch (error) {
      console.error('Email server connection failed:', error)
      return false
    }
  }
}
